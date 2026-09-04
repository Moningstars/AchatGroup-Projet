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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

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
        Portefeuille portefeuille = getPortefeuille(participantId);
        portefeuille.setSoldePoints(portefeuille.getSoldePoints().add(points));
        portefeuilleRepository.save(portefeuille);

        Transaction tx = Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(participantId)
                .type(TypeTransaction.RECOMPENSE)
                .montant(points)
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

    /**
     * Convertit des points en FCFA pour un participant.
     * Le taux de conversion est défini au niveau du wallet plateforme.
     */
    @Transactional
    public PortefeuilleResponse convertirPoints(UUID participantId, BigDecimal montantPoints) {
        WalletPlateforme wp = getWalletPlateforme();

        BigDecimal taux = wp.getTauxConversionPoints();
        if (taux == null || taux.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Taux de conversion points non configuré");
        }

        // taux = FCFA par point (ex: 10 → 1 pt = 10 FCFA)
        BigDecimal montantFCFA = montantPoints.multiply(taux).setScale(0, java.math.RoundingMode.DOWN);

        if (wp.getSoldePlateforme().compareTo(montantFCFA) < 0) {
            throw new IllegalStateException("Fonds insuffisants dans la plateforme pour cette conversion");
        }

        Portefeuille portefeuille = getPortefeuille(participantId);
        if (portefeuille.getSoldePoints().compareTo(montantPoints) < 0) {
            throw new IllegalArgumentException("Solde points insuffisant");
        }

        portefeuille.setSoldePoints(portefeuille.getSoldePoints().subtract(montantPoints));
        portefeuille.setSoldeDisponible(portefeuille.getSoldeDisponible().add(montantFCFA));
        portefeuilleRepository.save(portefeuille);
        notifierCredit(participantId, montantFCFA, portefeuille, "CONVERSION_POINTS");

        wp.setSoldePlateforme(wp.getSoldePlateforme().subtract(montantFCFA));
        walletPlateformeRepository.save(wp);

        transactionRepository.save(Transaction.builder()
                .walletId(portefeuille.getId())
                .utilisateurId(participantId)
                .type(TypeTransaction.CONVERSION_POINTS)
                .montant(montantFCFA)
                .statut(StatutTransaction.SUCCESS)
                .build());

        return toResponse(portefeuille);
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
        return PortefeuilleResponse.builder()
                .id(p.getId())
                .soldeDisponible(p.getSoldeDisponible())
                .soldeGele(p.getSoldeGele())
                .soldePoints(p.getSoldePoints())
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
