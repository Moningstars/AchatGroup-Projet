package com.plateformeopportunites.sondage.service;

import com.plateformeopportunites.common.enums.ModeDistribution;
import com.plateformeopportunites.common.enums.NiveauVerification;
import com.plateformeopportunites.common.enums.StatutSondage;
import com.plateformeopportunites.common.enums.StatutValidation;
import com.plateformeopportunites.common.enums.TypeQuestion;
import com.plateformeopportunites.common.enums.TypeRecompense;
import com.plateformeopportunites.common.event.RecompenseEvent;
import com.plateformeopportunites.common.event.SseNotificationEvent;
import com.plateformeopportunites.common.redis.RedisService;
import com.plateformeopportunites.common.service.PusherNotificationService;
import com.plateformeopportunites.finance.service.WalletService;
import com.plateformeopportunites.identity.entity.Administrateur;
import com.plateformeopportunites.identity.entity.Commanditaire;
import com.plateformeopportunites.identity.entity.Utilisateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.identity.repository.CommanditaireRepository;
import com.plateformeopportunites.identity.repository.UtilisateurRepository;
import com.plateformeopportunites.sondage.dto.CreerEligibiliteRequest;
import com.plateformeopportunites.sondage.dto.CreerSondageRequest;
import com.plateformeopportunites.sondage.dto.MaParticipationSondageResponse;
import com.plateformeopportunites.sondage.dto.EligibiliteQuestionsResponse;
import com.plateformeopportunites.sondage.dto.EligibiliteRequest;
import com.plateformeopportunites.sondage.dto.ModifierSondageRequest;
import com.plateformeopportunites.sondage.dto.MonEligibiliteResponse;
import com.plateformeopportunites.sondage.dto.RepondreRequest;
import com.plateformeopportunites.sondage.dto.ReponseAValiderDTO;
import com.plateformeopportunites.sondage.dto.SondageResponse;
import com.plateformeopportunites.sondage.dto.SondageResultatDTO;
import com.plateformeopportunites.sondage.entity.*;
import com.plateformeopportunites.sondage.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SondageService {

    private final SondageRepository sondageRepository;
    private final SondageEligibiliteRepository sondageEligibiliteRepository;
    private final SondageReponseRepository sondageReponseRepository;
    private final ResultatEligibiliteRepository resultatEligibiliteRepository;
    private final QuestionRepository questionRepository;
    private final OptionReponseRepository optionReponseRepository;
    private final AdministrateurRepository administrateurRepository;
    private final CommanditaireRepository commanditaireRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final WalletService walletService;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisService redisService;
    private final PusherNotificationService pusherNotificationService;

    // ─── Création ─────────────────────────────────────────────────────────────

    @Transactional
    public SondageResponse creer(UUID adminId, CreerSondageRequest req) {
        Administrateur admin = administrateurRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin introuvable"));

        Sondage sondage = Sondage.builder()
                .admin(admin)
                .commanditaireId(req.getCommanditaireId())
                .titre(req.getTitre())
                .description(req.getDescription())
                .quotaVise(req.getQuotaVise())
                .recompense(req.getRecompense())
                .typeRecompense(req.getTypeRecompense())
                .seuilEligibilite(req.getSeuilEligibilite())
                .niveauVerification(req.getNiveauVerification())
                .modeDistribution(req.getModeDistribution())
                .dateExpiration(req.getDateExpiration())
                .build();
        sondage = sondageRepository.save(sondage);

        for (CreerSondageRequest.QuestionRequest qr : req.getQuestions()) {
            Question question = Question.builder()
                    .sondage(sondage)
                    .ordre(qr.getOrdre())
                    .typeQuestion(qr.getTypeQuestion())
                    .texte(qr.getTexte())
                    .obligatoire(qr.getObligatoire())
                    .build();
            if (qr.getOptions() != null) {
                List<OptionReponse> opts = qr.getOptions().stream()
                        .map(o -> OptionReponse.builder()
                                .question(question)
                                .libelle(o.getLibelle())
                                .ordre(o.getOrdre())
                                .build())
                        .collect(Collectors.toCollection(ArrayList::new));
                question.setOptions(opts);
            }
            questionRepository.save(question);
        }

        return toResponse(sondage);
    }

    // ─── Lecture ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SondageResponse> listerActifs() {
        return sondageRepository.findByStatut(StatutSondage.ACTIF)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SondageResponse> listerTous() {
        return sondageRepository.findAll()
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SondageResponse getById(UUID id) {
        return toResponse(getSondage(id));
    }

    @Transactional(readOnly = true)
    public List<MaParticipationSondageResponse> listerMesParticipations(UUID utilisateurId) {
        return sondageReponseRepository.findByUtilisateurIdWithSondage(utilisateurId)
                .stream()
                .map(r -> {
                    Sondage s = r.getSondage();
                    return MaParticipationSondageResponse.builder()
                            .id(r.getId())
                            .sondageId(s.getId())
                            .titre(s.getTitre())
                            .recompense(s.getRecompense())
                            .typeRecompense(s.getTypeRecompense())
                            .statutValidation(r.getStatutValidation())
                            .recompenseVersee(r.getRecompenseVersee())
                            .createdAt(r.getCreatedAt())
                            .valideeAt(r.getValideeAt())
                            .build();
                })
                .toList();
    }

    // ─── Cycle de vie admin ───────────────────────────────────────────────────

    @Transactional
    public void activer(UUID sondageId) {
        Sondage sondage = getSondage(sondageId);
        if (sondageEligibiliteRepository.findBySondageId(sondageId).isEmpty()) {
            throw new IllegalStateException("Impossible d'activer : aucun test d'éligibilité configuré pour ce sondage");
        }

        // Réserve le budget nécessaire depuis le wallet plateforme
        BigDecimal budgetNecessaire = sondage.getRecompense()
                .multiply(BigDecimal.valueOf(sondage.getQuotaVise()));
        walletService.reserverBudgetSondage(sondageId, budgetNecessaire);

        sondage.setBudgetReserve(budgetNecessaire);
        sondage.setBudgetDistribue(BigDecimal.ZERO);
        sondage.setStatut(StatutSondage.ACTIF);
        sondageRepository.save(sondage);

        String payloadActif = "{\"id\":\"" + sondageId + "\",\"statut\":\"ACTIF\"}";
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "sondage:" + sondageId, "STATUT", payloadActif));
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "sondages:global", "STATUT", payloadActif));
    }

    @Transactional
    public void cloturerManuellement(UUID sondageId) {
        Sondage sondage = getSondage(sondageId);

        // Libère le reliquat non distribué vers soldePlateforme
        BigDecimal reserve   = sondage.getBudgetReserve()   != null ? sondage.getBudgetReserve()   : BigDecimal.ZERO;
        BigDecimal distribue = sondage.getBudgetDistribue() != null ? sondage.getBudgetDistribue() : BigDecimal.ZERO;
        BigDecimal reliquat  = reserve.subtract(distribue);
        if (reliquat.compareTo(BigDecimal.ZERO) > 0) {
            walletService.libererBudgetSondage(sondageId, reliquat);
        }

        sondage.setStatut(StatutSondage.EN_ATTENTE_DISTRIBUTION);
        sondageRepository.save(sondage);

        String payloadDistribution = "{\"id\":\"" + sondageId + "\",\"statut\":\"EN_ATTENTE_DISTRIBUTION\"}";
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "sondage:" + sondageId, "STATUT", payloadDistribution));
        eventPublisher.publishEvent(new SseNotificationEvent(this,
                "sondages:global", "STATUT", payloadDistribution));
    }

    @Transactional
    public SondageResponse modifier(UUID sondageId, ModifierSondageRequest req) {
        Sondage sondage = getSondage(sondageId);
        if (req.getTitre() != null && !req.getTitre().isBlank()) sondage.setTitre(req.getTitre());
        if (req.getDescription() != null) sondage.setDescription(req.getDescription());
        if (req.getQuotaVise() != null) sondage.setQuotaVise(req.getQuotaVise());
        if (req.getRecompense() != null) sondage.setRecompense(req.getRecompense());
        if (req.getDateExpiration() != null) sondage.setDateExpiration(req.getDateExpiration());
        return toResponse(sondageRepository.save(sondage));
    }

    @Transactional
    public void supprimer(UUID sondageId) {
        Sondage sondage = getSondage(sondageId);
        if (sondage.getStatut() != StatutSondage.BROUILLON) {
            throw new IllegalStateException("Seuls les sondages en brouillon peuvent être supprimés");
        }
        sondageEligibiliteRepository.findBySondageId(sondageId)
                .ifPresent(sondageEligibiliteRepository::delete);
        sondageRepository.delete(sondage);
    }

    // ─── Éligibilité ──────────────────────────────────────────────────────────

    @Transactional
    public void creerEligibilite(UUID sondageId, CreerEligibiliteRequest req) {
        Sondage sondage = getSondage(sondageId);
        if (sondageEligibiliteRepository.findBySondageId(sondageId).isPresent()) {
            throw new IllegalArgumentException("Un test d'éligibilité existe déjà pour ce sondage");
        }
        boolean hasTexteLibre = req.getQuestions().stream()
                .anyMatch(q -> q.getTypeQuestion() == TypeQuestion.TEXTE_LIBRE);
        if (hasTexteLibre) {
            throw new IllegalArgumentException(
                "Les questions d'éligibilité ne peuvent pas être de type TEXTE_LIBRE — utilisez CHOIX_UNIQUE, CHOIX_MULTIPLE ou OUI_NON");
        }

        // Sauvegarde d'abord pour obtenir un ID
        SondageEligibilite eligibilite = SondageEligibilite.builder()
                .sondage(sondage)
                .titre(req.getTitre())
                .nombreQuestions(req.getQuestions().size())
                .build();
        eligibilite = sondageEligibiliteRepository.save(eligibilite);

        // Construit les questions avec leurs options puis les attache à l'entité
        List<QuestionEligibilite> questionsElig = new java.util.ArrayList<>();
        for (CreerEligibiliteRequest.QuestionEligibiliteRequest qr : req.getQuestions()) {
            QuestionEligibilite question = QuestionEligibilite.builder()
                    .sondageEligibilite(eligibilite)
                    .texte(qr.getTexte())
                    .typeQuestion(qr.getTypeQuestion())
                    .ordre(qr.getOrdre())
                    .obligatoire(qr.getObligatoire() != null ? qr.getObligatoire() : Boolean.TRUE)
                    .build();
            if (qr.getOptions() != null) {
                List<OptionEligibilite> options = qr.getOptions().stream()
                        .map(o -> OptionEligibilite.builder()
                                .questionEligibilite(question)
                                .libelle(o.getLibelle())
                                .ordre(o.getOrdre())
                                .estCorrecte(o.getEstCorrecte())
                                .build())
                        .collect(Collectors.toCollection(ArrayList::new));
                question.setOptions(options);
            }
            questionsElig.add(question);
        }
        // La cascade CascadeType.ALL persiste questions + options via la collection
        eligibilite.setQuestions(questionsElig);
        sondageEligibiliteRepository.save(eligibilite);
    }

    @Transactional(readOnly = true)
    public EligibiliteQuestionsResponse getEligibiliteQuestions(UUID sondageId) {
        SondageEligibilite eligibilite = sondageEligibiliteRepository.findBySondageId(sondageId)
                .orElseThrow(() -> new IllegalArgumentException("Aucun test d'éligibilité pour ce sondage"));

        List<EligibiliteQuestionsResponse.QuestionEligibiliteResponse> questions = eligibilite.getQuestions()
                .stream()
                .sorted((a, b) -> Integer.compare(a.getOrdre(), b.getOrdre()))
                .map(q -> EligibiliteQuestionsResponse.QuestionEligibiliteResponse.builder()
                        .id(q.getId())
                        .ordre(q.getOrdre())
                        .texte(q.getTexte())
                        .typeQuestion(q.getTypeQuestion())
                        .obligatoire(q.getObligatoire())
                        .options(q.getOptions() == null ? List.of() : q.getOptions().stream()
                                .sorted((a, b) -> Integer.compare(a.getOrdre(), b.getOrdre()))
                                .map(o -> EligibiliteQuestionsResponse.OptionEligibiliteResponse.builder()
                                        .id(o.getId())
                                        .libelle(o.getLibelle())
                                        .ordre(o.getOrdre())
                                        .build())
                                .toList())
                        .build())
                .toList();

        return EligibiliteQuestionsResponse.builder()
                .id(eligibilite.getId())
                .titre(eligibilite.getTitre())
                .nombreQuestions(eligibilite.getNombreQuestions())
                .questions(questions)
                .build();
    }

    @Transactional(readOnly = true)
    public MonEligibiliteResponse getMonEligibilite(UUID utilisateurId, UUID sondageId) {
        return resultatEligibiliteRepository
                .findByUtilisateurIdAndSondageEligibilite_Sondage_Id(utilisateurId, sondageId)
                .map(r -> MonEligibiliteResponse.builder()
                        .aPasse(true)
                        .estEligible(r.getEstEligible())
                        .tauxObtenu(r.getTauxObtenu())
                        .build())
                .orElse(MonEligibiliteResponse.builder()
                        .aPasse(false)
                        .estEligible(false)
                        .tauxObtenu(null)
                        .build());
    }

    @Transactional
    public ResultatEligibilite passerEligibilite(UUID participantId, UUID sondageId, EligibiliteRequest req) {
        if (resultatEligibiliteRepository.existsByUtilisateurIdAndSondageEligibilite_Sondage_Id(participantId, sondageId)) {
            throw new IllegalArgumentException("Test d'éligibilité déjà passé — une seule tentative autorisée");
        }

        SondageEligibilite eligibilite = sondageEligibiliteRepository.findBySondageId(sondageId)
                .orElseThrow(() -> new IllegalArgumentException("Pas de test d'éligibilité pour ce sondage"));

        List<QuestionEligibilite> questions = eligibilite.getQuestions();
        long correctes = req.getReponses().stream()
                .filter(r -> questions.stream()
                        .filter(q -> q.getId().equals(r.getQuestionId()))
                        .flatMap(q -> q.getOptions().stream())
                        .anyMatch(o -> o.getId().equals(r.getOptionId()) && o.getEstCorrecte()))
                .count();

        BigDecimal taux = questions.isEmpty() ? BigDecimal.ZERO
                : BigDecimal.valueOf(correctes * 100.0 / questions.size());

        Sondage sondage = getSondage(sondageId);
        boolean eligible = taux.compareTo(sondage.getSeuilEligibilite()) >= 0;

        Utilisateur utilisateur = utilisateurRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));

        ResultatEligibilite resultat = ResultatEligibilite.builder()
                .utilisateur(utilisateur)
                .sondageEligibilite(eligibilite)
                .tauxObtenu(taux)
                .estEligible(eligible)
                .build();
        return resultatEligibiliteRepository.save(resultat);
    }

    // ─── Réponse au sondage ───────────────────────────────────────────────────

    @Transactional
    public SondageReponse repondre(UUID participantId, UUID sondageId, RepondreRequest req) {
        // Vérification Redis — atomique, évite les race conditions
        if (redisService.aDejaVote(sondageId, participantId)) {
            throw new IllegalArgumentException("Déjà répondu à ce sondage");
        }
        boolean reserve = redisService.marquerVoteSiAbsent(sondageId, participantId, 90L * 24 * 3600);
        if (!reserve) {
            throw new IllegalArgumentException("Déjà répondu à ce sondage");
        }
        if (sondageReponseRepository.existsBySondageIdAndUtilisateurId(sondageId, participantId)) {
            throw new IllegalArgumentException("Déjà répondu à ce sondage");
        }

        Utilisateur utilisateur = utilisateurRepository.findById(participantId)
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable"));
        Sondage sondage = getSondage(sondageId);

        // Vérification du niveau KYC requis par le sondage
        if (sondage.getNiveauVerification() != NiveauVerification.AUCUN) {
            if (utilisateur.getNiveauVerification() != NiveauVerification.VERIFIE) {
                throw new IllegalArgumentException(
                    "Ce sondage requiert une identité vérifiée (KYC). Rendez-vous dans votre profil pour compléter la vérification.");
            }
        }

        // L'éligibilité est toujours obligatoire (SondageEligibilite 1-1 avec Sondage)
        ResultatEligibilite resultat = resultatEligibiliteRepository
                .findByUtilisateurIdAndSondageEligibilite_Sondage_Id(participantId, sondageId)
                .orElseThrow(() -> new IllegalArgumentException("Test d'éligibilité requis avant de répondre"));
        if (!resultat.getEstEligible()) {
            throw new IllegalArgumentException("Non éligible à ce sondage");
        }

        SondageReponse sondageReponse = SondageReponse.builder()
                .sondage(sondage)
                .utilisateur(utilisateur)
                .build();

        List<ReponseDetail> details = req.getReponses().stream()
                .map(r -> {
                    Question question = questionRepository.findById(r.getQuestionId())
                            .orElseThrow(() -> new IllegalArgumentException("Question introuvable: " + r.getQuestionId()));
                    OptionReponse optionReponse = r.getOptionReponseId() != null
                            ? optionReponseRepository.findById(r.getOptionReponseId())
                                    .orElseThrow(() -> new IllegalArgumentException("Option introuvable: " + r.getOptionReponseId()))
                            : null;
                    return ReponseDetail.builder()
                            .sondageReponse(sondageReponse)
                            .question(question)
                            .optionReponse(optionReponse)
                            .valeurTexte(r.getValeurTexte())
                            .build();
                })
                .collect(Collectors.toCollection(ArrayList::new));
        sondageReponse.setDetails(details);

        SondageReponse saved = sondageReponseRepository.save(sondageReponse);

        // En mode AUTO, valider et créditer immédiatement
        if (sondage.getModeDistribution() == ModeDistribution.AUTO) {
            saved.setStatutValidation(StatutValidation.VALIDE);
            saved.setValideeAt(LocalDateTime.now());
            sondageReponseRepository.save(saved);

            sondage.setRepondantsActuels(sondage.getRepondantsActuels() + 1);
            sondageRepository.save(sondage);
            eventPublisher.publishEvent(new SseNotificationEvent(this,
                    "sondages:global", "COMPTEUR",
                    "{\"id\":\"" + sondageId + "\",\"repondantsActuels\":" + sondage.getRepondantsActuels() + "}"));

            distribuerRecompense(saved, ModeDistribution.AUTO);
        }
        // En mode MANUEL, la réponse reste EN_ATTENTE_PREUVE — l'admin valide

        return saved;
    }

    // ─── Soumission de preuve (participant, mode MANUEL) ─────────────────────

    @Transactional
    public void soumettrePreuve(UUID participantId, UUID sondageId, String fichierUrl) {
        SondageReponse reponse = sondageReponseRepository.findBySondageIdAndUtilisateurId(sondageId, participantId)
                .orElseThrow(() -> new IllegalArgumentException("Vous n'avez pas encore répondu à ce sondage"));
        if (reponse.getStatutValidation() != StatutValidation.EN_ATTENTE_PREUVE) {
            throw new IllegalStateException("Cette réponse n'est plus en attente de preuve");
        }
        reponse.setFichierPreuve(fichierUrl);
        sondageReponseRepository.save(reponse);
    }

    // ─── Validation admin ─────────────────────────────────────────────────────

    @Transactional
    public void validerPreuve(UUID sondageReponseId, boolean approuve) {
        SondageReponse reponse = sondageReponseRepository.findById(sondageReponseId)
                .orElseThrow(() -> new IllegalArgumentException("Réponse introuvable"));

        if (approuve && (reponse.getFichierPreuve() == null || reponse.getFichierPreuve().isBlank())) {
            throw new IllegalArgumentException("Impossible d'approuver : aucune preuve fournie pour cette réponse");
        }

        reponse.setStatutValidation(approuve ? StatutValidation.VALIDE : StatutValidation.REJETE);
        reponse.setValideeAt(LocalDateTime.now());
        sondageReponseRepository.save(reponse);

        if (approuve) {
            // repondantsActuels ne compte que les réponses VALIDES
            Sondage sondage = reponse.getSondage();
            sondage.setRepondantsActuels(sondage.getRepondantsActuels() + 1);
            sondageRepository.save(sondage);
            eventPublisher.publishEvent(new SseNotificationEvent(this,
                    "sondages:global", "COMPTEUR",
                    "{\"id\":\"" + sondage.getId() + "\",\"repondantsActuels\":" + sondage.getRepondantsActuels() + "}"));

            distribuerRecompense(reponse, ModeDistribution.MANUEL);
        }
    }

    @Transactional
    public void distribuerManuel(UUID sondageId) {
        // Distribue toutes les réponses VALIDES non encore payées
        List<SondageReponse> reponses = sondageReponseRepository
                .findBySondageIdAndStatutValidationAndRecompenseVersee(sondageId, StatutValidation.VALIDE, false);
        for (SondageReponse r : reponses) {
            distribuerRecompense(r, ModeDistribution.MANUEL);
        }
    }

    // ─── Réponses à valider ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReponseAValiderDTO> listerReponsesAValider(UUID sondageId) {
        return sondageReponseRepository.findBySondageIdAndStatutValidation(
                        sondageId, StatutValidation.EN_ATTENTE_PREUVE)
                .stream()
                .map(r -> ReponseAValiderDTO.builder()
                        .id(r.getId())
                        .participantNom(r.getUtilisateur().getNom())
                        .participantContact(r.getUtilisateur().getTelephone())
                        .statutValidation(r.getStatutValidation())
                        .createdAt(r.getCreatedAt())
                        .valideeAt(r.getValideeAt())
                        .recompenseVersee(r.getRecompenseVersee())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReponseAValiderDTO> listerRepondants(UUID sondageId) {
        return sondageReponseRepository.findBySondageIdOrderByCreatedAtDesc(sondageId)
                .stream()
                .map(r -> ReponseAValiderDTO.builder()
                        .id(r.getId())
                        .participantNom(r.getUtilisateur().getNom())
                        .participantContact(r.getUtilisateur().getTelephone())
                        .statutValidation(r.getStatutValidation())
                        .createdAt(r.getCreatedAt())
                        .valideeAt(r.getValideeAt())
                        .recompenseVersee(r.getRecompenseVersee())
                        .build())
                .toList();
    }

    // ─── Résultats (consultation admin) ──────────────────────────────────────

    @Transactional(readOnly = true)
    public SondageResultatDTO genererResultats(UUID sondageId) {
        Sondage sondage = getSondage(sondageId);

        List<SondageReponse> reponsesValidees = sondageReponseRepository
                .findBySondageIdAndStatutValidationWithDetails(sondageId, StatutValidation.VALIDE);
        int repondantsValides = reponsesValidees.size();

        List<ReponseDetail> tousDetails = reponsesValidees.stream()
                .flatMap(r -> r.getDetails().stream())
                .toList();

        List<Question> questions = questionRepository.findBySondageIdOrderByOrdre(sondageId);

        String commanditaireNom = null;
        String commanditaireSociete = null;
        if (sondage.getCommanditaireId() != null) {
            Commanditaire commanditaire = commanditaireRepository.findById(sondage.getCommanditaireId()).orElse(null);
            if (commanditaire != null) {
                commanditaireNom = commanditaire.getNom() + " " + commanditaire.getPrenom();
                commanditaireSociete = commanditaire.getSociete();
            }
        }

        List<SondageResultatDTO.QuestionResultat> resultatsParQuestion = questions.stream()
                .map(q -> {
                    List<ReponseDetail> detailsQuestion = tousDetails.stream()
                            .filter(d -> d.getQuestion().getId().equals(q.getId()))
                            .toList();

                    List<SondageResultatDTO.OptionResultat> repartition = null;
                    List<String> verbatims = null;

                    if (q.getTypeQuestion() == TypeQuestion.CHOIX_UNIQUE
                            || q.getTypeQuestion() == TypeQuestion.CHOIX_MULTIPLE) {
                        repartition = q.getOptions().stream()
                                .map(o -> {
                                    long count = detailsQuestion.stream()
                                            .filter(d -> d.getOptionReponse() != null
                                                    && d.getOptionReponse().getId().equals(o.getId()))
                                            .count();
                                    return SondageResultatDTO.OptionResultat.builder()
                                            .optionId(o.getId())
                                            .libelle(o.getLibelle())
                                            .count(count)
                                            .pourcentage(pourcentage(count, repondantsValides))
                                            .build();
                                })
                                .toList();
                    } else if (q.getTypeQuestion() == TypeQuestion.OUI_NON) {
                        repartition = detailsQuestion.stream()
                                .map(ReponseDetail::getValeurTexte)
                                .filter(v -> v != null && !v.isBlank())
                                .collect(Collectors.groupingBy(v -> v, Collectors.counting()))
                                .entrySet().stream()
                                .map(e -> SondageResultatDTO.OptionResultat.builder()
                                        .optionId(null)
                                        .libelle(e.getKey())
                                        .count(e.getValue())
                                        .pourcentage(pourcentage(e.getValue(), repondantsValides))
                                        .build())
                                .toList();
                    } else {
                        verbatims = detailsQuestion.stream()
                                .map(ReponseDetail::getValeurTexte)
                                .filter(v -> v != null && !v.isBlank())
                                .toList();
                    }

                    return SondageResultatDTO.QuestionResultat.builder()
                            .questionId(q.getId())
                            .ordre(q.getOrdre())
                            .texte(q.getTexte())
                            .typeQuestion(q.getTypeQuestion())
                            .repartition(repartition)
                            .verbatims(verbatims)
                            .build();
                })
                .toList();

        return SondageResultatDTO.builder()
                .sondageId(sondage.getId())
                .titre(sondage.getTitre())
                .commanditaireNom(commanditaireNom)
                .commanditaireSociete(commanditaireSociete)
                .quotaVise(sondage.getQuotaVise())
                .repondantsValides(repondantsValides)
                .tauxCompletion(pourcentage(repondantsValides, sondage.getQuotaVise()))
                .budgetDistribue(sondage.getBudgetDistribue())
                .resultatsParQuestion(resultatsParQuestion)
                .build();
    }

    private BigDecimal pourcentage(long count, int total) {
        if (total <= 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(count * 100.0 / total)
                .setScale(1, java.math.RoundingMode.HALF_UP);
    }

    // ─── Scheduler ───────────────────────────────────────────────────────────

    public void cloturerExpires() {
        List<Sondage> expires = sondageRepository
                .findByStatutAndDateExpirationBefore(StatutSondage.ACTIF, LocalDateTime.now());
        for (Sondage s : expires) {
            s.setStatut(StatutSondage.EN_ATTENTE_DISTRIBUTION);
            sondageRepository.save(s);
        }
    }

    // ─── Interne ─────────────────────────────────────────────────────────────

    private void distribuerRecompense(SondageReponse reponse, ModeDistribution mode) {
        if (reponse.getRecompenseVersee()) return;

        Sondage sondage = reponse.getSondage();
        UUID participantId = reponse.getUtilisateur().getId();

        // montantFCFA = valeur FCFA de la récompense (toujours en FCFA dans budgetReserve)
        BigDecimal montantFCFA = sondage.getRecompense();

        // 1. Débiter soldeReserve du wallet plateforme
        walletService.debiterPourDistribution(sondage.getId(), montantFCFA, sondage.getTypeRecompense(), mode);

        // 2. Créditer le participant
        if (sondage.getTypeRecompense() == TypeRecompense.POINTS) {
            BigDecimal taux = walletService.getWalletPlateforme().getTauxConversionPoints();
            if (taux == null || taux.compareTo(BigDecimal.ZERO) <= 0) taux = BigDecimal.ONE;
            BigDecimal montantPoints = montantFCFA.divide(taux, 0, java.math.RoundingMode.DOWN);
            walletService.crediterPoints(participantId, montantPoints);
        } else {
            walletService.crediterRecompense(participantId, montantFCFA);
        }

        // 3. Tracker le budget distribué sur le sondage
        BigDecimal distribueAvant = sondage.getBudgetDistribue() != null ? sondage.getBudgetDistribue() : BigDecimal.ZERO;
        BigDecimal distribueApres = distribueAvant.add(montantFCFA);
        sondage.setBudgetDistribue(distribueApres);
        sondageRepository.save(sondage);

        // Alerte admin la première fois que 80% du budget réservé est distribué.
        BigDecimal reserve = sondage.getBudgetReserve();
        if (reserve != null && reserve.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal seuil80 = reserve.multiply(new BigDecimal("0.8"));
            if (distribueAvant.compareTo(seuil80) < 0 && distribueApres.compareTo(seuil80) >= 0) {
                pusherNotificationService.notifierAdmins("SONDAGE_BUDGET_PRESQUE_EPUISE", Map.of(
                        "id", sondage.getId(), "titre", sondage.getTitre(),
                        "budgetDistribue", distribueApres, "budgetReserve", reserve));
            }
        }

        // 4. Marquer la récompense comme versée
        reponse.setRecompenseVersee(true);
        sondageReponseRepository.save(reponse);

        eventPublisher.publishEvent(new RecompenseEvent(this, sondage.getId(), participantId));
    }

    private Sondage getSondage(UUID id) {
        return sondageRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Sondage introuvable"));
    }

    private SondageResponse toResponse(Sondage s) {
        List<SondageResponse.QuestionResponse> questions = questionRepository
                .findBySondageIdOrderByOrdre(s.getId())
                .stream()
                .map(q -> SondageResponse.QuestionResponse.builder()
                        .id(q.getId())
                        .ordre(q.getOrdre())
                        .typeQuestion(q.getTypeQuestion())
                        .texte(q.getTexte())
                        .obligatoire(q.getObligatoire())
                        .options(q.getOptions() == null ? List.of() : q.getOptions().stream()
                                .map(o -> SondageResponse.OptionResponse.builder()
                                        .id(o.getId())
                                        .libelle(o.getLibelle())
                                        .ordre(o.getOrdre())
                                        .build())
                                .toList())
                        .build())
                .toList();

        String commanditaireNom = null;
        String commanditaireSociete = null;
        if (s.getCommanditaireId() != null) {
            Commanditaire commanditaire = commanditaireRepository.findById(s.getCommanditaireId()).orElse(null);
            if (commanditaire != null) {
                commanditaireNom = commanditaire.getNom() + " " + commanditaire.getPrenom();
                commanditaireSociete = commanditaire.getSociete();
            }
        }

        return SondageResponse.builder()
                .id(s.getId())
                .commanditaireId(s.getCommanditaireId())
                .commanditaireNom(commanditaireNom)
                .commanditaireSociete(commanditaireSociete)
                .titre(s.getTitre())
                .description(s.getDescription())
                .quotaVise(s.getQuotaVise())
                .repondantsActuels(s.getRepondantsActuels())
                .recompense(s.getRecompense())
                .typeRecompense(s.getTypeRecompense())
                .seuilEligibilite(s.getSeuilEligibilite())
                .niveauVerification(s.getNiveauVerification())
                .modeDistribution(s.getModeDistribution())
                .dateExpiration(s.getDateExpiration())
                .statut(s.getStatut())
                .budgetReserve(s.getBudgetReserve())
                .budgetDistribue(s.getBudgetDistribue())
                .createdAt(s.getCreatedAt())
                .questions(questions)
                .hasEligibilite(sondageEligibiliteRepository.existsBySondageId(s.getId()))
                .build();
    }
}
