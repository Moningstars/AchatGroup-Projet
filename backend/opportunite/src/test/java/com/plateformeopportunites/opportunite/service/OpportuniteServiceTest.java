package com.plateformeopportunites.opportunite.service;

import com.plateformeopportunites.common.enums.StatutOpportunite;
import com.plateformeopportunites.common.enums.StatutParticipation;
import com.plateformeopportunites.common.enums.StatutLivraison;
import com.plateformeopportunites.common.enums.ModePlafond;
import com.plateformeopportunites.common.event.QuotaAtteintEvent;
import com.plateformeopportunites.common.redis.RedisService;
import com.plateformeopportunites.common.service.PusherNotificationService;
import com.plateformeopportunites.finance.service.WalletService;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import com.plateformeopportunites.opportunite.entity.PalierPrix;
import com.plateformeopportunites.opportunite.entity.Participation;
import com.plateformeopportunites.opportunite.dto.CreerOpportuniteRequest;
import com.plateformeopportunites.opportunite.dto.MettreAJourLivraisonRequest;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteImageRepository;
import com.plateformeopportunites.opportunite.repository.PalierPrixRepository;
import com.plateformeopportunites.opportunite.repository.ParticipationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpportuniteServiceTest {

    @Mock private OpportuniteRepository opportuniteRepository;
    @Mock private OpportuniteImageRepository imageRepository;
    @Mock private PalierPrixRepository palierPrixRepository;
    @Mock private ParticipationRepository participationRepository;
    @Mock private com.plateformeopportunites.opportunite.repository.SouscriptionIdempotenceRepository souscriptionIdempotenceRepository;
    @Mock private UtilisateurRepository utilisateurRepository;
    @Mock private AdministrateurRepository administrateurRepository;
    @Mock private WalletService walletService;
    @Mock private RedisService redisService;
    @Mock private PusherNotificationService pusherNotificationService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private OpportuniteService opportuniteService;

    private static final UUID OPP_ID = UUID.randomUUID();
    private static final UUID PID = UUID.randomUUID();

    private Opportunite opportuniteActive(int participantsActuels, int seuilMinimum) {
        return Opportunite.builder()
                .id(OPP_ID)
                .titre("Achat groupé test")
                .prixNormal(new BigDecimal("5000"))
                .seuilMinimum(seuilMinimum)
                .participantsActuels(participantsActuels)
                .statut(StatutOpportunite.ACTIVE)
                .dateExpiration(LocalDateTime.now().plusDays(7))
                .createdAt(LocalDateTime.now())
                .build();
    }

    private Utilisateur utilisateur() {
        return Utilisateur.builder().id(PID).nom("Jean").telephone("+22890123456").build();
    }

    // ── souscrire ────────────────────────────────────────────────────────────

    @Test
    void souscrire_dejaInscrit_augmenteQuantiteExistante() {
        Opportunite opp = opportuniteActive(4, 10);
        Participation existante = Participation.builder()
                .id(UUID.randomUUID())
                .utilisateur(utilisateur())
                .opportunite(opp)
                .quantite(2)
                .montantGele(new BigDecimal("10000"))
                .statut(StatutParticipation.EN_ATTENTE)
                .build();
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(participationRepository.findByUtilisateurIdAndOpportuniteIdForUpdate(PID, OPP_ID)).thenReturn(Optional.of(existante));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(OPP_ID)).thenReturn(List.of());
        when(opportuniteRepository.save(any())).thenReturn(opp);
        when(participationRepository.save(any())).thenReturn(existante);

        opportuniteService.souscrire(PID, OPP_ID, 3);

        // prix des unités ajoutées = prixNormal (5000) × quantite ajoutée (3) = 15000
        verify(walletService).gelerFonds(PID, new BigDecimal("15000"), null);
        assertEquals(5, existante.getQuantite()); // 2 + 3
        assertEquals(new BigDecimal("25000"), existante.getMontantGele()); // 10000 + 15000
        assertEquals(7, opp.getParticipantsActuels()); // 4 + 3
    }

    @Test
    void souscrire_opportuniteNonActive_leveException() {
        Opportunite opp = opportuniteActive(0, 10);
        opp.setStatut(StatutOpportunite.BROUILLON);
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));

        assertThrows(IllegalArgumentException.class,
                () -> opportuniteService.souscrire(PID, OPP_ID, 1));
        verify(walletService, never()).gelerFonds(any(), any(), any());
    }

    @Test
    void souscrire_geleLeFondsEtIncrementeParticipants() {
        Opportunite opp = opportuniteActive(4, 10);
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(OPP_ID)).thenReturn(List.of());
        when(participationRepository.findByUtilisateurIdAndOpportuniteIdForUpdate(PID, OPP_ID)).thenReturn(Optional.empty());
        when(participationRepository.save(any())).thenReturn(new Participation());
        when(opportuniteRepository.save(any())).thenReturn(opp);

        opportuniteService.souscrire(PID, OPP_ID, 2);

        // prix = prixNormal (5000) × quantite (2) = 10000
        verify(walletService).gelerFonds(PID, new BigDecimal("10000"), null);
        assertEquals(6, opp.getParticipantsActuels()); // 4 + 2
        verify(participationRepository).save(any());
    }

    @Test
    void souscrire_avantLePremierPalier_appliqueSonPrixPasLePrixNormal() {
        Opportunite opp = opportuniteActive(0, 10);
        PalierPrix premierPalier = PalierPrix.builder()
                .opportunite(opp)
                .seuilMin(1)
                .seuilMax(40)
                .prix(new BigDecimal("7360"))
                .build();
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(OPP_ID)).thenReturn(List.of(premierPalier));
        when(participationRepository.findByUtilisateurIdAndOpportuniteIdForUpdate(PID, OPP_ID)).thenReturn(Optional.empty());
        when(participationRepository.save(any())).thenReturn(new Participation());
        when(opportuniteRepository.save(any())).thenReturn(opp);

        opportuniteService.souscrire(PID, OPP_ID, 1);

        verify(walletService).gelerFonds(PID, new BigDecimal("7360"), null);
    }

    @Test
    void souscrire_formulaireComplementaireObligatoireManquant_leveException() {
        Opportunite opp = opportuniteActive(0, 10);
        opp.setFormulaireComplementaire("[{\"cle\":\"numero_box\",\"libelle\":\"Numéro de la box\",\"type\":\"TEXT\",\"obligatoire\":true,\"options\":[]}]");
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> opportuniteService.souscrire(PID, OPP_ID, 1, null, false, null, Map.of()));

        assertTrue(ex.getMessage().contains("Numéro de la box"));
        verify(walletService, never()).gelerFonds(any(), any(), any());
    }

    @Test
    void souscrire_formulaireComplementaireSauvegardeLesReponses() {
        Opportunite opp = opportuniteActive(0, 10);
        opp.setFormulaireComplementaire("[{\"cle\":\"numero_box\",\"libelle\":\"Numéro de la box\",\"type\":\"TEXT\",\"obligatoire\":true,\"options\":[]}]");
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(OPP_ID)).thenReturn(List.of());
        when(participationRepository.findByUtilisateurIdAndOpportuniteIdForUpdate(PID, OPP_ID)).thenReturn(Optional.empty());
        when(participationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(opportuniteRepository.save(any())).thenReturn(opp);

        opportuniteService.souscrire(PID, OPP_ID, 1, null, false, null, Map.of("numero_box", "CBX-2026"));

        verify(participationRepository).save(argThat(p -> p.getReponsesComplementaires() != null
                && p.getReponsesComplementaires().contains("CBX-2026")));
    }

    @Test
    void souscrire_seuilAtteint_publieQuotaAtteintEvent() {
        Opportunite opp = opportuniteActive(9, 10); // 9 participants, seuil 10
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(OPP_ID)).thenReturn(List.of());
        when(participationRepository.findByUtilisateurIdAndOpportuniteIdForUpdate(PID, OPP_ID)).thenReturn(Optional.empty());
        when(participationRepository.save(any())).thenReturn(new Participation());
        when(opportuniteRepository.save(any())).thenReturn(opp);

        opportuniteService.souscrire(PID, OPP_ID, 1); // porte à 10 >= seuil

        verify(eventPublisher).publishEvent(any(QuotaAtteintEvent.class));
    }

    @Test
    void souscrire_seuilNonAtteint_nePasPublierEvenement() {
        Opportunite opp = opportuniteActive(3, 10); // 3 + 1 = 4, seuil 10
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(palierPrixRepository.findByOpportuniteIdOrderBySeuilMin(OPP_ID)).thenReturn(List.of());
        when(participationRepository.findByUtilisateurIdAndOpportuniteIdForUpdate(PID, OPP_ID)).thenReturn(Optional.empty());
        when(participationRepository.save(any())).thenReturn(new Participation());
        when(opportuniteRepository.save(any())).thenReturn(opp);

        opportuniteService.souscrire(PID, OPP_ID, 1);

        verify(eventPublisher, never()).publishEvent(any(QuotaAtteintEvent.class));
    }

    @Test
    void creer_modePlafonne_sansSeuilMaximal_leveException() {
        CreerOpportuniteRequest request = requestCreation(ModePlafond.PLAFONNE, null);
        when(administrateurRepository.findById(any())).thenReturn(Optional.of(
                com.plateformeopportunites.identity.entity.Administrateur.builder().id(UUID.randomUUID()).build()));

        assertThrows(IllegalArgumentException.class, () -> opportuniteService.creer(UUID.randomUUID(), request));
    }

    @Test
    void creer_modePlafonne_seuilMinimumHorsPalier_leveException() {
        CreerOpportuniteRequest request = requestCreation(ModePlafond.PLAFONNE, 100);
        request.setSeuilMinimum(10);
        when(administrateurRepository.findById(any())).thenReturn(Optional.of(
                com.plateformeopportunites.identity.entity.Administrateur.builder().id(UUID.randomUUID()).build()));

        assertThrows(IllegalArgumentException.class, () -> opportuniteService.creer(UUID.randomUUID(), request));
    }

    @Test
    void creer_modeIllimite_ignoreSeuilMaximal() {
        CreerOpportuniteRequest request = requestCreation(ModePlafond.ILLIMITE, 100);
        when(administrateurRepository.findById(any())).thenReturn(Optional.of(
                com.plateformeopportunites.identity.entity.Administrateur.builder().id(UUID.randomUUID()).build()));
        when(opportuniteRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        OpportuniteService service = opportuniteService;
        assertDoesNotThrow(() -> service.creer(UUID.randomUUID(), request));
        verify(opportuniteRepository).save(argThat(opportunite ->
                opportunite.getModePlafond() == ModePlafond.ILLIMITE
                        && opportunite.getSeuilMaximal() == null));
    }

    // ── cloturerAvecSucces ───────────────────────────────────────────────────

    @Test
    void cloturerAvecSucces_debiteParticipationsEnAttente() {
        Opportunite opp = opportuniteActive(10, 10);
        Participation p1 = Participation.builder()
                .id(UUID.randomUUID())
                .utilisateur(utilisateur())
                .quantite(1)
                .montantGele(new BigDecimal("5000"))
                .statut(StatutParticipation.EN_ATTENTE)
                .build();
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(participationRepository.findByOpportuniteIdAndStatut(OPP_ID, StatutParticipation.EN_ATTENTE))
                .thenReturn(List.of(p1));
        when(opportuniteRepository.save(any())).thenReturn(opp);
        when(participationRepository.save(any())).thenReturn(p1);

        opportuniteService.cloturerAvecSucces(OPP_ID);

        assertEquals(StatutOpportunite.CLOTUREE, opp.getStatut());
        verify(walletService).debiterFinal(PID, new BigDecimal("5000"));
        assertEquals(StatutParticipation.CONFIRMEE, p1.getStatut());
    }

    // ── cloturerAvecEchec ────────────────────────────────────────────────────

    @Test
    void cloturerAvecEchec_annuleEtRembourseDansLaMemeTransaction() {
        Opportunite opp = opportuniteActive(3, 10);
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(opportuniteRepository.save(any())).thenReturn(opp);

        opportuniteService.cloturerAvecEchec(OPP_ID);

        assertEquals(StatutOpportunite.ANNULEE, opp.getStatut());
        verify(participationRepository).findByOpportuniteIdAndStatut(OPP_ID, StatutParticipation.EN_ATTENTE);
    }

    // ── cloturerExpirees ─────────────────────────────────────────────────────

    @Test
    void cloturerExpirees_seuilAtteint_cloturureAvecSucces() {
        Opportunite opp = opportuniteActive(15, 10);
        opp.setDateExpiration(LocalDateTime.now().minusHours(1));
        when(opportuniteRepository.findByStatutAndDateExpirationBefore(
                eq(StatutOpportunite.ACTIVE), any())).thenReturn(List.of(opp));
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(opportuniteRepository.save(any())).thenReturn(opp);
        when(participationRepository.findByOpportuniteIdAndStatut(OPP_ID, StatutParticipation.EN_ATTENTE))
                .thenReturn(List.of());

        opportuniteService.cloturerExpirees();

        assertEquals(StatutOpportunite.CLOTUREE, opp.getStatut());
    }

    @Test
    void cloturerExpirees_seuilNonAtteint_cloturerAvecEchec() {
        Opportunite opp = opportuniteActive(3, 10);
        opp.setDateExpiration(LocalDateTime.now().minusHours(1));
        when(opportuniteRepository.findByStatutAndDateExpirationBefore(
                eq(StatutOpportunite.ACTIVE), any())).thenReturn(List.of(opp));
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(opportuniteRepository.save(any())).thenReturn(opp);

        opportuniteService.cloturerExpirees();

        assertEquals(StatutOpportunite.ANNULEE, opp.getStatut());
        verify(participationRepository).findByOpportuniteIdAndStatut(OPP_ID, StatutParticipation.EN_ATTENTE);
    }

    private CreerOpportuniteRequest requestCreation(ModePlafond modePlafond, Integer seuilMaximal) {
        CreerOpportuniteRequest request = new CreerOpportuniteRequest();
        request.setTitre("Opportunité test");
        request.setPrixNormal(new BigDecimal("5000"));
        request.setSeuilMinimum(10);
        request.setModePlafond(modePlafond);
        request.setSeuilMaximal(seuilMaximal);
        request.setDateExpiration(LocalDateTime.now().plusDays(1));
        CreerOpportuniteRequest.PalierPrixRequest palier = new CreerOpportuniteRequest.PalierPrixRequest();
        palier.setSeuilMin(1);
        palier.setSeuilMax(20);
        palier.setPrix(new BigDecimal("4500"));
        request.setPaliers(List.of(palier));
        return request;
    }

    @Test
    void souscrire_memeCleIdempotence_neDebitePasDeuxFois() {
        Opportunite opp = opportuniteActive(4, 10);
        UUID requestId = UUID.randomUUID();
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));
        when(souscriptionIdempotenceRepository.existsById(requestId)).thenReturn(true);

        opportuniteService.souscrire(PID, OPP_ID, 2, null, false, requestId);

        verify(walletService, never()).gelerFonds(any(), any(), any());
        assertEquals(4, opp.getParticipantsActuels());
    }

    @Test
    void getActiveById_brouillonResteInvisibleAuPublic() {
        Opportunite opp = opportuniteActive(0, 10);
        opp.setStatut(StatutOpportunite.BROUILLON);
        when(opportuniteRepository.findById(OPP_ID)).thenReturn(Optional.of(opp));

        assertThrows(IllegalArgumentException.class, () -> opportuniteService.getActiveById(OPP_ID));
    }

    @Test
    void modifier_opportuniteCloturee_estInterdit() {
        Opportunite opp = opportuniteActive(10, 10);
        opp.setStatut(StatutOpportunite.CLOTUREE);
        when(opportuniteRepository.findByIdForUpdate(OPP_ID)).thenReturn(Optional.of(opp));

        assertThrows(IllegalStateException.class, () -> opportuniteService.modifier(
                OPP_ID, new com.plateformeopportunites.opportunite.dto.ModifierOpportuniteRequest()));
    }

    @Test
    void mettreAJourLivraison_accordFournisseurEtDate_declencheMiseEnLivraison() {
        Opportunite opp = opportuniteActive(1, 1);
        Participation participation = Participation.builder()
                .id(UUID.randomUUID())
                .opportunite(opp)
                .utilisateur(utilisateur())
                .statut(StatutParticipation.CONFIRMEE)
                .statutLivraison(StatutLivraison.PREPARATION)
                .quantite(1)
                .montantGele(new BigDecimal("5000"))
                .build();
        MettreAJourLivraisonRequest request = new MettreAJourLivraisonRequest();
        request.setParticipationIds(List.of(participation.getId()));
        request.setStatutLivraison(StatutLivraison.PRET_LIVRAISON);
        request.setDateLivraisonPrevue(LocalDateTime.now().plusDays(1));

        when(participationRepository.findByIdForUpdate(participation.getId())).thenReturn(Optional.of(participation));
        when(participationRepository.findByOpportuniteIdOrderByQuantiteDescMontantGeleDescCreatedAtDesc(OPP_ID))
                .thenReturn(List.of());

        opportuniteService.mettreAJourLivraison(OPP_ID, request);

        assertEquals(StatutLivraison.EN_LIVRAISON, participation.getStatutLivraison());
        assertNotNull(participation.getDateExpedition());
        verify(pusherNotificationService).notifierUtilisateur(
                eq(PID), eq("LIVRAISON_PLANIFIEE"), any());
    }

    @Test
    void demanderConfirmationsReceptionArrivees_neConfirmeJamaisALaPlaceDuParticipant() {
        Opportunite opp = opportuniteActive(1, 1);
        Participation participation = Participation.builder()
                .id(UUID.randomUUID())
                .opportunite(opp)
                .utilisateur(utilisateur())
                .statut(StatutParticipation.CONFIRMEE)
                .statutLivraison(StatutLivraison.EN_LIVRAISON)
                .dateLivraisonPrevue(LocalDateTime.now().minusMinutes(1))
                .build();
        when(participationRepository.findByStatutLivraisonAndDateLivraisonPrevueLessThanEqual(
                eq(StatutLivraison.EN_LIVRAISON), any())).thenReturn(List.of(participation));

        int nombre = opportuniteService.demanderConfirmationsReceptionArrivees();

        assertEquals(1, nombre);
        assertEquals(StatutLivraison.LIVRE_A_CONFIRMER, participation.getStatutLivraison());
        assertNull(participation.getDateConfirmationParticipant());
        verify(pusherNotificationService).notifierUtilisateur(
                eq(PID), eq("CONFIRMATION_RECEPTION_REQUISE"), any());
    }
}
