package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.event.SseNotificationEvent;
import com.plateformeopportunites.identity.dto.KycDemandeResponse;
import com.plateformeopportunites.identity.dto.KycRequest;
import com.plateformeopportunites.identity.dto.KycStatusResponse;
import com.plateformeopportunites.identity.entity.InfoPersonnelle;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.InfoPersonnelleRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KycService {

    private final UtilisateurRepository utilisateurRepository;
    private final InfoPersonnelleRepository infoPersonnelleRepository;
    private final ApplicationEventPublisher eventPublisher;

    public KycStatusResponse getStatut(UUID utilisateurId) {
        Utilisateur u = getUtilisateur(utilisateurId);
        InfoPersonnelle info = infoPersonnelleRepository.findByUtilisateurId(utilisateurId).orElse(null);

        KycStatusResponse.KycStatusResponseBuilder builder = KycStatusResponse.builder()
                .niveauVerification(u.getNiveauVerification())
                .dejaSoumis(info != null);

        if (info != null) {
            builder.nom(info.getNom())
                   .prenom(info.getPrenom())
                   .dateNaissance(info.getDateNaissance())
                   .lieuNaissance(info.getLieuNaissance())
                   .nationalite(info.getNationalite())
                   .typePiece(info.getTypePiece())
                   .numeroPiece(info.getNumeroPiece())
                   .dateExpirationPiece(info.getDateExpirationPiece())
                   .email(info.getEmail())
                   .adresse(info.getAdresse())
                   .ville(info.getVille())
                   .pays(info.getPays())
                   .profession(info.getProfession())
                   .sourceRevenus(info.getSourceRevenus());
        }
        return builder.build();
    }

    @Transactional
    public KycStatusResponse soumettre(UUID utilisateurId, KycRequest req) {
        Utilisateur u = getUtilisateur(utilisateurId);

        if (u.getNiveauVerification() == NiveauVerification.VERIFIE) {
            throw new IllegalStateException("Votre compte est déjà vérifié");
        }
        if (u.getNiveauVerification() == NiveauVerification.EN_ATTENTE) {
            throw new IllegalStateException("Votre demande est déjà en cours d'examen");
        }

        // Validation des champs obligatoires — identité
        if (isBlank(req.getNom()) || isBlank(req.getPrenom())
                || isBlank(req.getLieuNaissance()) || isBlank(req.getNationalite())) {
            throw new IllegalArgumentException("Tous les champs d'identité sont obligatoires");
        }

        // Validation de l'âge (18 ans minimum)
        if (req.getDateNaissance() == null) {
            throw new IllegalArgumentException("La date de naissance est obligatoire");
        }
        if (req.getDateNaissance().plusYears(18).isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Vous devez avoir au moins 18 ans pour vérifier votre compte");
        }

        // Validation de la pièce d'identité
        if (req.getTypePiece() == null || isBlank(req.getNumeroPiece())) {
            throw new IllegalArgumentException("Le type et le numéro de pièce d'identité sont obligatoires");
        }
        if (req.getDateExpirationPiece() == null) {
            throw new IllegalArgumentException("La date d'expiration de la pièce est obligatoire");
        }
        if (req.getDateExpirationPiece().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Votre pièce d'identité est expirée. Veuillez utiliser un document valide");
        }

        // Validation des coordonnées
        if (isBlank(req.getEmail()) || isBlank(req.getAdresse())
                || isBlank(req.getVille()) || isBlank(req.getPays())) {
            throw new IllegalArgumentException("Les coordonnées (email, adresse, ville, pays) sont obligatoires");
        }

        InfoPersonnelle info = infoPersonnelleRepository.findByUtilisateurId(utilisateurId)
                .orElseGet(() -> InfoPersonnelle.builder().utilisateur(u).build());

        info.setNom(req.getNom());
        info.setPrenom(req.getPrenom());
        info.setDateNaissance(req.getDateNaissance());
        info.setLieuNaissance(req.getLieuNaissance());
        info.setNationalite(req.getNationalite());
        info.setTypePiece(req.getTypePiece());
        info.setNumeroPiece(req.getNumeroPiece());
        info.setDateExpirationPiece(req.getDateExpirationPiece());
        info.setEmail(req.getEmail());
        info.setAdresse(req.getAdresse());
        info.setVille(req.getVille());
        info.setPays(req.getPays());
        info.setProfession(req.getProfession());
        info.setSourceRevenus(req.getSourceRevenus());
        infoPersonnelleRepository.save(info);

        u.setNiveauVerification(NiveauVerification.EN_ATTENTE);
        utilisateurRepository.save(u);

        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "admin:global", "KYC_SOUMIS", "{\"utilisateurId\":\"" + utilisateurId + "\"}"));

        return getStatut(utilisateurId);
    }

    public KycDemandeResponse getDemandeDetail(UUID utilisateurId) {
        Utilisateur u = getUtilisateur(utilisateurId);
        return toDemande(u);
    }

    public List<KycDemandeResponse> listerEnAttente() {
        return utilisateurRepository.findByNiveauVerification(NiveauVerification.EN_ATTENTE)
                .stream().map(this::toDemande).toList();
    }

    @Transactional
    public void approuver(UUID utilisateurId) {
        Utilisateur u = getUtilisateur(utilisateurId);
        if (u.getNiveauVerification() != NiveauVerification.EN_ATTENTE) {
            throw new IllegalStateException("Ce compte n'est pas en attente de vérification");
        }
        u.setNiveauVerification(NiveauVerification.VERIFIE);
        utilisateurRepository.save(u);
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "user:" + utilisateurId, "KYC", "{\"statut\":\"VERIFIE\"}"));
    }

    @Transactional
    public void rejeter(UUID utilisateurId) {
        Utilisateur u = getUtilisateur(utilisateurId);
        if (u.getNiveauVerification() != NiveauVerification.EN_ATTENTE) {
            throw new IllegalStateException("Ce compte n'est pas en attente de vérification");
        }
        u.setNiveauVerification(NiveauVerification.REJETE);
        utilisateurRepository.save(u);
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "user:" + utilisateurId, "KYC", "{\"statut\":\"REJETE\"}"));
    }

    private Utilisateur getUtilisateur(UUID id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private KycDemandeResponse toDemande(Utilisateur u) {
        InfoPersonnelle info = infoPersonnelleRepository.findByUtilisateurId(u.getId()).orElse(null);
        return KycDemandeResponse.builder()
                .utilisateurId(u.getId())
                .telephone(u.getTelephone())
                .inscritLe(u.getCreatedAt())
                .niveauVerification(u.getNiveauVerification())
                // Identité
                .nom(info != null ? info.getNom() : null)
                .prenom(info != null ? info.getPrenom() : null)
                .dateNaissance(info != null ? info.getDateNaissance() : null)
                .lieuNaissance(info != null ? info.getLieuNaissance() : null)
                .nationalite(info != null ? info.getNationalite() : null)
                // Pièce d'identité
                .typePiece(info != null ? info.getTypePiece() : null)
                .numeroPiece(info != null ? info.getNumeroPiece() : null)
                .dateExpirationPiece(info != null ? info.getDateExpirationPiece() : null)
                // Coordonnées
                .email(info != null ? info.getEmail() : null)
                .adresse(info != null ? info.getAdresse() : null)
                .ville(info != null ? info.getVille() : null)
                .pays(info != null ? info.getPays() : null)
                // Situation professionnelle
                .profession(info != null ? info.getProfession() : null)
                .sourceRevenus(info != null ? info.getSourceRevenus() : null)
                .build();
    }
}
