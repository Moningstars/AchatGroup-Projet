package com.plateformeopportunites.common.config;

import com.plateformeopportunites.common.enums.*;
import com.plateformeopportunites.finance.entity.Portefeuille;
import com.plateformeopportunites.finance.repository.PortefeuilleRepository;
import com.plateformeopportunites.identity.entity.*;
import com.plateformeopportunites.identity.repository.*;
import com.plateformeopportunites.opportunite.entity.Banniere;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import com.plateformeopportunites.opportunite.entity.Participation;
import com.plateformeopportunites.opportunite.repository.BanniereRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.opportunite.repository.ParticipationRepository;
import com.plateformeopportunites.sondage.dto.CreerEligibiliteRequest;
import com.plateformeopportunites.sondage.dto.CreerSondageRequest;
import com.plateformeopportunites.sondage.dto.SondageResponse;
import com.plateformeopportunites.sondage.entity.OptionReponse;
import com.plateformeopportunites.sondage.entity.Question;
import com.plateformeopportunites.sondage.entity.ReponseDetail;
import com.plateformeopportunites.sondage.entity.Sondage;
import com.plateformeopportunites.sondage.entity.SondageReponse;
import com.plateformeopportunites.sondage.repository.QuestionRepository;
import com.plateformeopportunites.sondage.repository.SondageReponseRepository;
import com.plateformeopportunites.sondage.repository.SondageRepository;
import com.plateformeopportunites.sondage.service.SondageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Complète les listes principales avec un jeu de démonstration réaliste.
 * Le seed est idempotent : il complète jusqu'à 20 éléments sans purger les
 * données déjà saisies par l'utilisateur.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
@Order(100)
@RequiredArgsConstructor
@Slf4j
public class DemoDataInitializer implements CommandLineRunner {

    private static final int MIN_DEMO_ITEMS = 20;

    private final AdministrateurRepository administrateurRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final InfoPersonnelleRepository infoPersonnelleRepository;
    private final PortefeuilleRepository portefeuilleRepository;
    private final FournisseurRepository fournisseurRepository;
    private final CommanditaireRepository commanditaireRepository;
    private final OpportuniteRepository opportuniteRepository;
    private final ParticipationRepository participationRepository;
    private final SondageRepository sondageRepository;
    private final QuestionRepository questionRepository;
    private final SondageReponseRepository sondageReponseRepository;
    private final SondageService sondageService;
    private final BanniereRepository banniereRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        Administrateur admin = administrateurRepository.findAll().stream().findFirst().orElse(null);
        if (admin == null) {
            log.warn("Seed de démonstration ignoré : aucun administrateur disponible");
            return;
        }

        List<Utilisateur> utilisateurs = assurerUtilisateurs();
        assurerFournisseurs();
        assurerCommanditaires();
        assurerSondages(admin);
        assurerReponsesSondages(utilisateurs);
        assurerBannieres();
        assurerParticipations(utilisateurs);

