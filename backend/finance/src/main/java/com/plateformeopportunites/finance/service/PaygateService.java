package com.plateformeopportunites.finance.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plateformeopportunites.common.enums.StatutTransaction;
import com.plateformeopportunites.common.enums.TypeTransaction;
import com.plateformeopportunites.finance.dto.InitierRechargePaygateRequest;
import com.plateformeopportunites.finance.dto.InitierRechargePaygateResponse;
import com.plateformeopportunites.finance.dto.PaygateWebhookPayload;
import com.plateformeopportunites.finance.entity.PaiementPaygate;
import com.plateformeopportunites.finance.entity.PaiementPaygate.StatutPaiementPaygate;
import com.plateformeopportunites.finance.entity.Portefeuille;
import com.plateformeopportunites.finance.entity.Transaction;
import com.plateformeopportunites.common.service.PusherNotificationService;
import com.plateformeopportunites.finance.repository.PaiementPaygateRepository;
import com.plateformeopportunites.finance.repository.PortefeuilleRepository;
import com.plateformeopportunites.finance.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaygateService {

    private final PaiementPaygateRepository paiementPaygateRepository;
    private final PortefeuilleRepository portefeuilleRepository;
    private final TransactionRepository transactionRepository;
    private final ObjectMapper objectMapper;
    private final PusherNotificationService pusherNotificationService;

    @Value("${paygate.auth-token}")
    private String authToken;

    @Value("${paygate.api-url}")
    private String apiUrl;

    @Value("${paygate.dev-mode:false}")
    private boolean devMode;

    public boolean isDevMode() { return devMode; }

    @Transactional
    public InitierRechargePaygateResponse initierRecharge(UUID utilisateurId,
                                                           InitierRechargePaygateRequest req) {
        String identifier = UUID.randomUUID().toString();
        String telephone = normaliserTelephone(req.getTelephone());

        PaiementPaygate paiement = PaiementPaygate.builder()
                .utilisateurId(utilisateurId)
                .identifier(identifier)
                .montant(req.getMontant())
                .telephone(telephone)
                .network(req.getNetwork())
                .statut(StatutPaiementPaygate.EN_ATTENTE)
                .build();

        // ── MODE DEV : on simule un paiement immédiat sans appel réseau ──
        if (devMode) {
            log.warn("[DEV-MODE] Paiement simulé — aucun argent réel débité");
            String fakeRef = "DEV-" + identifier.substring(0, 8).toUpperCase();
            paiement.setTxReference(fakeRef);
            paiementPaygateRepository.save(paiement);
            crediterPortefeuille(paiement, "DEV-PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            return new InitierRechargePaygateResponse(identifier, fakeRef, 0,
                    "[MODE TEST] Paiement simulé — solde crédité immédiatement");
        }

        // ── MODE PRODUCTION : appel réel à l'API PayGate ──
        Map<String, Object> body = Map.of(
                "auth_token", authToken,
                "phone_number", telephone,
                "amount", req.getMontant().intValue(),
                "description", "Recharge portefeuille Miitcha Deal",
                "identifier", identifier,
                "network", req.getNetwork()
        );

        try {
            String jsonBody = objectMapper.writeValueAsString(body);
            HttpResponse<String> response = envoyerPaygate(apiUrl, body);
            JsonNode json = lireReponsePaygate(response);

            int status = json.path("status").asInt(-1);
            String txReference = json.path("tx_reference").asText(null);

            paiement.setTxReference(txReference);

            if (status != 0 || txReference == null || txReference.isBlank()) {
                paiement.setStatut(StatutPaiementPaygate.ECHOUE);
                paiementPaygateRepository.save(paiement);
                return new InitierRechargePaygateResponse(identifier, txReference, status,
                        resolveInitiationError(status));
            }

            paiementPaygateRepository.save(paiement);
            return new InitierRechargePaygateResponse(identifier, txReference, 2,
                    "Demande envoyée. Confirmez le paiement TMoney sur votre téléphone.");

        } catch (IOException e) {
            log.error("Erreur appel PayGate : {}", e.getMessage());
            paiement.setStatut(StatutPaiementPaygate.ECHOUE);
            paiementPaygateRepository.save(paiement);
            throw new IllegalStateException("PayGate est momentanément indisponible. Réessayez dans quelques instants.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            paiement.setStatut(StatutPaiementPaygate.ECHOUE);
            paiementPaygateRepository.save(paiement);
            throw new IllegalStateException("La demande de paiement a été interrompue. Réessayez.");
        }
    }

    @Transactional
    public InitierRechargePaygateResponse verifierStatut(UUID utilisateurId, String identifier) {
        PaiementPaygate paiement = paiementPaygateRepository
                .findByIdentifierAndUtilisateurId(identifier, utilisateurId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction de recharge introuvable."));

        if (paiement.getStatut() == StatutPaiementPaygate.CONFIRME) {
            return statutResponse(paiement, 0, "Recharge confirmée. Votre portefeuille a été crédité.");
        }
        if (paiement.getStatut() == StatutPaiementPaygate.ECHOUE) {
            return statutResponse(paiement, 6, "Cette recharge a échoué ou a été annulée.");
        }
        if (devMode) {
            return statutResponse(paiement, 2, "Confirmation du paiement en cours.");
        }

        Map<String, Object> body = Map.of(
                "auth_token", authToken,
                "tx_reference", paiement.getTxReference()
        );

        try {
            String statusUrl = apiUrl.replaceFirst("/pay/?$", "/status");
            HttpResponse<String> response = envoyerPaygate(statusUrl, body);
            JsonNode json = lireReponsePaygate(response);
            int status = json.path("status").asInt(-1);

            if (status == 0) {
                String paymentReference = json.path("payment_reference").asText(paiement.getTxReference());
                crediterPortefeuille(paiement, paymentReference);
                return statutResponse(paiement, 0, "Paiement confirmé. Votre portefeuille a été crédité.");
            }
            if (status == 4 || status == 6) {
                paiement.setStatut(StatutPaiementPaygate.ECHOUE);
                paiementPaygateRepository.save(paiement);
                String message = status == 4 ? "La demande TMoney a expiré." : "Le paiement TMoney a été annulé.";
                return statutResponse(paiement, status, message);
            }
            return statutResponse(paiement, 2, "En attente de votre confirmation TMoney.");
        } catch (IOException e) {
            log.warn("Vérification PayGate indisponible pour {} : {}", identifier, e.getMessage());
            return statutResponse(paiement, 2, "Paiement en cours de vérification.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return statutResponse(paiement, 2, "Paiement en cours de vérification.");
        }
    }

    private HttpResponse<String> envoyerPaygate(String url, Map<String, Object> body)
            throws IOException, InterruptedException {
        String jsonBody = objectMapper.writeValueAsString(body);
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();
        return client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode lireReponsePaygate(HttpResponse<String> response) throws IOException {
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Réponse HTTP " + response.statusCode());
        }
        JsonNode json = objectMapper.readTree(response.body());
        if (!json.isObject() || !json.has("status")) {
            throw new IOException("Réponse PayGate invalide");
        }
        return json;
    }

    @Transactional
    public void traiterWebhook(PaygateWebhookPayload payload) {
        paiementPaygateRepository.findByIdentifier(payload.getIdentifier()).ifPresent(paiement -> {
            if (paiement.getStatut() == StatutPaiementPaygate.CONFIRME) {
                return; // idempotent — déjà traité
            }
            crediterPortefeuille(paiement, payload.getPaymentReference());
        });
    }

    private void crediterPortefeuille(PaiementPaygate paiement, String paymentReference) {
        paiement.setStatut(StatutPaiementPaygate.CONFIRME);
        paiement.setPaymentReference(paymentReference);
        paiement.setConfirmedAt(LocalDateTime.now());
        paiementPaygateRepository.save(paiement);

        Portefeuille portefeuille = portefeuilleRepository
                .findByUtilisateurId(paiement.getUtilisateurId())
                .orElseThrow(() -> new IllegalStateException("Portefeuille introuvable"));

        portefeuille.setSoldeDisponible(
                portefeuille.getSoldeDisponible().add(paiement.getMontant()));
        portefeuilleRepository.save(portefeuille);

        Transaction tx = Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(paiement.getUtilisateurId())
                .type(TypeTransaction.DEPOT)
                .montant(paiement.getMontant())
                .statut(StatutTransaction.SUCCESS)
                .moyenPaiement(devMode ? "DEV_MODE" : paiement.getNetwork())
                .reference(paymentReference)
                .build();
        transactionRepository.save(tx);

        log.info("Recharge confirmée : {} FCFA pour utilisateur {} (dev={})",
                paiement.getMontant(), paiement.getUtilisateurId(), devMode);

        pusherNotificationService.notifierUtilisateur(
                paiement.getUtilisateurId(),
                "wallet.credited",
                Map.of(
                        "montant", paiement.getMontant(),
                        "nouveauSolde", portefeuille.getSoldeDisponible(),
                        "reference", paymentReference,
                        "mode", devMode ? "TEST" : paiement.getNetwork(),
                        "raison", "RECHARGE"
                )
        );
    }

    private InitierRechargePaygateResponse statutResponse(PaiementPaygate paiement, int status, String message) {
        return new InitierRechargePaygateResponse(
                paiement.getIdentifier(), paiement.getTxReference(), status, message);
    }

    private String normaliserTelephone(String valeur) {
        String telephone = valeur == null ? "" : valeur.replaceAll("\\D", "");
        if (telephone.startsWith("228") && telephone.length() == 11) {
            telephone = telephone.substring(3);
        }
        if (!telephone.matches("\\d{8}")) {
            throw new IllegalArgumentException("Le numéro doit contenir exactement 8 chiffres togolais.");
        }
        return telephone;
    }

    private String resolveInitiationError(int status) {
        return switch (status) {
            case 2 -> "Le service de paiement est mal configuré. Contactez le support.";
            case 4 -> "Numéro ou montant refusé par PayGate. Vérifiez le réseau choisi et le numéro.";
            case 6 -> "Cette demande existe déjà. Relancez une nouvelle recharge.";
            default -> "PayGate a renvoyé une réponse invalide. Réessayez dans quelques instants.";
        };
    }
}
