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
    @Mock private OtpService otpService;
    @Mock private JwtService jwtService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private AuthService authService;

    // ── initierAuth ──────────────────────────────────────────────────────────────

    @Test
    void initierAuth_numeroInexistant_retourneInscription() {
        when(utilisateurRepository.existsByTelephone("+22890123456")).thenReturn(false);
        when(otpService.generer("+22890123456")).thenReturn("123456");

        InitierAuthRequest req = new InitierAuthRequest();
        req.setIndicatif("+228");
        req.setTelephone("90123456");

        InitierAuthResponse resp = authService.initierAuth(req);

        assertEquals("INSCRIPTION", resp.getMode());
        assertEquals("123456", resp.getCodeDevMode());
    }

    @Test
    void initierAuth_numeroExistant_retourneConnexion() {
        when(utilisateurRepository.existsByTelephone("+22890123456")).thenReturn(true);
        when(otpService.generer("+22890123456")).thenReturn("654321");

        InitierAuthRequest req = new InitierAuthRequest();
        req.setIndicatif("+228");
        req.setTelephone("90123456");

        InitierAuthResponse resp = authService.initierAuth(req);

        assertEquals("CONNEXION", resp.getMode());
    }

    // ── verifierAuth ─────────────────────────────────────────────────────────────

    @Test
    void verifierAuth_otpCorrect_compteInexistant_crееCompteEtPublieEvenement() {
        when(otpService.verifier("+22890123456", "123456")).thenReturn(true);
        when(utilisateurRepository.findByTelephone("+22890123456")).thenReturn(Optional.empty());

        Utilisateur nouveau = Utilisateur.builder()
                .id(UUID.randomUUID())
                .telephone("+22890123456")
                .profilComplete(false)
                .build();
        when(utilisateurRepository.save(any())).thenReturn(nouveau);
        when(jwtService.generateParticipantToken(any(), anyString())).thenReturn("jwt-token");

        VerifierAuthRequest req = new VerifierAuthRequest();
        req.setTelephone("+22890123456");
        req.setCode("123456");

        AuthResponse resp = authService.verifierAuth(req);

        assertEquals("jwt-token", resp.getToken());
        assertEquals("PARTICIPANT", resp.getRole());
        verify(eventPublisher).publishEvent(any(UtilisateurCreeEvent.class));
    }

    @Test
    void verifierAuth_otpCorrect_compteExistant_connecteSansCreation() {
        Utilisateur existant = Utilisateur.builder()
                .id(UUID.randomUUID())
                .telephone("+22890123456")
                .profilComplete(true)
                .build();
        when(otpService.verifier("+22890123456", "111111")).thenReturn(true);
        when(utilisateurRepository.findByTelephone("+22890123456")).thenReturn(Optional.of(existant));
        when(jwtService.generateParticipantToken(any(), anyString())).thenReturn("jwt-existing");

        VerifierAuthRequest req = new VerifierAuthRequest();
        req.setTelephone("+22890123456");
        req.setCode("111111");

        AuthResponse resp = authService.verifierAuth(req);

        assertEquals("jwt-existing", resp.getToken());
        verify(utilisateurRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void verifierAuth_otpInvalide_leveException() {
        when(otpService.verifier("+22890123456", "000000")).thenReturn(false);

        VerifierAuthRequest req = new VerifierAuthRequest();
        req.setTelephone("+22890123456");
        req.setCode("000000");

        assertThrows(IllegalArgumentException.class, () -> authService.verifierAuth(req));
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
