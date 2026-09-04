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

        PaiementPaygate paiement = PaiementPaygate.builder()
                .utilisateurId(utilisateurId)
                .identifier(identifier)
                .montant(req.getMontant())
                .telephone(req.getTelephone())
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
                "phone_number", req.getTelephone(),
                "amount", req.getMontant().intValue(),
                "description", "Recharge portefeuille OpportuniHub",
                "identifier", identifier,
                "network", req.getNetwork()
        );

        try {
            String jsonBody = objectMapper.writeValueAsString(body);
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode json = objectMapper.readTree(response.body());

            int status = json.path("status").asInt(-1);
            String txReference = json.path("tx_reference").asText(null);

            paiement.setTxReference(txReference);

            if (status != 0) {
                paiement.setStatut(StatutPaiementPaygate.ECHOUE);
                paiementPaygateRepository.save(paiement);
                return new InitierRechargePaygateResponse(identifier, txReference, status,
                        resolvePaygateError(status));
            }

            paiementPaygateRepository.save(paiement);
            return new InitierRechargePaygateResponse(identifier, txReference, 0,
                    "Paiement initié. Confirmez sur votre téléphone.");

        } catch (IOException | InterruptedException e) {
            log.error("Erreur appel PayGate", e);
            paiement.setStatut(StatutPaiementPaygate.ECHOUE);
            paiementPaygateRepository.save(paiement);
            throw new RuntimeException("Impossible de contacter PayGate. Réessayez.");
        }
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

    private String resolvePaygateError(int status) {
        return switch (status) {
            case 2 -> "Token d'authentification invalide.";
            case 4 -> "Paramètres de paiement invalides.";
            case 6 -> "Paiement en double détecté.";
            default -> "Erreur PayGate (code " + status + ").";
        };
    }
}
