package com.plateformeopportunites.opportunite.service;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import org.springframework.security.access.prepost.PreAuthorize;
import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.common.event.QuotaAtteintEvent;
import com.plateformeopportunites.common.event.RemboursementEvent;
import com.plateformeopportunites.common.event.SseNotificationEvent;
import com.plateformeopportunites.common.redis.RedisService;
import com.plateformeopportunites.finance.service.WalletService;
import com.plateformeopportunites.identity.entity.Administrateur;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.opportunite.dto.CreerOpportuniteRequest;
import com.plateformeopportunites.opportunite.dto.MaParticipationOpportuniteResponse;
import com.plateformeopportunites.opportunite.dto.OpportuniteResponse;
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
                .prixNormal(req.getPrixNormal())
                .seuilMinimum(req.getSeuilMinimum())
                .dateExpiration(req.getDateExpiration())
                .statut(statut)
                .participantsActuels(0)
                .build();
        opportunite = opportuniteRepository.save(opportunite);

        validerPaliers(req.getPaliers());

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
                            .createdAt(p.getCreatedAt())
                            .dateExpiration(op.getDateExpiration())
                            .statutOpportunite(op.getStatut())
                            .build();
                })
                .toList();
    }

    @Transactional
    public void activer(UUID adminId, UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        opp.setStatut(StatutOpportunite.ACTIVE);
        opportuniteRepository.save(opp);
    }

    @Transactional
    public void souscrire(UUID participantId, UUID opportuniteId, Integer quantite) {
        if (participationRepository.existsByUtilisateurIdAndOpportuniteId(participantId, opportuniteId)) {
            throw new IllegalArgumentException("Déjà souscrit à cette opportunité");
        }

        Opportunite opp = getOpportunite(opportuniteId);
        if (opp.getStatut() != StatutOpportunite.ACTIVE) {
            throw new IllegalArgumentException("Cette opportunité n'est pas active");
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
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunite:" + opportuniteId,
                "COMPTEUR",
                "{\"participantsActuels\":" + opp.getParticipantsActuels()
                        + ",\"prixActuel\":" + prixApres.toPlainString() + "}"));
    }

    @Transactional
    public void cloturerAvecSucces(UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        opp.setStatut(StatutOpportunite.CLOTUREE);
        opportuniteRepository.save(opp);
        redisService.supprimerCompteur(opportuniteId);
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunite:" + opportuniteId, "STATUT", "{\"statut\":\"CLOTUREE\"}"));

        List<Participation> participations = participationRepository
                .findByOpportuniteIdAndStatut(opportuniteId, StatutParticipation.EN_ATTENTE);
        for (Participation p : participations) {
            walletService.debiterFinal(p.getUtilisateur().getId(), p.getMontantGele());
            p.setStatut(StatutParticipation.CONFIRMEE);
            participationRepository.save(p);
        }
    }

    @Transactional
    public void cloturerAvecEchec(UUID opportuniteId) {
        Opportunite opp = getOpportunite(opportuniteId);
        opp.setStatut(StatutOpportunite.ANNULEE);
        opportuniteRepository.save(opp);
        redisService.supprimerCompteur(opportuniteId);

        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "opportunite:" + opportuniteId, "STATUT", "{\"statut\":\"ANNULEE\"}"));
        eventPublisher.publishEvent(new RemboursementEvent(this, opportuniteId));
    }

    @Transactional
    public void rembourserTous(UUID opportuniteId) {
        List<Participation> participations = participationRepository
                .findByOpportuniteIdAndStatut(opportuniteId, StatutParticipation.EN_ATTENTE);
        for (Participation p : participations) {
            walletService.rembourser(p.getUtilisateur().getId(), p.getMontantGele());
            p.setStatut(StatutParticipation.REMBOURSEE);
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
            if (courant.getSeuilMax() >= suivant.getSeuilMin()) {
                throw new IllegalArgumentException(
                    "Les paliers de prix se chevauchent : ["
                    + courant.getSeuilMin() + "–" + courant.getSeuilMax()
                    + "] et [" + suivant.getSeuilMin() + "–" + suivant.getSeuilMax() + "]");
            }
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
                .prixNormal(opp.getPrixNormal())
                .prixActuel(calculerPrixActuel(opp))
                .seuilMinimum(opp.getSeuilMinimum())
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