        log.info("=== Données de démonstration prêtes : {} utilisateurs, {} fournisseurs, {} commanditaires, {} sondages, {} réponses, {} bannières, {} participations ===",
                utilisateurRepository.count(), fournisseurRepository.count(), commanditaireRepository.count(),
                sondageRepository.count(), sondageReponseRepository.count(), banniereRepository.count(), participationRepository.count());
    }

    private List<Utilisateur> assurerUtilisateurs() {
        String[] prenoms = {"Ama", "Kossi", "Afi", "Sena", "Eyram", "Kodjo", "Akouvi", "Yao", "Abla", "Mawuli",
                "Dodzi", "Essi", "Koffi", "Ayawa", "Komlan", "Adjo", "Messan", "Yawa", "Fiavi", "Komi"};
        String[] noms = {"Sika", "Mensah", "Adom", "Mawena", "Bossou", "Atikpo", "Lawson", "Agbeko", "Komlan", "Koffi",
                "Ayite", "Tchagnao", "Amouzou", "Dossou", "Gbogbo", "Amegble", "Tete", "Nayo", "Kuevi", "Agbeti"};
        String password = passwordEncoder.encode("Test@1234");

        for (int i = (int) utilisateurRepository.count(); i < MIN_DEMO_ITEMS; i++) {
            NiveauVerification verification = i < 10 ? NiveauVerification.EN_ATTENTE
                    : i < 15 ? NiveauVerification.VERIFIE
                    : i < 18 ? NiveauVerification.AUCUN : NiveauVerification.REJETE;
            StatutCompte statut = i < 15 ? StatutCompte.ACTIF : i < 18 ? StatutCompte.EN_ATTENTE : StatutCompte.SUSPENDU;
            Utilisateur utilisateur = Utilisateur.builder()
                    .nom(prenoms[i] + " " + noms[i])
                    .telephone(String.format("+2289001%04d", i + 1))
                    .motDePasse(password)
                    .operateurMobile(OperateurMobile.values()[i % OperateurMobile.values().length])
                    .statut(statut)
                    .profilComplete(verification != NiveauVerification.AUCUN)
                    .niveauVerification(verification)
                    .createdAt(LocalDateTime.now().minusDays(MIN_DEMO_ITEMS - i))
                    .build();
            utilisateur = utilisateurRepository.save(utilisateur);

            if (verification != NiveauVerification.AUCUN) {
                infoPersonnelleRepository.save(InfoPersonnelle.builder()
                        .utilisateur(utilisateur).nom(noms[i]).prenom(prenoms[i])
                        .dateNaissance(LocalDate.of(1985 + (i % 15), (i % 12) + 1, (i % 25) + 1))
                        .lieuNaissance(i % 2 == 0 ? "Lomé" : "Kara").nationalite("Togolaise")
                        .typePiece(i % 3 == 0 ? TypePiece.PASSEPORT : TypePiece.CNI)
                        .numeroPiece(String.format("DEMO-TG-%05d", i + 1))
                        .dateExpirationPiece(LocalDate.now().plusYears(2 + i % 5))
                        .email(String.format("client%02d@demo.opportunihub.tg", i + 1))
                        .adresse((i + 10) + " rue des Opportunités").ville(i % 2 == 0 ? "Lomé" : "Kara").pays("Togo")
                        .profession(i % 3 == 0 ? "Commerçant" : i % 3 == 1 ? "Enseignant" : "Entrepreneur")
                        .sourceRevenus(SourceRevenus.values()[i % SourceRevenus.values().length])
                        .build());
            }

            portefeuilleRepository.save(Portefeuille.builder()
                    .utilisateur(utilisateur)
                    .soldeDisponible(BigDecimal.valueOf(25000L + i * 7500L))
                    .soldeGele(BigDecimal.valueOf((i % 5) * 2000L))
                    .soldePoints(BigDecimal.valueOf(100L + i * 25L))
                    .devise("XOF")
                    .build());
        }
        return utilisateurRepository.findAll();
    }

    private void assurerFournisseurs() {
        String[] societes = {"Togo Market", "Kara Distribution", "Eco Solar", "Maison Kente", "Agro Direct",
                "Tech Lomé", "Savanes Mobilité", "Nana Beauté", "West Food", "Mobilier Plus"};
        for (int i = (int) fournisseurRepository.count(); i < MIN_DEMO_ITEMS; i++) {
            fournisseurRepository.save(Fournisseur.builder()
                    .nom("Fournisseur " + (i + 1)).societe(societes[i % societes.length])
                    .email(String.format("fournisseur%02d@demo.opportunihub.tg", i + 1))
                    .telephone(String.format("+2289102%04d", i + 1))
                    .logoUrl("https://ui-avatars.com/api/?name=" + societes[i % societes.length].replace(" ", "+") + "&background=6d28d9&color=fff")
                    .reseauxUrl("https://example.com/fournisseur-" + (i + 1))
                    .statut(i < 15 ? StatutFournisseur.ACTIF : i < 18 ? StatutFournisseur.EN_ATTENTE : StatutFournisseur.SUSPENDU)
                    .build());
        }
    }

    private void assurerCommanditaires() {
        for (int i = (int) commanditaireRepository.count(); i < MIN_DEMO_ITEMS; i++) {
            commanditaireRepository.save(Commanditaire.builder()
                    .nom("Partenaire").prenom(String.format("%02d", i + 1)).societe("Études Afrique " + (i + 1))
                    .email(String.format("commanditaire%02d@demo.opportunihub.tg", i + 1))
                    .telephone(String.format("+2289203%04d", i + 1))
                    .statut(i < 15 ? StatutCommanditaire.ACTIF : i < 18 ? StatutCommanditaire.EN_ATTENTE : StatutCommanditaire.SUSPENDU)
                    .soldeDisponible(new BigDecimal("1000000"))
                    .soldeReserve(BigDecimal.ZERO)
                    .totalAlimente(new BigDecimal("1000000"))
                    .totalDistribue(BigDecimal.ZERO)
                    .build());
        }
        commanditaireRepository.findAll().stream()
                .filter(c -> c.getEmail() != null && c.getEmail().endsWith("@demo.opportunihub.tg"))
                .filter(c -> c.getTotalAlimente() == null || c.getTotalAlimente().compareTo(BigDecimal.ZERO) == 0)
                .forEach(c -> {
                    c.setSoldeDisponible(new BigDecimal("1000000"));
                    c.setSoldeReserve(BigDecimal.ZERO);
                    c.setTotalAlimente(new BigDecimal("1000000"));
                    c.setTotalDistribue(BigDecimal.ZERO);
                    commanditaireRepository.save(c);
                });
    }

    private void assurerSondages(Administrateur admin) {
        String[] themes = {"Commerce local", "Mobilité urbaine", "Énergie solaire", "Habitat", "Éducation numérique",
                "Services financiers", "Agriculture", "Santé", "Télécommunications", "Consommation responsable"};
        long existants = sondageRepository.count();
        for (int i = (int) existants; i < MIN_DEMO_ITEMS; i++) {
            String theme = themes[i % themes.length];
            CreerSondageRequest req = new CreerSondageRequest();
            req.setTitre("Étude " + theme + " — vague " + (i + 1));
            req.setDescription("Sondage de démonstration consacré à " + theme.toLowerCase() + ", destiné à tester les parcours participant et administrateur.");
            req.setQuotaVise(20 + (i % 5) * 10);
            req.setRecompense(BigDecimal.valueOf(500L + (i % 4) * 250L));
            req.setTypeRecompense(TypeRecompense.ARGENT);
            req.setSeuilEligibilite(BigDecimal.valueOf(50 + (i % 4) * 10L));
            req.setNiveauVerification(i % 3 == 0 ? NiveauVerification.VERIFIE : NiveauVerification.AUCUN);
            req.setModeDistribution(i % 2 == 0 ? ModeDistribution.AUTO : ModeDistribution.MANUEL);
            req.setDateExpiration(LocalDateTime.now().plusDays(30 + i));
            req.setQuestions(List.of(questionSondage("Quelle est votre appréciation générale de " + theme.toLowerCase() + " ?")));
            SondageResponse sondage = sondageService.creer(admin.getId(), req);

            CreerEligibiliteRequest eligibilite = new CreerEligibiliteRequest();
            eligibilite.setTitre("Éligibilité — " + theme);
            eligibilite.setQuestions(List.of(questionEligibilite(theme)));
            sondageService.creerEligibilite(sondage.getId(), eligibilite);
            sondageService.activer(sondage.getId());
        }
    }

    private CreerSondageRequest.QuestionRequest questionSondage(String texte) {
        CreerSondageRequest.QuestionRequest q = new CreerSondageRequest.QuestionRequest();
        q.setOrdre(1); q.setTypeQuestion(TypeQuestion.CHOIX_UNIQUE); q.setTexte(texte); q.setObligatoire(true);
        List<CreerSondageRequest.OptionRequest> options = new ArrayList<>();
        String[] valeurs = {"Très satisfait", "Satisfait", "Peu satisfait", "Pas satisfait"};
        for (int i = 0; i < valeurs.length; i++) {
            CreerSondageRequest.OptionRequest option = new CreerSondageRequest.OptionRequest();
            option.setLibelle(valeurs[i]); option.setOrdre(i + 1); options.add(option);
        }
        q.setOptions(options);
        return q;
    }

    private CreerEligibiliteRequest.QuestionEligibiliteRequest questionEligibilite(String theme) {
        CreerEligibiliteRequest.QuestionEligibiliteRequest q = new CreerEligibiliteRequest.QuestionEligibiliteRequest();
        q.setOrdre(1); q.setTypeQuestion(TypeQuestion.CHOIX_UNIQUE);
        q.setTexte("Êtes-vous concerné(e) par le thème « " + theme + " » ?"); q.setObligatoire(true);
        CreerEligibiliteRequest.OptionEligibiliteRequest oui = new CreerEligibiliteRequest.OptionEligibiliteRequest();
        oui.setLibelle("Oui"); oui.setOrdre(1); oui.setEstCorrecte(true);
        CreerEligibiliteRequest.OptionEligibiliteRequest non = new CreerEligibiliteRequest.OptionEligibiliteRequest();
        non.setLibelle("Non"); non.setOrdre(2); non.setEstCorrecte(false);
        q.setOptions(List.of(oui, non));
        return q;
    }

    /**
     * Ajoute un échantillon stable de réponses aux sondages de démonstration.
     * Les sondages AUTO sont tous validés, conformément au workflow réel. Les
     * sondages MANUEL contiennent aussi des dossiers à vérifier et rejetés afin
     * de rendre les écrans d'administration testables.
     */
    private void assurerReponsesSondages(List<Utilisateur> utilisateurs) {
        if (utilisateurs.isEmpty()) return;

        List<Sondage> sondages = sondageRepository.findAll();
        for (int sondageIndex = 0; sondageIndex < sondages.size(); sondageIndex++) {
            Sondage sondage = sondages.get(sondageIndex);
            int cible = Math.min(12, Math.min(sondage.getQuotaVise(), utilisateurs.size()));
            long existantes = sondageReponseRepository.countBySondageId(sondage.getId());
            if (existantes >= cible) continue;

            Question question = questionRepository.findBySondageIdOrderByOrdre(sondage.getId())
                    .stream().findFirst().orElse(null);
            if (question == null || question.getOptions() == null || question.getOptions().isEmpty()) continue;

            List<OptionReponse> options = question.getOptions().stream()
                    .sorted((a, b) -> a.getOrdre().compareTo(b.getOrdre()))
                    .toList();
            int ajoutees = 0;
            for (int utilisateurIndex = 0; utilisateurIndex < utilisateurs.size() && existantes + ajoutees < cible; utilisateurIndex++) {
                Utilisateur utilisateur = utilisateurs.get(utilisateurIndex);
                if (sondageReponseRepository.existsBySondageIdAndUtilisateurId(sondage.getId(), utilisateur.getId())) continue;

                SondageReponse reponse = SondageReponse.builder()
                        .sondage(sondage)
                        .utilisateur(utilisateur)
                        .details(new ArrayList<>())
                        .build();
                OptionReponse option = options.get((utilisateurIndex + sondageIndex) % options.size());
                ReponseDetail detail = ReponseDetail.builder()
                        .sondageReponse(reponse)
                        .question(question)
                        .optionReponse(option)
                        .build();
                reponse.getDetails().add(detail);

                SondageReponse sauvegardee = sondageReponseRepository.save(reponse);
                if (sondage.getModeDistribution() == ModeDistribution.AUTO || utilisateurIndex < 7) {
                    sauvegardee.setStatutValidation(StatutValidation.VALIDE);
                    sauvegardee.setValideeAt(LocalDateTime.now().minusDays(utilisateurIndex % 6));
                } else if (utilisateurIndex < 10) {
                    sauvegardee.setStatutValidation(StatutValidation.EN_ATTENTE_PREUVE);
                    if (utilisateurIndex < 9) {
                        sauvegardee.setFichierPreuve("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1000&q=80");
                    }
                } else {
                    sauvegardee.setStatutValidation(StatutValidation.REJETE);
                }
                sauvegardee.setRecompenseVersee(false);
                sondageReponseRepository.save(sauvegardee);
                ajoutees++;
            }

            long validees = sondageReponseRepository.countBySondageIdAndStatutValidation(
                    sondage.getId(), StatutValidation.VALIDE);
            sondage.setRepondantsActuels((int) validees);
            sondageRepository.save(sondage);
        }
    }

    private void assurerBannieres() {
        String[] titres = {"Achetez mieux, ensemble", "Les offres du moment", "Votre avis compte", "Des prix qui baissent",
                "Paiements sécurisés", "Nouveaux sondages", "Partenaires locaux", "Récompenses rapides", "Cap sur les économies", "Communauté OpportuniHub"};
        for (int i = (int) banniereRepository.count(); i < MIN_DEMO_ITEMS; i++) {
            PageCible cible = PageCible.values()[i % PageCible.values().length];
            banniereRepository.save(Banniere.builder()
                    .titre(titres[i % titres.length] + " " + (i + 1))
                    .description("Contenu de démonstration pour vérifier l'affichage, le tri et la pagination des bannières.")
                    .tag("Démo").icone("ti-sparkles")
                    .imageUrl("https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80")
                    .pageCible(cible).lien(cible == PageCible.SONDAGES ? "/sondages" : "/opportunites")
                    .ordre(i).actif(i % 5 != 0).build());
        }
    }

    private void assurerParticipations(List<Utilisateur> utilisateurs) {
        if (utilisateurs.isEmpty() || opportuniteRepository.count() == 0 || participationRepository.count() >= MIN_DEMO_ITEMS) return;
        Opportunite opportunite = opportuniteRepository.findAll().get(0);
        StatutLivraison[] livraisons = {StatutLivraison.A_PREPARER, StatutLivraison.PREPARATION,
                StatutLivraison.EN_LIVRAISON, StatutLivraison.LIVRE_A_CONFIRMER, StatutLivraison.LIVRE_CONFIRME,
                StatutLivraison.LITIGE, StatutLivraison.ECHEC_LIVRAISON};
        int quantiteTotale = 0;
        for (int i = (int) participationRepository.count(); i < MIN_DEMO_ITEMS && i < utilisateurs.size(); i++) {
            Utilisateur utilisateur = utilisateurs.get(i);
            if (participationRepository.existsByUtilisateurIdAndOpportuniteId(utilisateur.getId(), opportunite.getId())) continue;
            int quantite = 1 + i % 3;
            StatutLivraison livraison = livraisons[i % livraisons.length];
            Participation p = Participation.builder()
                    .utilisateur(utilisateur).opportunite(opportunite).quantite(quantite)
                    .montantGele(opportunite.getPrixNormal().multiply(BigDecimal.valueOf(quantite)))
                    .statut(StatutParticipation.CONFIRMEE).statutLivraison(livraison)
                    .prioriteTraitement(i % 4 == 0)
                    .creneauTraitement(LocalDateTime.now().plusDays(i % 5).withHour(9 + i % 8).withMinute(0))
                    .dateLivraisonPrevue(LocalDateTime.now().plusDays(2 + i % 7))
                    .transporteur(i % 2 == 0 ? "Togo Express" : "Coursier Partenaire")
                    .referenceLivraison(String.format("DEMO-LIV-%04d", i + 1))
                    .adresseLivraison("Lomé, quartier test " + (i + 1))
                    .noteTraitement(livraison == StatutLivraison.LITIGE ? "Participant à contacter" : "Dossier de démonstration")
                    .build();
            participationRepository.save(p);
            quantiteTotale += quantite;
        }
        if (quantiteTotale > 0) {
            opportunite.setParticipantsActuels(opportunite.getParticipantsActuels() + quantiteTotale);
            opportuniteRepository.save(opportunite);
        }
    }
}
