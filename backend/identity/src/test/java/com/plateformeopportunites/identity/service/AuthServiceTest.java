package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.common.enums.StatutCompte;
import com.plateformeopportunites.common.event.UtilisateurCreeEvent;
import com.plateformeopportunites.identity.dto.*;
import com.plateformeopportunites.identity.entity.Administrateur;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UtilisateurRepository utilisateurRepository;
    @Mock private AdministrateurRepository administrateurRepository;
    @Mock private FirebaseAuthVerifier firebaseAuthVerifier;
    @Mock private JwtService jwtService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private AuthService authService;

    // ── verifierFirebaseToken ────────────────────────────────────────────────────

    @Test
    void verifierFirebaseToken_tokenValide_compteInexistant_creeCompteEtPublieEvenement() {
        when(firebaseAuthVerifier.verifierEtExtraireTelephone("valid-id-token")).thenReturn("+22890123456");
        when(utilisateurRepository.findByTelephone("+22890123456")).thenReturn(Optional.empty());

        Utilisateur nouveau = Utilisateur.builder()
                .id(UUID.randomUUID())
                .telephone("+22890123456")
                .profilComplete(false)
                .build();
        when(utilisateurRepository.save(any())).thenReturn(nouveau);
        when(jwtService.generateParticipantToken(any(), anyString())).thenReturn("jwt-token");

        VerifierFirebaseTokenRequest req = new VerifierFirebaseTokenRequest();
        req.setIdToken("valid-id-token");

        AuthResponse resp = authService.verifierFirebaseToken(req);

        assertEquals("jwt-token", resp.getToken());
        assertEquals("PARTICIPANT", resp.getRole());
        verify(eventPublisher).publishEvent(any(UtilisateurCreeEvent.class));
    }

    @Test
    void verifierFirebaseToken_tokenValide_compteExistant_connecteSansCreation() {
        Utilisateur existant = Utilisateur.builder()
                .id(UUID.randomUUID())
                .telephone("+22890123456")
                .profilComplete(true)
                .build();
        when(firebaseAuthVerifier.verifierEtExtraireTelephone("valid-id-token")).thenReturn("+22890123456");
        when(utilisateurRepository.findByTelephone("+22890123456")).thenReturn(Optional.of(existant));
        when(jwtService.generateParticipantToken(any(), anyString())).thenReturn("jwt-existing");

        VerifierFirebaseTokenRequest req = new VerifierFirebaseTokenRequest();
        req.setIdToken("valid-id-token");

        AuthResponse resp = authService.verifierFirebaseToken(req);

        assertEquals("jwt-existing", resp.getToken());
        verify(utilisateurRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void verifierFirebaseToken_tokenInvalide_leveException() {
        when(firebaseAuthVerifier.verifierEtExtraireTelephone("bad-id-token"))
                .thenThrow(new IllegalArgumentException("Token Firebase invalide ou expiré"));

        VerifierFirebaseTokenRequest req = new VerifierFirebaseTokenRequest();
        req.setIdToken("bad-id-token");

        assertThrows(IllegalArgumentException.class, () -> authService.verifierFirebaseToken(req));
        verify(utilisateurRepository, never()).findByTelephone(anyString());
    }

    // ── completerProfil ──────────────────────────────────────────────────────────

    @Test
    void completerProfil_setNomEtProfilComplete() {
        Utilisateur u = Utilisateur.builder()
                .id(UUID.randomUUID())
                .telephone("+22890123456")
                .profilComplete(false)
                .build();
        when(utilisateurRepository.findById(u.getId())).thenReturn(Optional.of(u));
        when(utilisateurRepository.save(any())).thenReturn(u);
        when(jwtService.generateParticipantToken(any(), anyString())).thenReturn("jwt-token");

        CompleterProfilRequest req = new CompleterProfilRequest();
        req.setNom("Jean Dupont");

        authService.completerProfil(u.getId(), req);

        assertEquals("Jean Dupont", u.getNom());
        assertTrue(u.getProfilComplete());
        assertEquals(StatutCompte.ACTIF, u.getStatut());
    }

    // ── connecterAdmin ───────────────────────────────────────────────────────────

    @Test
    void connecterAdmin_credentialsCorrects_retourneTokenAdmin() {
        Administrateur admin = Administrateur.builder()
                .id(UUID.randomUUID()).nom("Super Admin")
                .email("admin@plateforme.tg").motDePasse("encoded_admin")
                .niveauAcces(com.plateformeopportunites.common.enums.NiveauAcces.SUPER_ADMIN).build();
        when(administrateurRepository.findByEmail("admin@plateforme.tg")).thenReturn(Optional.of(admin));
        when(passwordEncoder.matches("Admin@1234", "encoded_admin")).thenReturn(true);
        when(jwtService.generateAdminToken(any(), anyString(), any())).thenReturn("admin-token");

        ConnexionRequest req = new ConnexionRequest();
        req.setIdentifiant("admin@plateforme.tg");
        req.setMotDePasse("Admin@1234");

        AuthResponse resp = authService.connecterAdmin(req);

        assertEquals("admin-token", resp.getToken());
        assertEquals("ADMIN", resp.getRole());
    }
}
