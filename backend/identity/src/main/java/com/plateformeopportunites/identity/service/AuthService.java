package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.common.enums.NiveauAcces;
import org.springframework.security.access.prepost.PreAuthorize;
import com.plateformeopportunites.common.enums.StatutCompte;
import com.plateformeopportunites.common.event.UtilisateurCreeEvent;
import com.plateformeopportunites.identity.dto.*;
import com.plateformeopportunites.identity.entity.Administrateur;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final AdministrateurRepository administrateurRepository;
    private final OtpService otpService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;

    // ── Étape 1 : envoi OTP (connexion ou inscription selon si le numéro existe) ─

    @Transactional
    public InitierAuthResponse initierAuth(InitierAuthRequest req) {
        String telephone = normaliserTelephone(req.getIndicatif(), req.getTelephone());

        boolean existe = utilisateurRepository.existsByTelephone(telephone);
        String mode = existe ? "CONNEXION" : "INSCRIPTION";

        String code = otpService.generer(telephone);
        return new InitierAuthResponse(mode, "Code OTP envoyé avec succès", code);
    }

    // ── Étape 2 : vérification OTP → connexion ou création de compte ────────────

    @Transactional
    public AuthResponse verifierAuth(VerifierAuthRequest req) {
        String telephone = req.getTelephone().trim();

        if (!otpService.verifier(telephone, req.getCode())) {
            throw new IllegalArgumentException("Code OTP invalide ou expiré");
        }

        Utilisateur utilisateur = utilisateurRepository.findByTelephone(telephone)
                .orElseGet(() -> {
                    Utilisateur nouveau = utilisateurRepository.save(
                            Utilisateur.builder().telephone(telephone).build()
                    );
                    eventPublisher.publishEvent(new UtilisateurCreeEvent(nouveau.getId()));
                    return nouveau;
                });

        if (utilisateur.getStatut() == StatutCompte.SUSPENDU) {
            throw new IllegalStateException("Compte suspendu. Contactez l'administrateur.");
        }

        String token = jwtService.generateParticipantToken(utilisateur.getId(), telephone);
        return buildParticipantResponse(utilisateur, token);
    }

    // ── Compléter le profil : nom (authentifié) ──────────────────────────────────

    @Transactional
    public AuthResponse completerProfil(UUID utilisateurId, CompleterProfilRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        utilisateur.setNom(req.getNom());
        utilisateur.setProfilComplete(true);
        utilisateur.setStatut(StatutCompte.ACTIF);
        utilisateur = utilisateurRepository.save(utilisateur);

        String token = jwtService.generateParticipantToken(utilisateur.getId(), utilisateur.getTelephone());
        return buildParticipantResponse(utilisateur, token);
    }

    // ── Définir / changer son mot de passe (authentifié) ────────────────────────

    @Transactional
    public void definirMotDePasse(UUID utilisateurId, DefinirMotDePasseRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        utilisateur.setMotDePasse(passwordEncoder.encode(req.getMotDePasse()));
        utilisateurRepository.save(utilisateur);
    }

    // ── Connexion admin ──────────────────────────────────────────────────────────

    public AuthResponse connecterAdmin(ConnexionRequest req) {
        Administrateur admin = administrateurRepository
                .findByEmail(req.getIdentifiant().trim())
                .orElseThrow(() -> new IllegalArgumentException("Identifiants incorrects"));

        if (!passwordEncoder.matches(req.getMotDePasse(), admin.getMotDePasse())) {
            throw new IllegalArgumentException("Identifiants incorrects");
        }

        String token = jwtService.generateAdminToken(admin.getId(), admin.getEmail(), admin.getNiveauAcces());
        return AuthResponse.builder()
                .token(token)
                .id(admin.getId())
                .nom(admin.getNom())
                .email(admin.getEmail())
                .role("ADMIN")
                .niveauAcces(admin.getNiveauAcces().name())
                .build();
    }

    // ── Création admin (SUPER_ADMIN uniquement) ──────────────────────────────────

    @PreAuthorize("hasAuthority('SUPER_ADMIN')")
    @Transactional
    public void creerAdmin(UUID demandeurId, CreerAdminRequest req) {
        Administrateur demandeur = administrateurRepository.findById(demandeurId)
                .orElseThrow(() -> new IllegalArgumentException("Admin introuvable"));
        if (demandeur.getNiveauAcces() != NiveauAcces.SUPER_ADMIN) {
            throw new IllegalStateException("Seul un SUPER_ADMIN peut créer des comptes administrateurs");
        }
        if (administrateurRepository.existsByEmail(req.getEmail().trim())) {
            throw new IllegalArgumentException("Un administrateur avec cet email existe déjà");
        }
        Administrateur nouvelAdmin = Administrateur.builder()
                .nom(req.getNom())
                .email(req.getEmail().trim())
                .motDePasse(passwordEncoder.encode(req.getMotDePasse()))
                .niveauAcces(req.getNiveauAcces() != null ? req.getNiveauAcces() : NiveauAcces.MODERATEUR)
                .build();
        administrateurRepository.save(nouvelAdmin);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private AuthResponse buildParticipantResponse(Utilisateur u, String token) {
        return AuthResponse.builder()
                .token(token)
                .id(u.getId())
                .nom(u.getNom())
                .telephone(u.getTelephone())
                .profilComplete(u.getProfilComplete())
                .role("PARTICIPANT")
                .build();
    }

    private String normaliserTelephone(String indicatif, String telephone) {
        return (indicatif.trim() + telephone.trim()).replaceAll("\\s+", "");
    }
}
