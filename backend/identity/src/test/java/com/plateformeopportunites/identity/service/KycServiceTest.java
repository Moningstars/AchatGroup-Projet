package com.plateformeopportunites.identity.service;

import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.SourceRevenus;
import com.plateformeopportunites.common.enums.TypePiece;
import com.plateformeopportunites.identity.dto.KycRequest;
import com.plateformeopportunites.identity.dto.KycStatusResponse;
import com.plateformeopportunites.identity.entity.InfoPersonnelle;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.InfoPersonnelleRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.common.service.PusherNotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KycServiceTest {

    @Mock private UtilisateurRepository utilisateurRepository;
    @Mock private InfoPersonnelleRepository infoPersonnelleRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private PusherNotificationService pusherNotificationService;
    @InjectMocks private KycService kycService;

    private static final UUID UID = UUID.randomUUID();

    private Utilisateur utilisateur(NiveauVerification niveau) {
        return Utilisateur.builder()
                .id(UID)
                .telephone("+22890123456")
                .niveauVerification(niveau)
                .build();
    }

    private InfoPersonnelle info(Utilisateur u) {
        return InfoPersonnelle.builder()
                .id(UUID.randomUUID())
                .utilisateur(u)
                .nom("Kokou")
                .prenom("Afi")
                .dateNaissance(LocalDate.of(1995, 5, 15))
                .email("afi.kokou@mail.tg")
                .adresse("Quartier Bè, Lomé")
                .numeroPiece("TG-2024-001")
                .profession("Commerçante")
                .build();
    }

    private KycRequest kycRequest() {
        KycRequest req = new KycRequest();
        req.setNom("Kokou");
        req.setPrenom("Afi");
        req.setDateNaissance(LocalDate.of(1995, 5, 15));
        req.setLieuNaissance("Lomé");
        req.setNationalite("Togolaise");
        req.setTypePiece(TypePiece.CNI);
        req.setNumeroPiece("TG-2024-001");
        req.setDateExpirationPiece(LocalDate.of(2034, 12, 31));
        req.setEmail("afi.kokou@mail.tg");
        req.setAdresse("Quartier Bè, Lomé");
        req.setVille("Lomé");
        req.setPays("Togo");
        req.setProfession("Commerçante");
        req.setSourceRevenus(SourceRevenus.INDEPENDANT);
        return req;
    }

    // ── getStatut ────────────────────────────────────────────────────────────

    @Test
    void getStatut_sansInfoPersonnelle_retourneNonSoumis() {
        Utilisateur u = utilisateur(NiveauVerification.AUCUN);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));
        when(infoPersonnelleRepository.findByUtilisateurId(UID)).thenReturn(Optional.empty());

        KycStatusResponse statut = kycService.getStatut(UID);

        assertEquals(NiveauVerification.AUCUN, statut.getNiveauVerification());
        assertFalse(statut.isDejaSoumis());
        assertNull(statut.getNom());
    }

    @Test
    void getStatut_avecInfoPersonnelle_retourneDetailsSoumis() {
        Utilisateur u = utilisateur(NiveauVerification.EN_ATTENTE);
        InfoPersonnelle info = info(u);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));
        when(infoPersonnelleRepository.findByUtilisateurId(UID)).thenReturn(Optional.of(info));

        KycStatusResponse statut = kycService.getStatut(UID);

        assertEquals(NiveauVerification.EN_ATTENTE, statut.getNiveauVerification());
        assertTrue(statut.isDejaSoumis());
        assertEquals("Kokou", statut.getNom());
        assertEquals("Afi", statut.getPrenom());
        assertEquals("TG-2024-001", statut.getNumeroPiece());
    }

    @Test
    void getStatut_utilisateurIntrouvable_leveException() {
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> kycService.getStatut(UID));
    }

    // ── soumettre ────────────────────────────────────────────────────────────

    @Test
    void soumettre_compteDejaVerifie_leveException() {
        Utilisateur u = utilisateur(NiveauVerification.VERIFIE);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));

        assertThrows(IllegalStateException.class, () -> kycService.soumettre(UID, kycRequest()));
        verify(infoPersonnelleRepository, never()).save(any());
    }

    @Test
    void soumettre_demandeDejaEnAttente_leveException() {
        Utilisateur u = utilisateur(NiveauVerification.EN_ATTENTE);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));

        assertThrows(IllegalStateException.class, () -> kycService.soumettre(UID, kycRequest()));
        verify(infoPersonnelleRepository, never()).save(any());
    }

    @Test
    void soumettre_nouveauCompte_creerInfoEtPasseEnAttente() {
        Utilisateur u = utilisateur(NiveauVerification.AUCUN);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));
        when(infoPersonnelleRepository.findByUtilisateurId(UID)).thenReturn(Optional.empty());

        InfoPersonnelle saved = info(u);
        when(infoPersonnelleRepository.save(any())).thenReturn(saved);
        when(utilisateurRepository.save(any())).thenReturn(u);

        kycService.soumettre(UID, kycRequest());

        assertEquals(NiveauVerification.EN_ATTENTE, u.getNiveauVerification());
        verify(infoPersonnelleRepository).save(any());
        verify(utilisateurRepository).save(u);
    }

    @Test
    void soumettre_compteRejete_peutSoumettreDenouveauEtMetAJourInfos() {
        Utilisateur u = utilisateur(NiveauVerification.REJETE);
        InfoPersonnelle existante = info(u);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));
        when(infoPersonnelleRepository.findByUtilisateurId(UID)).thenReturn(Optional.of(existante));
        when(infoPersonnelleRepository.save(any())).thenReturn(existante);
        when(utilisateurRepository.save(any())).thenReturn(u);

        KycRequest req = kycRequest();
        req.setAdresse("Nouvelle adresse, Kpalimé");
        kycService.soumettre(UID, req);

        assertEquals(NiveauVerification.EN_ATTENTE, u.getNiveauVerification());
        assertEquals("Nouvelle adresse, Kpalimé", existante.getAdresse());
        verify(infoPersonnelleRepository).save(existante);
    }

    // ── approuver ────────────────────────────────────────────────────────────

    @Test
    void approuver_compteEnAttente_passeVerifie() {
        Utilisateur u = utilisateur(NiveauVerification.EN_ATTENTE);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));
        when(utilisateurRepository.save(any())).thenReturn(u);

        kycService.approuver(UID);

        assertEquals(NiveauVerification.VERIFIE, u.getNiveauVerification());
        verify(utilisateurRepository).save(u);
    }

    @Test
    void approuver_compteNonEnAttente_leveException() {
        Utilisateur u = utilisateur(NiveauVerification.AUCUN);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));

        assertThrows(IllegalStateException.class, () -> kycService.approuver(UID));
        verify(utilisateurRepository, never()).save(any());
    }

    @Test
    void approuver_compteDejaVerifie_leveException() {
        Utilisateur u = utilisateur(NiveauVerification.VERIFIE);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));

        assertThrows(IllegalStateException.class, () -> kycService.approuver(UID));
        verify(utilisateurRepository, never()).save(any());
    }

    // ── rejeter ──────────────────────────────────────────────────────────────

    @Test
    void rejeter_compteEnAttente_passeRejete() {
        Utilisateur u = utilisateur(NiveauVerification.EN_ATTENTE);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));
        when(utilisateurRepository.save(any())).thenReturn(u);

        kycService.rejeter(UID);

        assertEquals(NiveauVerification.REJETE, u.getNiveauVerification());
        verify(utilisateurRepository).save(u);
    }

    @Test
    void rejeter_compteNonEnAttente_leveException() {
        Utilisateur u = utilisateur(NiveauVerification.AUCUN);
        when(utilisateurRepository.findById(UID)).thenReturn(Optional.of(u));

        assertThrows(IllegalStateException.class, () -> kycService.rejeter(UID));
        verify(utilisateurRepository, never()).save(any());
    }

    // ── listerEnAttente ───────────────────────────────────────────────────────

    @Test
    void listerEnAttente_retourneListeAvecInfos() {
        Utilisateur u1 = utilisateur(NiveauVerification.EN_ATTENTE);
        Utilisateur u2 = Utilisateur.builder()
                .id(UUID.randomUUID()).telephone("+22890654321")
                .niveauVerification(NiveauVerification.EN_ATTENTE).build();

        when(utilisateurRepository.findByNiveauVerification(NiveauVerification.EN_ATTENTE))
                .thenReturn(List.of(u1, u2));
        when(infoPersonnelleRepository.findByUtilisateurId(u1.getId())).thenReturn(Optional.of(info(u1)));
        when(infoPersonnelleRepository.findByUtilisateurId(u2.getId())).thenReturn(Optional.empty());

        var liste = kycService.listerEnAttente();

        assertEquals(2, liste.size());
        assertEquals(NiveauVerification.EN_ATTENTE, liste.get(0).getNiveauVerification());
        assertEquals("Kokou", liste.get(0).getNom());
        assertNull(liste.get(1).getNom());
    }
}
