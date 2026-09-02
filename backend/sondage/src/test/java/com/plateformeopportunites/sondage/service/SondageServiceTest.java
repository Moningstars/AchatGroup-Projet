package com.plateformeopportunites.sondage.service;

import com.plateformeopportunites.common.enums.*;
import com.plateformeopportunites.common.redis.RedisService;
import com.plateformeopportunites.common.service.PusherNotificationService;
import com.plateformeopportunites.finance.service.WalletService;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.sondage.dto.EligibiliteRequest;
import com.plateformeopportunites.sondage.dto.RepondreRequest;
import com.plateformeopportunites.sondage.entity.*;
import com.plateformeopportunites.sondage.repository.*;
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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SondageServiceTest {

    @Mock private SondageRepository sondageRepository;
    @Mock private SondageEligibiliteRepository sondageEligibiliteRepository;
    @Mock private SondageReponseRepository sondageReponseRepository;
    @Mock private ResultatEligibiliteRepository resultatEligibiliteRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private OptionReponseRepository optionReponseRepository;
    @Mock private AdministrateurRepository administrateurRepository;
    @Mock private UtilisateurRepository utilisateurRepository;
    @Mock private WalletService walletService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private RedisService redisService;
    @Mock private PusherNotificationService pusherNotificationService;
    @InjectMocks private SondageService sondageService;

    private static final UUID SONDAGE_ID = UUID.randomUUID();
    private static final UUID PID = UUID.randomUUID();

    private UUID q1Id, q2Id;
    private UUID bonneReponse1Id, mauvaiseReponse1Id;
    private UUID bonneReponse2Id, mauvaiseReponse2Id;

    private SondageEligibilite eligibiliteAvec2Questions;
    private Sondage sondageAvecSeuil70;

    @BeforeEach
    void setUp() {
        q1Id = UUID.randomUUID();
        q2Id = UUID.randomUUID();
        bonneReponse1Id  = UUID.randomUUID();
        mauvaiseReponse1Id = UUID.randomUUID();
        bonneReponse2Id  = UUID.randomUUID();
        mauvaiseReponse2Id = UUID.randomUUID();

        OptionEligibilite bonne1   = OptionEligibilite.builder().id(bonneReponse1Id).libelle("Bonne 1").estCorrecte(true).ordre(1).build();
        OptionEligibilite mauvaise1 = OptionEligibilite.builder().id(mauvaiseReponse1Id).libelle("Mauvaise 1").estCorrecte(false).ordre(2).build();
        OptionEligibilite bonne2   = OptionEligibilite.builder().id(bonneReponse2Id).libelle("Bonne 2").estCorrecte(true).ordre(1).build();
        OptionEligibilite mauvaise2 = OptionEligibilite.builder().id(mauvaiseReponse2Id).libelle("Mauvaise 2").estCorrecte(false).ordre(2).build();

        QuestionEligibilite question1 = QuestionEligibilite.builder()
                .id(q1Id).texte("Q1").ordre(1).typeQuestion(TypeQuestion.CHOIX_UNIQUE)
                .obligatoire(true).options(List.of(bonne1, mauvaise1)).build();
        QuestionEligibilite question2 = QuestionEligibilite.builder()
                .id(q2Id).texte("Q2").ordre(2).typeQuestion(TypeQuestion.CHOIX_UNIQUE)
                .obligatoire(true).options(List.of(bonne2, mauvaise2)).build();

        eligibiliteAvec2Questions = SondageEligibilite.builder()
                .id(UUID.randomUUID())
                .titre("Test d'éligibilité")
                .nombreQuestions(2)
                .questions(List.of(question1, question2))
                .build();

        sondageAvecSeuil70 = Sondage.builder()
                .id(SONDAGE_ID)
                .titre("Sondage test")
                .quotaVise(100)
                .repondantsActuels(0)
                .recompense(new BigDecimal("500"))
                .typeRecompense(TypeRecompense.ARGENT)
                .seuilEligibilite(new BigDecimal("70"))
                .niveauVerification(NiveauVerification.AUCUN)
                .modeDistribution(ModeDistribution.MANUEL)
                .statut(StatutSondage.ACTIF)
                .dateExpiration(LocalDateTime.now().plusDays(7))
                .createdAt(LocalDateTime.now())
                .build();
    }

    // ── passerEligibilite ────────────────────────────────────────────────────

    @Test
    void passerEligibilite_dejaPassee_leveException() {
        when(resultatEligibiliteRepository.existsByUtilisateurIdAndSondageEligibilite_Sondage_Id(PID, SONDAGE_ID)).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> sondageService.passerEligibilite(PID, SONDAGE_ID, req()));
        verify(resultatEligibiliteRepository, never()).save(any());
    }

    @Test
    void passerEligibilite_pasDeTestEligibilite_leveException() {
        when(resultatEligibiliteRepository.existsByUtilisateurIdAndSondageEligibilite_Sondage_Id(PID, SONDAGE_ID)).thenReturn(false);
        when(sondageEligibiliteRepository.findBySondageId(SONDAGE_ID)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> sondageService.passerEligibilite(PID, SONDAGE_ID, req()));
    }

    @Test
    void passerEligibilite_toutesCorrects_taux100EtEligible() {
        stubEligibilite();
        when(resultatEligibiliteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResultatEligibilite resultat = sondageService.passerEligibilite(PID, SONDAGE_ID,
                buildRequest(new UUID[]{q1Id, q2Id}, new UUID[]{bonneReponse1Id, bonneReponse2Id}));

        assertEquals(0, resultat.getTauxObtenu().compareTo(new BigDecimal("100.0")));
        assertTrue(resultat.getEstEligible());
    }

    @Test
    void passerEligibilite_uneCorrecteSurDeux_taux50NonEligible() {
        stubEligibilite();
        when(resultatEligibiliteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResultatEligibilite resultat = sondageService.passerEligibilite(PID, SONDAGE_ID,
                buildRequest(new UUID[]{q1Id, q2Id}, new UUID[]{bonneReponse1Id, mauvaiseReponse2Id}));

        assertEquals(0, resultat.getTauxObtenu().compareTo(new BigDecimal("50.0")));
        assertFalse(resultat.getEstEligible()); // 50 < 70
    }

    @Test
    void passerEligibilite_aucuneCorrecte_taux0NonEligible() {
        stubEligibilite();
        when(resultatEligibiliteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ResultatEligibilite resultat = sondageService.passerEligibilite(PID, SONDAGE_ID,
                buildRequest(new UUID[]{q1Id, q2Id}, new UUID[]{mauvaiseReponse1Id, mauvaiseReponse2Id}));

        assertEquals(0, resultat.getTauxObtenu().compareTo(new BigDecimal("0.0")));
        assertFalse(resultat.getEstEligible());
    }

    // ── activer ──────────────────────────────────────────────────────────────

    @Test
    void activer_sansTestEligibilite_leveException() {
        Sondage brouillon = sondageBrouillon();
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(brouillon));
        when(sondageEligibiliteRepository.findBySondageId(SONDAGE_ID)).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> sondageService.activer(SONDAGE_ID));
        verify(sondageRepository, never()).save(any());
    }

    @Test
    void activer_avecTestEligibilite_passeEnActif() {
        Sondage brouillon = sondageBrouillon();
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(brouillon));
        when(sondageEligibiliteRepository.findBySondageId(SONDAGE_ID))
                .thenReturn(Optional.of(eligibiliteAvec2Questions));
        when(sondageRepository.save(any())).thenReturn(brouillon);

        sondageService.activer(SONDAGE_ID);

        assertEquals(StatutSondage.ACTIF, brouillon.getStatut());
        verify(sondageRepository).save(brouillon);
    }

    // ── supprimer ─────────────────────────────────────────────────────────────

    @Test
    void supprimer_sondageActif_leveException() {
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));

        assertThrows(IllegalStateException.class, () -> sondageService.supprimer(SONDAGE_ID));
        verify(sondageRepository, never()).delete(any());
    }

    @Test
    void supprimer_sondageBrouillon_supprimeSondageEtEligibilite() {
        Sondage brouillon = sondageBrouillon();
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(brouillon));
        when(sondageEligibiliteRepository.findBySondageId(SONDAGE_ID))
                .thenReturn(Optional.of(eligibiliteAvec2Questions));

        sondageService.supprimer(SONDAGE_ID);

        verify(sondageEligibiliteRepository).delete(eligibiliteAvec2Questions);
        verify(sondageRepository).delete(brouillon);
    }

    // ── creerEligibilite ──────────────────────────────────────────────────────

    @Test
    void creerEligibilite_siDejaExistant_leveException() {
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));
        when(sondageEligibiliteRepository.findBySondageId(SONDAGE_ID))
                .thenReturn(Optional.of(eligibiliteAvec2Questions));

        com.plateformeopportunites.sondage.dto.CreerEligibiliteRequest request =
                new com.plateformeopportunites.sondage.dto.CreerEligibiliteRequest();
        request.setTitre("Test");
        request.setQuestions(List.of());

        assertThrows(IllegalArgumentException.class,
                () -> sondageService.creerEligibilite(SONDAGE_ID, request));
        verify(sondageEligibiliteRepository, never()).save(any());
    }

    // ── repondre ─────────────────────────────────────────────────────────────

    @Test
    void repondre_dejaRepondu_leveException() {
        // Redis indique déjà voté
        when(redisService.aDejaVote(SONDAGE_ID, PID)).thenReturn(true);

        assertThrows(IllegalArgumentException.class,
                () -> sondageService.repondre(PID, SONDAGE_ID, repondreReq()));
    }

    @Test
    void repondre_sansResultatEligibilite_leveException() {
        stubRedisLibre();
        when(sondageReponseRepository.existsBySondageIdAndUtilisateurId(SONDAGE_ID, PID)).thenReturn(false);
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));
        when(resultatEligibiliteRepository.findByUtilisateurIdAndSondageEligibilite_Sondage_Id(PID, SONDAGE_ID))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> sondageService.repondre(PID, SONDAGE_ID, repondreReq()));
    }

    @Test
    void repondre_nonEligible_leveException() {
        ResultatEligibilite nonEligible = ResultatEligibilite.builder()
                .estEligible(false).tauxObtenu(new BigDecimal("30")).build();
        stubRedisLibre();
        when(sondageReponseRepository.existsBySondageIdAndUtilisateurId(SONDAGE_ID, PID)).thenReturn(false);
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));
        when(resultatEligibiliteRepository.findByUtilisateurIdAndSondageEligibilite_Sondage_Id(PID, SONDAGE_ID))
                .thenReturn(Optional.of(nonEligible));

        assertThrows(IllegalArgumentException.class,
                () -> sondageService.repondre(PID, SONDAGE_ID, repondreReq()));
        verify(sondageReponseRepository, never()).save(any());
    }

    @Test
    void repondre_kycRequis_utilisateurNonVerifie_leveException() {
        sondageAvecSeuil70.setNiveauVerification(NiveauVerification.VERIFIE);
        stubRedisLibre();
        when(sondageReponseRepository.existsBySondageIdAndUtilisateurId(SONDAGE_ID, PID)).thenReturn(false);

        Utilisateur u = utilisateur();
        u.setNiveauVerification(NiveauVerification.AUCUN); // pas vérifié
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(u));
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));

        assertThrows(IllegalArgumentException.class,
                () -> sondageService.repondre(PID, SONDAGE_ID, repondreReq()));
        verify(sondageReponseRepository, never()).save(any());
    }

    @Test
    void repondre_modeAuto_distribueRecompenseImmediatement() {
        sondageAvecSeuil70.setModeDistribution(ModeDistribution.AUTO);

        UUID questionId = UUID.randomUUID();
        Question question = Question.builder().id(questionId).build();
        ResultatEligibilite eligible = ResultatEligibilite.builder()
                .estEligible(true).tauxObtenu(new BigDecimal("100")).build();
        SondageReponse savedReponse = SondageReponse.builder()
                .id(UUID.randomUUID()).sondage(sondageAvecSeuil70)
                .utilisateur(utilisateur()).recompenseVersee(false).build();

        stubRedisLibre();
        when(sondageReponseRepository.existsBySondageIdAndUtilisateurId(SONDAGE_ID, PID)).thenReturn(false);
        when(resultatEligibiliteRepository.findByUtilisateurIdAndSondageEligibilite_Sondage_Id(PID, SONDAGE_ID))
                .thenReturn(Optional.of(eligible));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(sondageRepository.save(any())).thenReturn(sondageAvecSeuil70);
        when(sondageReponseRepository.save(any())).thenReturn(savedReponse);

        RepondreRequest req = new RepondreRequest();
        RepondreRequest.ReponseDetailRequest detail = new RepondreRequest.ReponseDetailRequest();
        detail.setQuestionId(questionId);
        req.setReponses(List.of(detail));

        sondageService.repondre(PID, SONDAGE_ID, req);

        verify(walletService).crediterRecompense(eq(PID), any(BigDecimal.class));
        assertEquals(1, sondageAvecSeuil70.getRepondantsActuels());
    }

    @Test
    void repondre_modeManuel_neCreditePasImmediatement() {
        sondageAvecSeuil70.setModeDistribution(ModeDistribution.MANUEL);

        UUID questionId = UUID.randomUUID();
        Question question = Question.builder().id(questionId).build();
        ResultatEligibilite eligible = ResultatEligibilite.builder()
                .estEligible(true).tauxObtenu(new BigDecimal("100")).build();
        SondageReponse savedReponse = SondageReponse.builder()
                .id(UUID.randomUUID()).sondage(sondageAvecSeuil70)
                .utilisateur(utilisateur()).recompenseVersee(false).build();

        stubRedisLibre();
        when(sondageReponseRepository.existsBySondageIdAndUtilisateurId(SONDAGE_ID, PID)).thenReturn(false);
        when(resultatEligibiliteRepository.findByUtilisateurIdAndSondageEligibilite_Sondage_Id(PID, SONDAGE_ID))
                .thenReturn(Optional.of(eligible));
        when(utilisateurRepository.findById(PID)).thenReturn(Optional.of(utilisateur()));
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));
        when(questionRepository.findById(questionId)).thenReturn(Optional.of(question));
        when(sondageReponseRepository.save(any())).thenReturn(savedReponse);

        RepondreRequest req = new RepondreRequest();
        RepondreRequest.ReponseDetailRequest detail = new RepondreRequest.ReponseDetailRequest();
        detail.setQuestionId(questionId);
        req.setReponses(List.of(detail));

        sondageService.repondre(PID, SONDAGE_ID, req);

        // En mode MANUEL, aucune récompense créditée immédiatement
        verify(walletService, never()).crediterRecompense(any(), any());
        verify(walletService, never()).crediterPoints(any(), any());
        // repondantsActuels ne change pas en MANUEL (change uniquement à la validation)
        assertEquals(0, sondageAvecSeuil70.getRepondantsActuels());
    }

    // ── validerPreuve ─────────────────────────────────────────────────────────

    @Test
    void validerPreuve_approuve_incrementeRepondantsEtCrediteRecompense() {
        SondageReponse reponse = SondageReponse.builder()
                .id(UUID.randomUUID())
                .sondage(sondageAvecSeuil70)
                .utilisateur(utilisateur())
                .recompenseVersee(false)
                .build();
        UUID reponseId = reponse.getId();
        when(sondageReponseRepository.findById(reponseId)).thenReturn(Optional.of(reponse));
        when(sondageReponseRepository.save(any())).thenReturn(reponse);
        when(sondageRepository.save(any())).thenReturn(sondageAvecSeuil70);

        sondageService.validerPreuve(reponseId, true);

        assertEquals(StatutValidation.VALIDE, reponse.getStatutValidation());
        assertEquals(1, sondageAvecSeuil70.getRepondantsActuels());
        verify(walletService).crediterRecompense(eq(PID), eq(new BigDecimal("500")));
    }

    @Test
    void validerPreuve_rejete_neCrediteRien() {
        SondageReponse reponse = SondageReponse.builder()
                .id(UUID.randomUUID())
                .sondage(sondageAvecSeuil70)
                .utilisateur(utilisateur())
                .recompenseVersee(false)
                .build();
        UUID reponseId = reponse.getId();
        when(sondageReponseRepository.findById(reponseId)).thenReturn(Optional.of(reponse));
        when(sondageReponseRepository.save(any())).thenReturn(reponse);

        sondageService.validerPreuve(reponseId, false);

        assertEquals(StatutValidation.REJETE, reponse.getStatutValidation());
        assertEquals(0, sondageAvecSeuil70.getRepondantsActuels());
        verify(walletService, never()).crediterRecompense(any(), any());
        verify(sondageRepository, never()).save(any());
    }

    // ── cloturerExpires ───────────────────────────────────────────────────────

    @Test
    void cloturerExpires_sondageExpire_passeEnAttenteDistribution() {
        Sondage expireCeJour = Sondage.builder()
                .id(UUID.randomUUID())
                .statut(StatutSondage.ACTIF)
                .dateExpiration(LocalDateTime.now().minusHours(1))
                .build();
        when(sondageRepository.findByStatutAndDateExpirationBefore(
                eq(StatutSondage.ACTIF), any(LocalDateTime.class)))
                .thenReturn(List.of(expireCeJour));
        when(sondageRepository.save(any())).thenReturn(expireCeJour);

        sondageService.cloturerExpires();

        assertEquals(StatutSondage.EN_ATTENTE_DISTRIBUTION, expireCeJour.getStatut());
        verify(sondageRepository).save(expireCeJour);
    }

    @Test
    void cloturerExpires_aucunExpire_neFaitRien() {
        when(sondageRepository.findByStatutAndDateExpirationBefore(
                eq(StatutSondage.ACTIF), any(LocalDateTime.class)))
                .thenReturn(List.of());

        sondageService.cloturerExpires();

        verify(sondageRepository, never()).save(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void stubEligibilite() {
        when(resultatEligibiliteRepository.existsByUtilisateurIdAndSondageEligibilite_Sondage_Id(PID, SONDAGE_ID)).thenReturn(false);
        when(sondageEligibiliteRepository.findBySondageId(SONDAGE_ID))
                .thenReturn(Optional.of(eligibiliteAvec2Questions));
        when(sondageRepository.findById(SONDAGE_ID)).thenReturn(Optional.of(sondageAvecSeuil70));
        when(utilisateurRepository.findById(PID))
                .thenReturn(Optional.of(Utilisateur.builder().id(PID).build()));
    }

    private void stubRedisLibre() {
        when(redisService.aDejaVote(SONDAGE_ID, PID)).thenReturn(false);
        when(redisService.marquerVoteSiAbsent(eq(SONDAGE_ID), eq(PID), anyLong())).thenReturn(true);
    }

    private Sondage sondageBrouillon() {
        return Sondage.builder()
                .id(SONDAGE_ID)
                .statut(StatutSondage.BROUILLON)
                .niveauVerification(NiveauVerification.AUCUN)
                .modeDistribution(ModeDistribution.AUTO)
                .build();
    }

    private Utilisateur utilisateur() {
        return Utilisateur.builder()
                .id(PID)
                .niveauVerification(NiveauVerification.AUCUN)
                .build();
    }

    private EligibiliteRequest req() {
        EligibiliteRequest r = new EligibiliteRequest();
        r.setReponses(List.of());
        return r;
    }

    private RepondreRequest repondreReq() {
        RepondreRequest r = new RepondreRequest();
        r.setReponses(List.of());
        return r;
    }

    private EligibiliteRequest buildRequest(UUID[] questionIds, UUID[] optionIds) {
        EligibiliteRequest req = new EligibiliteRequest();
        List<EligibiliteRequest.ReponseEligibiliteRequest> reponses = new java.util.ArrayList<>();
        for (int i = 0; i < questionIds.length; i++) {
            EligibiliteRequest.ReponseEligibiliteRequest r = new EligibiliteRequest.ReponseEligibiliteRequest();
            r.setQuestionId(questionIds[i]);
            r.setOptionId(optionIds[i]);
            reponses.add(r);
        }
        req.setReponses(reponses);
        return req;
    }
}
