package com.plateformeopportunites.opportunite.service;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import org.springframework.security.access.prepost.PreAuthorize;
import com.plateformeopportunites.common.enums.StatutLivraison;
import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.common.event.QuotaAtteintEvent;
import com.plateformeopportunites.common.event.RemboursementEvent;
import com.plateformeopportunites.common.event.SseNotificationEvent;
import com.plateformeopportunites.common.redis.RedisService;
import com.plateformeopportunites.common.service.PusherNotificationService;
import com.plateformeopportunites.finance.service.WalletService;
import com.plateformeopportunites.identity.entity.Administrateur;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.opportunite.dto.CreerOpportuniteRequest;
import com.plateformeopportunites.opportunite.dto.ConfirmerReceptionRequest;
import com.plateformeopportunites.opportunite.dto.MaParticipationOpportuniteResponse;
import com.plateformeopportunites.opportunite.dto.MettreAJourLivraisonRequest;
import com.plateformeopportunites.opportunite.dto.ModifierOpportuniteRequest;
import com.plateformeopportunites.opportunite.dto.OpportuniteResponse;
import com.plateformeopportunites.opportunite.dto.ParticipantOpportuniteResponse;
import com.plateformeopportunites.opportunite.dto.PlanifierParticipantsRequest;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import com.plateformeopportunites.opportunite.entity.OpportuniteImage;
import com.plateformeopportunites.opportunite.entity.PalierPrix;
import com.plateformeopportunites.opportunite.entity.Participation;
import com.plateformeopportunites.opportunite.entity.Categorie;
import com.plateformeopportunites.opportunite.repository.CategorieRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteImageRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.opportunite.repository.PalierPrixRepository;
import com.plateformeopportunites.opportunite.repository.ParticipationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OpportuniteService {

    private final OpportuniteRepository opportuniteRepository;
    private final PalierPrixRepository palierPrixRepository;
    private final ParticipationRepository participationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final AdministrateurRepository administrateurRepository;
    private final OpportuniteImageRepository imageRepository;
    private final CategorieRepository categorieRepository;
    private final WalletService walletService;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisService redisService;
    private final PusherNotificationService pusherNotificationService;

    @Transactional
    public OpportuniteResponse creer(UUID adminId, CreerOpportuniteRequest req) {
        Administrateur admin = administrateurRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin introuvable"));

        Categorie categorie = null;
        if (req.getCategorie() != null && !req.getCategorie().isBlank()) {
            categorie = categorieRepository.findByNom(req.getCategorie())
                    .orElseGet(() -> categorieRepository.save(
                            Categorie.builder().nom(req.getCategorie()).build()));
        }

        StatutOpportunite statut = req.isActif() ? StatutOpportunite.ACTIVE : StatutOpportunite.BROUILLON;

        Opportunite opportunite = Opportunite.builder()
                .admin(admin)
                .categorie(categorie)
                .titre(req.getTitre())
                .description(req.getDescription())
                .specsPointsForts(req.getSpecsPointsForts())
                .specsCasUsage(req.getSpecsCasUsage())
                .specsFinePrint(req.getSpecsFinePrint())
                .prixNormal(req.getPrixNormal())
                .seuilMinimum(req.getSeuilMinimum())
                .seuilMaximal(req.getSeuilMaximal())
                .dateExpiration(req.getDateExpiration())
                .statut(statut)
                .participantsActuels(0)
                .build();
        opportunite = opportuniteRepository.save(opportunite);

        validerPaliers(req.getPaliers());
        int maxPalier = req.getPaliers().stream()
                .mapToInt(CreerOpportuniteRequest.PalierPrixRequest::getSeuilMax).max().orElse(0);
        validerSeuilMaximal(req.getSeuilMaximal(), req.getSeuilMinimum(), maxPalier);

        for (CreerOpportuniteRequest.PalierPrixRequest p : req.getPaliers()) {
            palierPrixRepository.save(PalierPrix.builder()
                    .opportunite(opportunite)
                    .seuilMin(p.getSeuilMin())
                    .seuilMax(p.getSeuilMax())
                    .prix(p.getPrix())
                    .build());
        }

        return toResponse(opportunite);
    }

    @Transactional(readOnly = true)
    public List<OpportuniteResponse> listerActives() {
        return opportuniteRepository.findByStatut(StatutOpportunite.ACTIVE)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OpportuniteResponse> listerToutes() {
        return opportuniteRepository.findAll()
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OpportuniteResponse getById(UUID id) {
        return toResponse(getOpportunite(id));
    }

    @Transactional(readOnly = true)
    public List<MaParticipationOpportuniteResponse> listerMesParticipations(UUID utilisateurId) {
        return participationRepository.findByUtilisateurIdFetch(utilisateurId)
                .stream()
                .map(p -> {
                    Opportunite op = p.getOpportunite();
                    String imageUrl = imageRepository.findByOpportuniteIdOrderByOrdre(op.getId())
                            .stream().findFirst().map(OpportuniteImage::getUrl).orElse(null);
                    return MaParticipationOpportuniteResponse.builder()
                            .id(p.getId())
                            .opportuniteId(op.getId())
                            .titre(op.getTitre())
                            .categorie(op.getCategorie() != null ? op.getCategorie().getNom() : null)
                            .imageUrl(imageUrl)
                            .montantGele(p.getMontantGele())
                            .quantite(p.getQuantite())
                            .statut(p.getStatut())
                            .statutLivraison(statutLivraisonOuDefaut(p))
                            .progressionLivraison(progressionLivraison(statutLivraisonOuDefaut(p)))
                            .prioriteTraitement(Boolean.TRUE.equals(p.getPrioriteTraitement()))
                            .creneauTraitement(p.getCreneauTraitement())
                            .dateLivraisonPrevue(p.getDateLivraisonPrevue())
                            .dateRemise(p.getDateRemise())
                            .dateConfirmationParticipant(p.getDateConfirmationParticipant())
                            .transporteur(p.getTransporteur())
                            .referenceLivraison(p.getReferenceLivraison())
                            .commentaireParticipantLivraison(p.getCommentaireParticipantLivraison())
                            .createdAt(p.getCreatedAt())
                            .dateExpiration(op.getDateExpiration())
                            .statutOpportunite(op.getStatut())
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ParticipantOpportuniteResponse> listerParticipants(UUID opportuniteId) {
        return participationRepository.findByOpportuniteId(opportuniteId)
                .stream()
                .map(p -> ParticipantOpportuniteResponse.builder()
                        .id(p.getId())
                        .utilisateurId(p.getUtilisateur().getId())
                        .nom(p.getUtilisateur().getNom())
                        .telephone(p.getUtilisateur().getTelephone())
                        .quantite(p.getQuantite())
                        .montantGele(p.getMontantGele())
                        .statut(p.getStatut())
                        .creneauTraitement(p.getCreneauTraitement())
                        .noteTraitement(p.getNoteTraitement())
                        .statutLivraison(statutLivraisonOuDefaut(p))
                        .progressionLivraison(progressionLivraison(statutLivraisonOuDefaut(p)))
                        .prioriteTraitement(Boolean.TRUE.equals(p.getPrioriteTraitement()))
                        .datePreparation(p.getDatePreparation())
                        .dateExpedition(p.getDateExpedition())
                        .dateLivraisonPrevue(p.getDateLivraisonPrevue())
                        .dateRemise(p.getDateRemise())
                        .dateConfirmationParticipant(p.getDateConfirmationParticipant())
                        .transporteur(p.getTransporteur())
                        .referenceLivraison(p.getReferenceLivraison())
                        .adresseLivraison(p.getAdresseLivraison())
                        .noteLivraison(p.getNoteLivraison())
                        .commentaireParticipantLivraison(p.getCommentaireParticipantLivraison())
                        .createdAt(p.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public List<ParticipantOpportuniteResponse> planifierParticipants(UUID opportuniteId, PlanifierParticipantsRequest req) {
        List<Participation> participations = participationRepository.findAllById(req.getParticipationIds());
        if (participations.size() != req.getParticipationIds().size()) {
            throw new IllegalArgumentException("Une ou plusieurs participations sont introuvables");
        }
        for (Participation p : participations) {
            if (!p.getOpportunite().getId().equals(opportuniteId)) {
                throw new IllegalArgumentException("Une participation ne correspond pas à cette opportunité");
            }
            p.setCreneauTraitement(req.getCreneauTraitement());
            p.setNoteTraitement(req.getNoteTraitement());
            participationRepository.save(p);
        }
        return listerParticipants(opportuniteId);
    }

    @Transactional
    public List<ParticipantOpportuniteResponse> mettreAJourLivraison(UUID opportuniteId, MettreAJourLivraisonRequest req) {
        List<Participation> participations = participationRepository.findAllById(req.getParticipationIds());
        if (participations.size() != req.getParticipationIds().size()) {
            throw new IllegalArgumentException("Une ou plusieurs participations sont introuvables");
        }

        LocalDateTime now = LocalDateTime.now();
        for (Participation p : participations) {
            if (!p.getOpportunite().getId().equals(opportuniteId)) {
                throw new IllegalArgumentException("Une participation ne correspond pas à cette opportunité");
            }

            if (req.getStatutLivraison() != null) {
                validerTransitionLivraisonAdmin(p, req.getStatutLivraison());
                appliquerStatutLivraison(p, req.getStatutLivraison(), now);
            }
            if (req.getPrioriteTraitement() != null) {
                p.setPrioriteTraitement(req.getPrioriteTraitement());
            }
            if (req.getCreneauTraitement() != null) {
                p.setCreneauTraitement(req.getCreneauTraitement());
            }
            if (req.getDateLivraisonPrevue() != null) {
                p.setDateLivraisonPrevue(req.getDateLivraisonPrevue());
            }
            if (req.getTransporteur() != null) {
                p.setTransporteur(req.getTransporteur().isBlank() ? null : req.getTransporteur().trim());
            }
            if (req.getReferenceLivraison() != null) {
                p.setReferenceLivraison(req.getReferenceLivraison().isBlank() ? null : req.getReferenceLivraison().trim());
            }
            if (req.getAdresseLivraison() != null) {
                p.setAdresseLivraison(req.getAdresseLivraison().isBlank() ? null : req.getAdresseLivraison().trim());
            }
            if (req.getNoteTraitement() != null) {
                p.setNoteTraitement(req.getNoteTraitement().isBlank() ? null : req.getNoteTraitement().trim());
            }
            if (req.getNoteLivraison() != null) {
                p.setNoteLivraison(req.getNoteLivraison().isBlank() ? null : req.getNoteLivraison().trim());
            }
            participationRepository.save(p);
        }
        return listerParticipants(opportuniteId);
    }

    @Transactional
    public MaParticipationOpportuniteResponse confirmerReception(UUID utilisateurId, UUID participationId, ConfirmerReceptionRequest req) {
        Participation participation = participationRepository.findById(participationId)
                .orElseThrow(() -> new IllegalArgumentException("Participation introuvable"));
        if (!participation.getUtilisateur().getId().equals(utilisateurId)) {
            throw new IllegalArgumentException("Cette participation n'appartient pas à l'utilisateur connecté");
        }
        StatutLivraison actuel = statutLivraisonOuDefaut(participation);
        if (actuel != StatutLivraison.EN_LIVRAISON && actuel != StatutLivraison.LIVRE_A_CONFIRMER) {
            throw new IllegalStateException("La réception ne peut être confirmée que lorsque la livraison est en cours ou en attente de confirmation");
        }

        boolean recu = req.getRecu() == null || req.getRecu();
        LocalDateTime now = LocalDateTime.now();
        participation.setCommentaireParticipantLivraison(req.getCommentaire() == null || req.getCommentaire().isBlank()
                ? null
                : req.getCommentaire().trim());
        if (recu) {
            participation.setStatutLivraison(StatutLivraison.LIVRE_CONFIRME);
            participation.setDateRemise(participation.getDateRemise() == null ? now : participation.getDateRemise());
            participation.setDateConfirmationParticipant(now);
        } else {
            participation.setStatutLivraison(StatutLivraison.LITIGE);
        }
        participationRepository.save(participation);
        return toMaParticipationResponse(participation);
    }

    @Transactional
    public OpportuniteResponse modifier(UUID opportuniteId, ModifierOpportuniteRequest req) {
        Opportunite opp = getOpportunite(opportuniteId);

        if (req.getTitre() != null && !req.getTitre().isBlank()) opp.setTitre(req.getTitre());
        if (req.getDescription() != null) opp.setDescription(req.getDescription());
        if (req.getSpecsPointsForts() != null) opp.setSpecsPointsForts(req.getSpecsPointsForts());
        if (req.getSpecsCasUsage() != null) opp.setSpecsCasUsage(req.getSpecsCasUsage());
        if (req.getSpecsFinePrint() != null) opp.setSpecsFinePrint(req.getSpecsFinePrint());
        if (req.getPrixNormal() != null) opp.setPrixNormal(req.getPrixNormal());
        if (req.getSeuilMinimum() != null) opp.setSeuilMinimum(req.getSeuilMinimum());
        if (req.getSeuilMaximal() != null) opp.setSeuilMaximal(req.getSeuilMaximal());
        if (req.getDateExpiration() != null) opp.setDateExpiration(req.getDateExpiration());
        if (req.getCategorie() != null && !req.getCategorie().isBlank()) {
            Categorie categorie = categorieRepository.findByNom(req.getCategorie())
                    .orElseGet(() -> categorieRepository.save(
                            Categorie.builder().nom(req.getCategorie()).build()));
            opp.setCategorie(categorie);
        }

        boolean paliersFournis = req.getPaliers() != null && !req.getPaliers().isEmpty();
        int maxPalier = paliersFournis
                ? req.getPaliers().stream().mapToInt(CreerOpportuniteRequest.PalierPrixRequest::getSeuilMax).max().orElse(0)
                : palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(opportuniteId)
                        .stream().mapToInt(PalierPrix::getSeuilMax).max().orElse(0);
        validerSeuilMaximal(opp.getSeuilMaximal(), opp.getSeuilMinimum(), maxPalier);

        opportuniteRepository.save(opp);

        if (paliersFournis) {
            validerPaliers(req.getPaliers());
            palierPrixRepository.deleteAll(palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(opportuniteId));
            for (CreerOpportuniteRequest.PalierPrixRequest p : req.getPaliers()) {
                palierPrixRepository.save(PalierPrix.builder()
                        .opportunite(opp)
                        .seuilMin(p.getSeuilMin())
                        .seuilMax(p.getSeuilMax())
                        .prix(p.getPrix())
                        .build());
            }
        }

        return toResponse(opp);
    }

    @Transactional
    public void activer(UUID adminId, UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        if (opp.getStatut() != StatutOpportunite.BROUILLON) {
            throw new IllegalStateException("Seule une opportunité en brouillon peut être activée");
        }
        opp.setStatut(StatutOpportunite.ACTIVE);
        opportuniteRepository.save(opp);
    }

    @Transactional
    public void souscrire(UUID participantId, UUID opportuniteId, Integer quantite) {
        if (quantite == null || quantite <= 0) {
            throw new IllegalArgumentException("La quantité doit être supérieure ou égale à 1");
        }
        if (participationRepository.existsByUtilisateurIdAndOpportuniteId(participantId, opportuniteId)) {
            throw new IllegalArgumentException("Déjà souscrit à cette opportunité");
        }

        Opportunite opp = getOpportunite(opportuniteId);
        if (opp.getStatut() != StatutOpportunite.ACTIVE) {
            throw new IllegalArgumentException("Cette opportunité n'est pas active");
        }
        if (opp.getSeuilMaximal() != null && opp.getParticipantsActuels() + quantite > opp.getSeuilMaximal()) {
            int restantes = opp.getSeuilMaximal() - opp.getParticipantsActuels();
            throw new IllegalArgumentException(restantes <= 0
                ? "Cette opportunité a atteint son plafond de participants."
                : "Il ne reste que " + restantes + " place(s) disponible(s) pour cette opportunité.");
        }

        Utilisateur utilisateur = utilisateurRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        BigDecimal prixActuel = calculerPrixActuel(opp);
        BigDecimal montantTotal = prixActuel.multiply(BigDecimal.valueOf(quantite));

        walletService.gelerFonds(participantId, montantTotal, null);

        Participation participation = Participation.builder()
                .utilisateur(utilisateur)
                .opportunite(opp)
                .quantite(quantite)
                .montantGele(montantTotal)
                .build();
        participationRepository.save(participation);

        opp.setParticipantsActuels(opp.getParticipantsActuels() + quantite);
        opportuniteRepository.save(opp);

        try {
            redisService.initialiserCompteurSiAbsent(opportuniteId, opp.getParticipantsActuels() - quantite);
            long compteurRedis = redisService.incrementerParticipants(opportuniteId, quantite);
            if (compteurRedis >= opp.getSeuilMinimum()) {
                eventPublisher.publishEvent(new QuotaAtteintEvent(this, opportuniteId));
            }
        } catch (Exception e) {
            if (opp.getParticipantsActuels() >= opp.getSeuilMinimum()) {
                eventPublisher.publishEvent(new QuotaAtteintEvent(this, opportuniteId));
            }
        }

        BigDecimal prixApres = calculerPrixActuel(opp);
        String payloadCompteur = "{\"id\":\"" + opportuniteId + "\",\"participantsActuels\":" + opp.getParticipantsActuels()
                + ",\"prixActuel\":" + prixApres.toPlainString() + "}";
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunite:" + opportuniteId, "COMPTEUR", payloadCompteur));
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunites:global", "COMPTEUR", payloadCompteur));

        if (opp.getSeuilMaximal() != null) {
            if (opp.getParticipantsActuels() >= opp.getSeuilMaximal()) {
                cloturerAvecSucces(opportuniteId);
            } else {
                int avant = opp.getParticipantsActuels() - quantite;
                int seuil90 = (int) Math.ceil(opp.getSeuilMaximal() * 0.9);
                if (avant < seuil90 && opp.getParticipantsActuels() >= seuil90) {
                    eventPublisher.publishEvent(new SseNotificationEvent(this, "admin:global", "OPPORTUNITE_PRESQUE_COMPLETE",
                        "{\"id\":\"" + opportuniteId + "\",\"titre\":\"" + opp.getTitre().replace("\"", "\\\"") + "\","
                        + "\"participantsActuels\":" + opp.getParticipantsActuels() + ",\"seuilMaximal\":" + opp.getSeuilMaximal() + "}"));
                    pusherNotificationService.notifierAdmins("OPPORTUNITE_PRESQUE_COMPLETE", Map.of(
                            "id", opportuniteId,
                            "titre", opp.getTitre(),
                            "participantsActuels", opp.getParticipantsActuels(),
                            "seuilMaximal", opp.getSeuilMaximal()
                    ));
                }
            }
        }
    }

    @Transactional
    public void cloturerManuellement(UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        if (opp.getStatut() != StatutOpportunite.ACTIVE) {
            throw new IllegalStateException("Seule une opportunité active peut être clôturée");
        }
        if (opp.getParticipantsActuels() >= opp.getSeuilMinimum()) {
            cloturerAvecSucces(opportuniteId);
        } else {
            cloturerAvecEchec(opportuniteId);
        }
    }

    @Transactional
    public void cloturerAvecSucces(UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        if (opp.getStatut() == StatutOpportunite.CLOTUREE) return;
        if (opp.getParticipantsActuels() < opp.getSeuilMinimum()) {
            throw new IllegalStateException("Impossible de clôturer avec succès : quota minimum non atteint");
        }
        BigDecimal prixFinal = calculerPrixActuel(opp);
        opp.setStatut(StatutOpportunite.CLOTUREE);
        opportuniteRepository.save(opp);
        redisService.supprimerCompteur(opportuniteId);
        String payloadCloture = "{\"id\":\"" + opportuniteId + "\",\"statut\":\"CLOTUREE\"}";
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunite:" + opportuniteId, "STATUT", payloadCloture));
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunites:global", "STATUT", payloadCloture));

        List<Participation> participations = participationRepository
                .findByOpportuniteIdAndStatut(opportuniteId, StatutParticipation.EN_ATTENTE);
        for (Participation p : participations) {
            BigDecimal montantFinal = prixFinal.multiply(BigDecimal.valueOf(p.getQuantite()));
            BigDecimal montantGele = p.getMontantGele();
            if (montantFinal.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalStateException("Prix final invalide pour cette opportunité");
            }
            if (montantFinal.compareTo(montantGele) > 0) {
                throw new IllegalStateException("Le montant gelé est insuffisant pour finaliser cette participation");
            }
            BigDecimal difference = montantGele.subtract(montantFinal);
            if (difference.compareTo(BigDecimal.ZERO) > 0) {
                walletService.rembourser(p.getUtilisateur().getId(), difference);
                p.setMontantGele(montantFinal);
            }
            walletService.debiterFinal(p.getUtilisateur().getId(), montantFinal);
            p.setStatut(StatutParticipation.CONFIRMEE);
            if (statutLivraisonOuDefaut(p) == StatutLivraison.EN_ATTENTE_QUOTA) {
                p.setStatutLivraison(StatutLivraison.A_PREPARER);
            }
            participationRepository.save(p);
        }
    }

    @Transactional
    public void cloturerAvecEchec(UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        if (opp.getStatut() == StatutOpportunite.ANNULEE) return;
        opp.setStatut(StatutOpportunite.ANNULEE);
        opportuniteRepository.save(opp);
        redisService.supprimerCompteur(opportuniteId);

        String payloadAnnulation = "{\"id\":\"" + opportuniteId + "\",\"statut\":\"ANNULEE\"}";
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunite:" + opportuniteId, "STATUT", payloadAnnulation));
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunites:global", "STATUT", payloadAnnulation));
        eventPublisher.publishEvent(new RemboursementEvent(this, opportuniteId));
    }

    @Transactional
    public void rembourserTous(UUID opportuniteId) {
        List<Participation> participations = participationRepository
                .findByOpportuniteIdAndStatut(opportuniteId, StatutParticipation.EN_ATTENTE);
        for (Participation p : participations) {
            walletService.rembourser(p.getUtilisateur().getId(), p.getMontantGele());
            p.setStatut(StatutParticipation.REMBOURSEE);
            p.setStatutLivraison(StatutLivraison.ANNULE);
            participationRepository.save(p);
        }
    }

    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    @Transactional
    public void forcerRemboursement(UUID participationId) {
        Participation participation = participationRepository.findById(participationId)
                .orElseThrow(() -> new IllegalArgumentException("Participation introuvable"));
        if (participation.getStatut() != StatutParticipation.EN_ATTENTE) {
            throw new IllegalStateException("Seules les participations EN_ATTENTE peuvent être remboursées individuellement");
        }
        walletService.rembourser(participation.getUtilisateur().getId(), participation.getMontantGele());
        participation.setStatut(StatutParticipation.REMBOURSEE);
        participation.setStatutLivraison(StatutLivraison.ANNULE);
        participationRepository.save(participation);
    }

    public void cloturerExpirees() {
        List<Opportunite> expirees = opportuniteRepository
                .findByStatutAndDateExpirationBefore(StatutOpportunite.ACTIVE, LocalDateTime.now());
        for (Opportunite opp : expirees) {
            if (opp.getParticipantsActuels() >= opp.getSeuilMinimum()) {
                cloturerAvecSucces(opp.getId());
            } else {
                cloturerAvecEchec(opp.getId());
            }
        }
    }

    public void notifierSeuilAtteint(UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        if (opp.getParticipantsActuels() < opp.getSeuilMinimum()) return;
        if (!redisService.marquerNotificationSiAbsent("opportunite:" + opportuniteId + ":seuil-minimum", 604_800)) return;

        Map<String, Object> payload = Map.of(
                "id", opp.getId(),
                "titre", opp.getTitre(),
                "participantsActuels", opp.getParticipantsActuels(),
                "seuilMinimum", opp.getSeuilMinimum()
        );
        pusherNotificationService.notifierAdmins("OPPORTUNITE_VALIDEE", payload);
        participationRepository.findByOpportuniteId(opportuniteId).forEach(p ->
                pusherNotificationService.notifierUtilisateur(p.getUtilisateur().getId(), "OPPORTUNITE_VALIDEE", payload));
    }

    public void notifierExpirationsProches() {
        LocalDateTime now = LocalDateTime.now();
        List<Opportunite> bientotExpirees = opportuniteRepository.findByStatutAndDateExpirationBetween(
                StatutOpportunite.ACTIVE,
                now,
                now.plusHours(24)
        );
        for (Opportunite opp : bientotExpirees) {
            if (!redisService.marquerNotificationSiAbsent("opportunite:" + opp.getId() + ":expiration-24h", 172_800)) {
                continue;
            }
            Map<String, Object> payload = Map.of(
                    "id", opp.getId(),
                    "titre", opp.getTitre(),
                    "participantsActuels", opp.getParticipantsActuels(),
                    "seuilMinimum", opp.getSeuilMinimum()
            );
            participationRepository.findByOpportuniteId(opp.getId()).forEach(p ->
                    pusherNotificationService.notifierUtilisateur(p.getUtilisateur().getId(), "OPPORTUNITE_EXPIRATION_PROCHE", payload));
            if (opp.getParticipantsActuels() < opp.getSeuilMinimum()) {
                pusherNotificationService.notifierAdmins("OPPORTUNITE_RISQUE_ECHEC", payload);
            }
        }
    }

    // ── Image management ─────────────────────────────────────────────────────

    @Transactional
    public OpportuniteResponse.ImageResponse ajouterImage(UUID opportuniteId, String url, String legende) {
        Opportunite opp = getOpportunite(opportuniteId);
        int ordre = (int) imageRepository.countByOpportuniteId(opportuniteId);
        OpportuniteImage image = OpportuniteImage.builder()
                .opportunite(opp)
                .url(url)
                .legende(legende)
                .ordre(ordre)
                .build();
        image = imageRepository.save(image);
        return toImageResponse(image);
    }

    @Transactional
    public void supprimerImage(UUID opportuniteId, UUID imageId) {
        OpportuniteImage image = imageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("Image introuvable"));
        if (!image.getOpportunite().getId().equals(opportuniteId)) {
            throw new IllegalArgumentException("Image n'appartient pas à cette opportunité");
        }
        imageRepository.delete(image);
    }

    @Transactional(readOnly = true)
    public List<OpportuniteResponse.ImageResponse> listerImages(UUID opportuniteId) {
        return imageRepository.findByOpportuniteIdOrderByOrdre(opportuniteId)
                .stream().map(this::toImageResponse).toList();
    }

    // ── Validation paliers ────────────────────────────────────────────────────

    private void validerPaliers(List<CreerOpportuniteRequest.PalierPrixRequest> paliers) {
        for (var p : paliers) {
            if (p.getSeuilMin() >= p.getSeuilMax()) {
                throw new IllegalArgumentException(
                    "Palier invalide : seuilMin (" + p.getSeuilMin() + ") doit être < seuilMax (" + p.getSeuilMax() + ")");
            }
        }
        List<CreerOpportuniteRequest.PalierPrixRequest> tries = paliers.stream()
                .sorted(Comparator.comparingInt(CreerOpportuniteRequest.PalierPrixRequest::getSeuilMin))
                .toList();
        for (int i = 0; i < tries.size() - 1; i++) {
            var courant = tries.get(i);
            var suivant = tries.get(i + 1);
            int attendu = courant.getSeuilMax() + 1;
            if (suivant.getSeuilMin() != attendu) {
                throw new IllegalArgumentException(
                    "Les paliers doivent être contigus : le seuil min du palier ["
                    + suivant.getSeuilMin() + "–" + suivant.getSeuilMax()
                    + "] doit être " + attendu + " (juste après le seuil max du palier précédent ["
                    + courant.getSeuilMin() + "–" + courant.getSeuilMax() + "])");
            }
        }
    }

    private void validerSeuilMaximal(Integer seuilMaximal, Integer seuilMinimum, int maxPalier) {
        if (seuilMaximal == null) return;
        if (seuilMaximal < maxPalier) {
            throw new IllegalArgumentException(
                "Le seuil maximal (" + seuilMaximal + ") ne peut pas être inférieur au plafond du dernier palier (" + maxPalier + ")");
        }
        if (seuilMinimum != null && seuilMaximal < seuilMinimum) {
            throw new IllegalArgumentException("Le seuil maximal ne peut pas être inférieur au seuil minimum");
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private BigDecimal calculerPrixActuel(Opportunite opp) {
        return palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(opp.getId())
                .stream()
                .filter(p -> opp.getParticipantsActuels() >= p.getSeuilMin()
                        && opp.getParticipantsActuels() <= p.getSeuilMax())
                .map(PalierPrix::getPrix)
                .findFirst()
                .orElse(opp.getPrixNormal());
    }

    private MaParticipationOpportuniteResponse toMaParticipationResponse(Participation p) {
        Opportunite op = p.getOpportunite();
        String imageUrl = imageRepository.findByOpportuniteIdOrderByOrdre(op.getId())
                .stream().findFirst().map(OpportuniteImage::getUrl).orElse(null);
        StatutLivraison statutLivraison = statutLivraisonOuDefaut(p);
        return MaParticipationOpportuniteResponse.builder()
                .id(p.getId())
                .opportuniteId(op.getId())
                .titre(op.getTitre())
                .categorie(op.getCategorie() != null ? op.getCategorie().getNom() : null)
                .imageUrl(imageUrl)
                .montantGele(p.getMontantGele())
                .quantite(p.getQuantite())
                .statut(p.getStatut())
                .statutLivraison(statutLivraison)
                .progressionLivraison(progressionLivraison(statutLivraison))
                .prioriteTraitement(Boolean.TRUE.equals(p.getPrioriteTraitement()))
                .creneauTraitement(p.getCreneauTraitement())
                .dateLivraisonPrevue(p.getDateLivraisonPrevue())
                .dateRemise(p.getDateRemise())
                .dateConfirmationParticipant(p.getDateConfirmationParticipant())
                .transporteur(p.getTransporteur())
                .referenceLivraison(p.getReferenceLivraison())
                .commentaireParticipantLivraison(p.getCommentaireParticipantLivraison())
                .createdAt(p.getCreatedAt())
                .dateExpiration(op.getDateExpiration())
                .statutOpportunite(op.getStatut())
                .build();
    }

    private StatutLivraison statutLivraisonOuDefaut(Participation p) {
        if (p.getStatutLivraison() != null) return p.getStatutLivraison();
        if (p.getStatut() == StatutParticipation.REMBOURSEE) return StatutLivraison.ANNULE;
        if (p.getStatut() == StatutParticipation.CONFIRMEE) return StatutLivraison.A_PREPARER;
        return StatutLivraison.EN_ATTENTE_QUOTA;
    }

    private int progressionLivraison(StatutLivraison statut) {
        return switch (statut) {
            case EN_ATTENTE_QUOTA -> 0;
            case A_PREPARER -> 15;
            case PREPARATION -> 35;
            case PRET_LIVRAISON -> 55;
            case EN_LIVRAISON -> 75;
            case LIVRE_A_CONFIRMER -> 90;
            case LIVRE_CONFIRME -> 100;
            case ECHEC_LIVRAISON, LITIGE -> 70;
            case ANNULE -> 0;
        };
    }

    private void validerTransitionLivraisonAdmin(Participation p, StatutLivraison statutCible) {
        if (statutCible == StatutLivraison.LIVRE_CONFIRME) {
            throw new IllegalStateException("La réception finale doit être confirmée par le participant, pas par l'administration");
        }
        if (p.getStatut() != StatutParticipation.CONFIRMEE
                && statutCible != StatutLivraison.EN_ATTENTE_QUOTA
                && statutCible != StatutLivraison.ANNULE) {
            throw new IllegalStateException("La livraison ne peut démarrer qu'après validation financière de la participation");
        }
        if (p.getStatut() == StatutParticipation.REMBOURSEE && statutCible != StatutLivraison.ANNULE) {
            throw new IllegalStateException("Une participation remboursée ne peut pas être remise en livraison");
        }
    }

    private void appliquerStatutLivraison(Participation p, StatutLivraison statut, LocalDateTime now) {
        p.setStatutLivraison(statut);
        switch (statut) {
            case PREPARATION -> {
                if (p.getDatePreparation() == null) p.setDatePreparation(now);
            }
            case PRET_LIVRAISON, EN_LIVRAISON, LIVRE_A_CONFIRMER -> {
                if (p.getDatePreparation() == null) p.setDatePreparation(now);
                if (p.getDateExpedition() == null && (statut == StatutLivraison.EN_LIVRAISON || statut == StatutLivraison.LIVRE_A_CONFIRMER)) {
                    p.setDateExpedition(now);
                }
                if (statut == StatutLivraison.LIVRE_A_CONFIRMER && p.getDateRemise() == null) {
                    p.setDateRemise(now);
                }
            }
            case LIVRE_CONFIRME -> {
                if (p.getDatePreparation() == null) p.setDatePreparation(now);
                if (p.getDateExpedition() == null) p.setDateExpedition(now);
                if (p.getDateRemise() == null) p.setDateRemise(now);
                if (p.getDateConfirmationParticipant() == null) p.setDateConfirmationParticipant(now);
            }
            case ECHEC_LIVRAISON, LITIGE, ANNULE, EN_ATTENTE_QUOTA, A_PREPARER -> {
                // Pas de date automatique nécessaire pour ces statuts.
            }
        }
    }

    private Opportunite getOpportunite(UUID id) {
        return opportuniteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opportunité introuvable"));
    }

    private OpportuniteResponse.ImageResponse toImageResponse(OpportuniteImage img) {
        return OpportuniteResponse.ImageResponse.builder()
                .id(img.getId())
                .url(img.getUrl())
                .legende(img.getLegende())
                .ordre(img.getOrdre())
                .build();
    }

    private OpportuniteResponse toResponse(Opportunite opp) {
        List<OpportuniteResponse.PalierPrixResponse> paliers = palierPrixRepository
                .findByOpportuniteIdOrderBySeuilMin(opp.getId())
                .stream()
                .map(p -> OpportuniteResponse.PalierPrixResponse.builder()
                        .id(p.getId())
                        .seuilMin(p.getSeuilMin())
                        .seuilMax(p.getSeuilMax())
                        .prix(p.getPrix())
                        .build())
                .toList();

        List<OpportuniteResponse.ImageResponse> images = imageRepository
                .findByOpportuniteIdOrderByOrdre(opp.getId())
                .stream()
                .map(this::toImageResponse)
                .toList();

        Integer compteurRedis;
        try {
            compteurRedis = redisService.getParticipants(opp.getId());
            if (compteurRedis == null) {
                redisService.initialiserCompteurSiAbsent(opp.getId(), opp.getParticipantsActuels());
                compteurRedis = opp.getParticipantsActuels();
            }
        } catch (Exception e) {
            compteurRedis = opp.getParticipantsActuels();
        }

        return OpportuniteResponse.builder()
                .id(opp.getId())
                .titre(opp.getTitre())
                .description(opp.getDescription())
                .specsPointsForts(opp.getSpecsPointsForts())
                .specsCasUsage(opp.getSpecsCasUsage())
                .specsFinePrint(opp.getSpecsFinePrint())
                .prixNormal(opp.getPrixNormal())
                .prixActuel(calculerPrixActuel(opp))
                .seuilMinimum(opp.getSeuilMinimum())
                .seuilMaximal(opp.getSeuilMaximal())
                .participantsActuels(compteurRedis)
                .dateExpiration(opp.getDateExpiration())
                .statut(opp.getStatut())
                .createdAt(opp.getCreatedAt())
                .categorie(opp.getCategorie() != null ? opp.getCategorie().getNom() : null)
                .categorieIcone(opp.getCategorie() != null ? opp.getCategorie().getIcone() : null)
                .paliers(paliers)
                .images(images)
                .build();
    }
}
