package com.plateformeopportunites.finance.service;

import com.plateformeopportunites.common.enums.ModeDistribution;
import org.springframework.security.access.prepost.PreAuthorize;
import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.StatutTransaction;
import com.plateformeopportunites.common.enums.TypeTransaction;
import com.plateformeopportunites.common.enums.TypeTransactionPlateforme;
import com.plateformeopportunites.common.enums.TypeRecompense;
import com.plateformeopportunites.common.event.RetraitDemandeEvent;
import com.plateformeopportunites.common.event.SseNotificationEvent;
import com.plateformeopportunites.common.service.PusherNotificationService;
import com.plateformeopportunites.finance.dto.AlimenterWalletRequest;
import com.plateformeopportunites.finance.dto.PortefeuilleResponse;
import com.plateformeopportunites.finance.dto.RechargeRequest;
import com.plateformeopportunites.finance.dto.RetraitRequest;
import com.plateformeopportunites.finance.dto.TransactionResponse;
import com.plateformeopportunites.finance.dto.WalletPlateformeResponse;
import com.plateformeopportunites.finance.entity.Portefeuille;
import com.plateformeopportunites.finance.entity.Transaction;
import com.plateformeopportunites.finance.entity.TransactionPlateforme;
import com.plateformeopportunites.finance.entity.WalletPlateforme;
import com.plateformeopportunites.finance.repository.PortefeuilleRepository;
import com.plateformeopportunites.finance.repository.TransactionPlateformeRepository;
import com.plateformeopportunites.finance.repository.TransactionRepository;
import com.plateformeopportunites.finance.repository.WalletPlateformeRepository;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    public record GelPointsResult(BigDecimal pointsUtilises, BigDecimal valeurPointsUtilises) {}

    private final PortefeuilleRepository portefeuilleRepository;
    private final TransactionRepository transactionRepository;
    private final WalletPlateformeRepository walletPlateformeRepository;
    private final TransactionPlateformeRepository transactionPlateformeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UtilisateurRepository utilisateurRepository;
    private final PusherNotificationService pusherNotificationService;

    /**
     * Notifie en temps réel (header, page portefeuille...) que le solde disponible d'un
     * utilisateur vient de changer, avec le même contrat d'événement que PaygateService.
     */
    private void notifierSoldeDisponible(UUID participantId, String event, BigDecimal montant, Portefeuille portefeuille, String raison) {
        pusherNotificationService.notifierUtilisateur(participantId, event, Map.of(
                "montant", montant,
                "nouveauSolde", portefeuille.getSoldeDisponible(),
                "raison", raison
        ));
    }

    private void notifierCredit(UUID participantId, BigDecimal montant, Portefeuille portefeuille, String raison) {
        notifierSoldeDisponible(participantId, "wallet.credited", montant, portefeuille, raison);
    }

    private void notifierDebit(UUID participantId, BigDecimal montant, Portefeuille portefeuille, String raison) {
        notifierSoldeDisponible(participantId, "wallet.debited", montant, portefeuille, raison);
    }

    public PortefeuilleResponse getSolde(UUID participantId) {
        Portefeuille p = getPortefeuille(participantId);
        return toResponse(p);
    }

    public List<TransactionResponse> getTransactions(UUID participantId) {
        return transactionRepository.findByUtilisateurIdOrderByCreatedAtDesc(participantId)
                .stream().map(this::toTransactionResponse).toList();
    }

    @Transactional
    public PortefeuilleResponse recharger(UUID participantId, RechargeRequest req) {
        Portefeuille portefeuille = getPortefeuille(participantId);
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().add(req.getMontant()));
        portefeuilleRepository.save(portefeuille);

        Transaction tx = Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(participantId)
                .type(TypeTransaction.DEPOT)
                .montant(req.getMontant())
                .statut(StatutTransaction.SUCCESS)
                .moyenPaiement(req.getMoyenPaiement())
                .reference(req.getReference())
                .build();
        transactionRepository.save(tx);
        notifierCredit(participantId, req.getMontant(), portefeuille, "RECHARGE");

        return toResponse(portefeuille);
    }

    @Transactional
    public void demanderRetrait(UUID participantId, RetraitRequest req) {
        if (req.getMontant() == null || req.getMontant().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant à retirer doit être strictement positif");
        }

        Utilisateur utilisateur = utilisateurRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        if (utilisateur.getNiveauVerification() != NiveauVerification.VERIFIE) {
            throw new IllegalStateException(
                "Vérification d'identité requise. Complétez votre profil dans la section Vérification pour débloquer les retraits.");
        }

        Portefeuille portefeuille = getPortefeuilleForUpdate(participantId);

        if (portefeuille.getSoldeDisponible().compareTo(req.getMontant()) < 0) {
            throw new IllegalArgumentException("Solde insuffisant");
        }

        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().subtract(req.getMontant()));
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().add(req.getMontant()));
        portefeuilleRepository.save(portefeuille);

        Transaction tx = Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(participantId)
                .type(TypeTransaction.RETRAIT)
                .montant(req.getMontant())
                .statut(StatutTransaction.EN_COURS)
                .coordonnees(req.getCoordonnees())
                .build();
        transactionRepository.save(tx);
        notifierDebit(participantId, req.getMontant(), portefeuille, "RETRAIT_DEMANDE");

        eventPublisher.publishEvent(new RetraitDemandeEvent(this, participantId, req.getMontant()));
        pusherNotificationService.notifierAdmins("RETRAIT_DEMANDE", Map.of(
                "utilisateurId", participantId,
                "montant", req.getMontant()
        ));
    }

    public List<TransactionResponse> listerToutesTransactions() {
        return transactionRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toTransactionResponse).toList();
    }

    public List<TransactionResponse> listerRetraitsEnAttente() {
        return transactionRepository
                .findByTypeAndStatutOrderByCreatedAtDesc(TypeTransaction.RETRAIT, StatutTransaction.EN_COURS)
                .stream().map(this::toTransactionResponse).toList();
    }

    @Transactional
    public void approuverRetrait(UUID transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction introuvable"));
        if (tx.getType() != TypeTransaction.RETRAIT || tx.getStatut() != StatutTransaction.EN_COURS) {
            throw new IllegalArgumentException("Ce retrait ne peut pas être approuvé");
        }
        Portefeuille portefeuille = getPortefeuilleForUpdate(tx.getUtilisateurId());
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().subtract(tx.getMontant()));
        portefeuilleRepository.save(portefeuille);
        tx.setStatut(StatutTransaction.SUCCESS);
        transactionRepository.save(tx);

        pusherNotificationService.notifierUtilisateur(tx.getUtilisateurId(), "RETRAIT", Map.of(
                "statut", "APPROUVE",
                "montant", tx.getMontant()
        ));
    }

    @Transactional
    public void rejeterRetrait(UUID transactionId) {
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction introuvable"));
        if (tx.getType() != TypeTransaction.RETRAIT || tx.getStatut() != StatutTransaction.EN_COURS) {
            throw new IllegalArgumentException("Ce retrait ne peut pas être rejeté");
        }
        Portefeuille portefeuille = getPortefeuilleForUpdate(tx.getUtilisateurId());
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().subtract(tx.getMontant()));
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().add(tx.getMontant()));
        portefeuilleRepository.save(portefeuille);
        tx.setStatut(StatutTransaction.ECHEC);
        transactionRepository.save(tx);

        // Un seul événement "RETRAIT" (statut REJETE) : il contient déjà le montant remboursé,
        // pas besoin d'un "wallet.credited" séparé pour la même action.
        pusherNotificationService.notifierUtilisateur(tx.getUtilisateurId(), "RETRAIT", Map.of(
                "statut", "REJETE",
                "montant", tx.getMontant()
        ));
    }

    @Transactional
    public void gelerFonds(UUID participantId, BigDecimal montant, UUID walletId) {
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant à geler doit être strictement positif");
        }
        Portefeuille portefeuille = getPortefeuille(participantId);
        if (portefeuille.getSoldeDisponible().compareTo(montant) < 0) {
            throw new IllegalArgumentException("Solde insuffisant pour participer");
        }
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().subtract(montant));
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().add(montant));
        portefeuilleRepository.save(portefeuille);
        notifierDebit(participantId, montant, portefeuille, "SOUSCRIPTION");
    }

    /**
     * Gèle le prix d'un achat en utilisant d'abord les points, puis le solde disponible.
     * Les points restent un avoir d'achat interne et ne créditent jamais le solde retirable.
     */
    @Transactional
    public GelPointsResult gelerFondsAvecPoints(UUID participantId, BigDecimal montant, boolean utiliserPoints) {
        if (!utiliserPoints) {
            gelerFonds(participantId, montant, null);
            return new GelPointsResult(BigDecimal.ZERO, BigDecimal.ZERO);
        }
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant à geler doit être strictement positif");
        }

        Portefeuille portefeuille = getPortefeuille(participantId);
        BigDecimal valeurPoint = getWalletPlateforme().getTauxConversionPoints();
        if (valeurPoint == null || valeurPoint.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("La valeur d'achat des points n'est pas configurée");
        }

        BigDecimal pointsNecessaires = montant.divide(valeurPoint, 2, RoundingMode.UP);
        BigDecimal pointsUtilises = portefeuille.getSoldePoints().min(pointsNecessaires);
        BigDecimal valeurPoints = pointsUtilises.multiply(valeurPoint).min(montant);
        BigDecimal montantCash = montant.subtract(valeurPoints);
        if (portefeuille.getSoldeDisponible().compareTo(montantCash) < 0) {
            throw new IllegalArgumentException("Solde insuffisant, même après utilisation de vos points");
        }

        portefeuille.setSoldePoints(portefeuille.getSoldePoints().subtract(pointsUtilises));
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().subtract(montantCash));
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().add(montant));
        portefeuilleRepository.save(portefeuille);
        if (montantCash.compareTo(BigDecimal.ZERO) > 0) {
            notifierDebit(participantId, montantCash, portefeuille, "SOUSCRIPTION");
        }
        return new GelPointsResult(pointsUtilises, valeurPoints);
    }

    @Transactional
    public void debiterFinal(UUID participantId, BigDecimal montant) {
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant à débiter doit être strictement positif");
        }
        Portefeuille portefeuille = getPortefeuille(participantId);
        if (portefeuille.getSoldeGele().compareTo(montant) < 0) {
            throw new IllegalStateException("Solde gelé insuffisant pour finaliser le débit");
        }
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().subtract(montant));
        portefeuilleRepository.save(portefeuille);
    }

    @Transactional
    public void rembourser(UUID participantId, BigDecimal montant) {
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le montant à rembourser doit être strictement positif");
        }
        Portefeuille portefeuille = getPortefeuille(participantId);
        if (portefeuille.getSoldeGele().compareTo(montant) < 0) {
            throw new IllegalStateException("Solde gelé insuffisant pour rembourser");
        }
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().subtract(montant));
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().add(montant));
        portefeuilleRepository.save(portefeuille);
        notifierCredit(participantId, montant, portefeuille, "REMBOURSEMENT");
    }

    /** Restaure séparément la part monétaire et la part points d'un achat annulé. */
    @Transactional
    public void rembourserAvecPoints(UUID participantId, BigDecimal montantTotal,
                                     BigDecimal pointsARestaurer, BigDecimal valeurPointsARestaurer) {
        BigDecimal points = pointsARestaurer == null ? BigDecimal.ZERO : pointsARestaurer.max(BigDecimal.ZERO);
        BigDecimal valeurPoints = valeurPointsARestaurer == null ? BigDecimal.ZERO : valeurPointsARestaurer.max(BigDecimal.ZERO);
        if (valeurPoints.compareTo(montantTotal) > 0) valeurPoints = montantTotal;
        BigDecimal montantCash = montantTotal.subtract(valeurPoints);

        Portefeuille portefeuille = getPortefeuille(participantId);
        if (portefeuille.getSoldeGele().compareTo(montantTotal) < 0) {
            throw new IllegalStateException("Solde gelé insuffisant pour rembourser");
        }
        portefeuille.setSoldeGele(portefeuille.getSoldeGele().subtract(montantTotal));
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().add(montantCash));
        portefeuille.setSoldePoints(portefeuille.getSoldePoints().add(points));
        portefeuilleRepository.save(portefeuille);
        if (montantCash.compareTo(BigDecimal.ZERO) > 0) {
            notifierCredit(participantId, montantCash, portefeuille, "REMBOURSEMENT");
        }
    }

    /**
     * Crédite le solde disponible du participant + crée une Transaction RECOMPENSE.
     */
    @Transactional
    public void crediterRecompense(UUID participantId, BigDecimal montant) {
        Portefeuille portefeuille = getPortefeuille(participantId);
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().add(montant));
        portefeuilleRepository.save(portefeuille);

        Transaction tx = Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(participantId)
                .type(TypeTransaction.RECOMPENSE)
                .montant(montant)
                .statut(StatutTransaction.SUCCESS)
                .build();
        transactionRepository.save(tx);
        notifierCredit(participantId, montant, portefeuille, "RECOMPENSE");

        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "user:" + participantId, "RECOMPENSE",
                "{\"montant\":" + montant.toPlainString() + ",\"type\":\"ARGENT\"}"));
    }

    /**
     * Crédite le solde points du participant + crée une Transaction RECOMPENSE.
     */
    @Transactional
    public void crediterPoints(UUID participantId, BigDecimal points) {
        crediterPoints(participantId, points, "RECOMPENSE_POINTS");
    }

    @Transactional
    public void crediterPoints(UUID participantId, BigDecimal points, String reference) {
        Portefeuille portefeuille = getPortefeuille(participantId);
        portefeuille.setSoldePoints(portefeuille.getSoldePoints().add(points));
        portefeuilleRepository.save(portefeuille);

        Transaction tx = Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(participantId)
                .type(TypeTransaction.RECOMPENSE)
                .montant(points)
                .reference(reference)
                .statut(StatutTransaction.SUCCESS)
                .build();
        transactionRepository.save(tx);

        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "user:" + participantId, "RECOMPENSE",
                "{\"montant\":" + points.toPlainString() + ",\"type\":\"POINTS\"}"));
    }

    /**
     * Réserve le budget d'un sondage : transfère de soldePlateforme → soldeReserve.
     */
    @Transactional
    public void reserverBudgetSondage(UUID sondageId, UUID adminId, BigDecimal montant) {
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) return;
        WalletPlateforme wp = getWalletPlateforme();
        if (wp.getSoldePlateforme().compareTo(montant) < 0) {
            throw new IllegalStateException(
                "Fonds insuffisants pour activer ce sondage (disponible : "
                + wp.getSoldePlateforme() + " XOF, requis : " + montant + " XOF)");
        }
        wp.setSoldePlateforme(wp.getSoldePlateforme().subtract(montant));
        wp.setSoldeReserve(wp.getSoldeReserve().add(montant));
        walletPlateformeRepository.save(wp);

        transactionPlateformeRepository.save(TransactionPlateforme.builder()
                .sondageId(sondageId)
                .adminId(adminId)
                .type(TypeTransactionPlateforme.RESERVATION_BUDGET)
                .montant(montant)
                .statut(StatutTransaction.SUCCESS)
                .build());
    }

    /**
     * Libère le reliquat non distribué d'un sondage : soldeReserve → soldePlateforme.
     */
    @Transactional
    public void libererBudgetSondage(UUID sondageId, UUID adminId, BigDecimal montant) {
        if (montant.compareTo(BigDecimal.ZERO) <= 0) return;
        WalletPlateforme wp = getWalletPlateforme();
        if (wp.getSoldeReserve().compareTo(montant) < 0) {
            throw new IllegalStateException("Solde réservé insuffisant pour libérer le reliquat du sondage");
        }
        wp.setSoldeReserve(wp.getSoldeReserve().subtract(montant));
        wp.setSoldePlateforme(wp.getSoldePlateforme().add(montant));
        walletPlateformeRepository.save(wp);

        transactionPlateformeRepository.save(TransactionPlateforme.builder()
                .sondageId(sondageId)
                .adminId(adminId)
                .type(TypeTransactionPlateforme.LIBERATION_BUDGET)
                .montant(montant)
                .statut(StatutTransaction.SUCCESS)
                .build());
    }

    /**
     * Débite le soldeReserve (budget pré-réservé) pour une distribution de récompense sondage.
     */
    @Transactional
    public void debiterPourDistribution(UUID sondageId, UUID adminId, BigDecimal montant,
                                        TypeRecompense typeRecompense,
                                        ModeDistribution modeDistribution) {
        if (montant == null || montant.compareTo(BigDecimal.ZERO) <= 0) return;
        WalletPlateforme wp = getWalletPlateforme();
        if (wp.getSoldeReserve().compareTo(montant) < 0) {
            throw new IllegalStateException("Solde réservé insuffisant pour distribuer la récompense");
        }
        wp.setSoldeReserve(wp.getSoldeReserve().subtract(montant));
        walletPlateformeRepository.save(wp);

        TypeTransactionPlateforme type = modeDistribution == ModeDistribution.AUTO
                ? TypeTransactionPlateforme.DISTRIBUTION_AUTO
                : TypeTransactionPlateforme.DISTRIBUTION_MANUELLE;

        transactionPlateformeRepository.save(TransactionPlateforme.builder()
                .sondageId(sondageId)
                .adminId(adminId)
                .type(type)
                .montant(montant)
                .modeDistribution(modeDistribution)
                .statut(StatutTransaction.SUCCESS)
                .build());
    }

    /** Les points sont des avoirs d'achat et ne peuvent pas être transformés en argent retirable. */
    @Transactional
    public PortefeuilleResponse convertirPoints(UUID participantId, BigDecimal montantPoints) {
        throw new IllegalStateException("Les points servent uniquement à payer des achats sur OpportuniHub et ne sont pas convertibles en argent");
    }

    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    @Transactional
    public PortefeuilleResponse ajusterSolde(UUID utilisateurId, BigDecimal montant, String description) {
        Portefeuille portefeuille = getPortefeuille(utilisateurId);
        if (montant.compareTo(BigDecimal.ZERO) < 0
                && portefeuille.getSoldeDisponible().compareTo(montant.abs()) < 0) {
            throw new IllegalArgumentException("Débit impossible : solde disponible insuffisant");
        }
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().add(montant));
        portefeuilleRepository.save(portefeuille);

        TypeTransaction type = montant.compareTo(BigDecimal.ZERO) >= 0 ? TypeTransaction.DEPOT : TypeTransaction.DEBIT;
        String ref = "AJUSTEMENT_ADMIN" + (description != null && !description.isBlank() ? ": " + description : "");
        transactionRepository.save(Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(utilisateurId)
                .type(type)
                .montant(montant.abs())
                .statut(StatutTransaction.SUCCESS)
                .reference(ref)
                .build());

        if (montant.compareTo(BigDecimal.ZERO) >= 0) {
            notifierCredit(utilisateurId, montant, portefeuille, "AJUSTEMENT_ADMIN");
        } else {
            notifierDebit(utilisateurId, montant.abs(), portefeuille, "AJUSTEMENT_ADMIN");
        }

        return toResponse(portefeuille);
    }

    public WalletPlateformeResponse getWalletPlateformeDetails() {
        return toWalletPlateformeResponse(getWalletPlateforme());
    }

    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    @Transactional
    public WalletPlateformeResponse alimenter(AlimenterWalletRequest req) {
        WalletPlateforme wp = getWalletPlateforme();
        wp.setSoldePlateforme(wp.getSoldePlateforme().add(req.getMontant()));
        walletPlateformeRepository.save(wp);

        TransactionPlateforme txp = TransactionPlateforme.builder()
                .type(TypeTransactionPlateforme.ALIMENTATION)
                .montant(req.getMontant())
                .statut(StatutTransaction.SUCCESS)
                .build();
        transactionPlateformeRepository.save(txp);

        return toWalletPlateformeResponse(wp);
    }

    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    @Transactional
    public WalletPlateformeResponse modifierTauxConversion(BigDecimal taux) {
        WalletPlateforme wp = getWalletPlateforme();
        wp.setTauxConversionPoints(taux);
        walletPlateformeRepository.save(wp);
        return toWalletPlateformeResponse(wp);
    }

    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    @Transactional
    public WalletPlateformeResponse modifierRecompenseParrainage(BigDecimal points) {
        if (points == null || points.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("La récompense de parrainage doit être supérieure à zéro");
        }
        WalletPlateforme wp = getWalletPlateforme();
        wp.setRecompenseParrainagePoints(points);
        walletPlateformeRepository.save(wp);
        return toWalletPlateformeResponse(wp);
    }

    public BigDecimal getRecompenseParrainagePoints() {
        BigDecimal points = getWalletPlateforme().getRecompenseParrainagePoints();
        return points == null || points.compareTo(BigDecimal.ZERO) <= 0 ? BigDecimal.valueOf(100) : points;
    }

    public WalletPlateforme getWalletPlateforme() {
        return walletPlateformeRepository.findAll()
                .stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("WalletPlateforme introuvable — alimentez la plateforme d'abord"));
    }

    private WalletPlateformeResponse toWalletPlateformeResponse(WalletPlateforme wp) {
        return WalletPlateformeResponse.builder()
                .id(wp.getId())
                .soldePlateforme(wp.getSoldePlateforme())
                .soldeReserve(wp.getSoldeReserve())
                .soldePoints(wp.getSoldePoints())
                .tauxConversionPoints(wp.getTauxConversionPoints())
                .recompenseParrainagePoints(wp.getRecompenseParrainagePoints())
                .devise(wp.getDevise())
                .updatedAt(wp.getUpdatedAt())
                .build();
    }

    private Portefeuille getPortefeuille(UUID participantId) {
        return portefeuilleRepository.findByUtilisateurId(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Portefeuille introuvable"));
    }

    /**
     * Verrou pessimiste sur le portefeuille : evite qu'une lecture-puis-ecriture concurrente
     * (double-clic, deux requetes simultanees) ne double-valide un solde deja insuffisant.
     */
    private Portefeuille getPortefeuilleForUpdate(UUID participantId) {
        return portefeuilleRepository.findByUtilisateurIdForUpdate(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Portefeuille introuvable"));
    }

    private PortefeuilleResponse toResponse(Portefeuille p) {
        WalletPlateforme configuration = walletPlateformeRepository.findAll().stream().findFirst().orElse(null);
        BigDecimal valeurPoint = configuration != null && configuration.getTauxConversionPoints() != null
                ? configuration.getTauxConversionPoints() : BigDecimal.ONE;
        BigDecimal recompenseParrainage = configuration != null && configuration.getRecompenseParrainagePoints() != null
                ? configuration.getRecompenseParrainagePoints() : BigDecimal.valueOf(100);
        return PortefeuilleResponse.builder()
                .id(p.getId())
                .soldeDisponible(p.getSoldeDisponible())
                .soldeGele(p.getSoldeGele())
                .soldePoints(p.getSoldePoints())
                .valeurPointFcfa(valeurPoint)
                .recompenseParrainagePoints(recompenseParrainage)
                .devise(p.getDevise())
                .build();
    }

    private TransactionResponse toTransactionResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .utilisateurId(t.getUtilisateurId())
                .type(t.getType())
                .montant(t.getMontant())
                .statut(t.getStatut())
                .reference(t.getReference())
                .moyenPaiement(t.getMoyenPaiement())
                .coordonnees(t.getCoordonnees())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
