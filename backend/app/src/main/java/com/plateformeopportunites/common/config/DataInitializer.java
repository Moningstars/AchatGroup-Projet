package com.plateformeopportunites.common.config;

import com.plateformeopportunites.common.enums.*;
import com.plateformeopportunites.finance.entity.WalletPlateforme;
import com.plateformeopportunites.finance.repository.WalletPlateformeRepository;
import com.plateformeopportunites.identity.entity.Administrateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.opportunite.dto.CreerOpportuniteRequest;
import com.plateformeopportunites.opportunite.entity.Banniere;
import com.plateformeopportunites.opportunite.repository.BanniereRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.opportunite.service.OpportuniteService;
import com.plateformeopportunites.sondage.dto.CreerEligibiliteRequest;
import com.plateformeopportunites.sondage.dto.CreerSondageRequest;
import com.plateformeopportunites.sondage.dto.SondageResponse;
import com.plateformeopportunites.sondage.repository.SondageRepository;
import com.plateformeopportunites.sondage.service.SondageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final AdministrateurRepository administrateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final WalletPlateformeRepository walletPlateformeRepository;

    private final JdbcTemplate jdbcTemplate;
    private final BanniereRepository banniereRepository;

    // ── Opportunités ─────────────────────────────────────────────────────────
    private final OpportuniteService opportuniteService;
    private final OpportuniteRepository opportuniteRepository;

    // ── Sondage ──────────────────────────────────────────────────────────────
    private final SondageService sondageService;
    private final SondageRepository sondageRepository;

    @Override
    @Transactional
    public void run(String... args) {
        corrigerContraintesSchema();
        Administrateur admin = creerAdminSiAbsent();
        initialiserWalletPlateforme();
        if (sondageRepository.count() == 0) {
            seederSondages(admin);
        }
        if (banniereRepository.count() == 0) {
            seederBannieres();
        }
        if (opportuniteRepository.count() == 0) {
            seederOpportunites(admin);
        }
    }

    // ── Correction schema ─────────────────────────────────────────────────────

    private void corrigerContraintesSchema() {
        // Hibernate 6 génère des CHECK constraints basées sur les valeurs de l'enum
        // au moment de la création du schéma. Si l'enum a évolué, ces contraintes
        // obsolètes bloquent l'insertion de nouvelles valeurs.
        // On les supprime puis on les recrée avec les valeurs à jour.
        String[] drop = {
            "ALTER TABLE sondages DROP CONSTRAINT IF EXISTS sondages_niveau_verification_check",
            "ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_niveau_verification_check",
            "ALTER TABLE transactions_plateforme DROP CONSTRAINT IF EXISTS transactions_plateforme_type_check",
            "ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check",
        };
        String[] recreate = {
            "ALTER TABLE transactions_plateforme ADD CONSTRAINT transactions_plateforme_type_check " +
                "CHECK (type IN ('ALIMENTATION','DISTRIBUTION_AUTO','DISTRIBUTION_MANUELLE','RESERVATION_BUDGET','LIBERATION_BUDGET'))",
            "ALTER TABLE transactions ADD CONSTRAINT transactions_type_check " +
                "CHECK (type IN ('DEPOT','GEL','DEBIT','REMBOURSEMENT','RECOMPENSE','RETRAIT','CONVERSION_POINTS'))",
        };
        for (String sql : drop) {
            try { jdbcTemplate.execute(sql); }
            catch (Exception e) { log.warn("DROP contrainte : {}", e.getMessage()); }
        }
        for (String sql : recreate) {
            try { jdbcTemplate.execute(sql); }
            catch (Exception e) { log.warn("ADD contrainte : {}", e.getMessage()); }
        }
        log.info("=== Contraintes de schéma obsolètes corrigées ===");
    }

    // ── Wallet plateforme ─────────────────────────────────────────────────────

    private void initialiserWalletPlateforme() {
        if (walletPlateformeRepository.count() == 0) {
            WalletPlateforme wp = WalletPlateforme.builder()
                    .soldePlateforme(new BigDecimal("10000000"))
                    .soldeReserve(BigDecimal.ZERO)
                    .soldePoints(new BigDecimal("1000000"))
                    .devise("XOF")
                    .build();
            walletPlateformeRepository.save(wp);
            log.info("=== WalletPlateforme initialisé : 10 000 000 FCFA / 1 000 000 points ===");
        }
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    private Administrateur creerAdminSiAbsent() {
        if (administrateurRepository.count() == 0) {
            Administrateur superAdmin = Administrateur.builder()
                    .nom("Super Admin")
                    .email("admin@plateforme.tg")
                    .motDePasse(passwordEncoder.encode("Admin@1234"))
                    .niveauAcces(NiveauAcces.SUPER_ADMIN)
                    .build();
            superAdmin = administrateurRepository.save(superAdmin);
            log.info("=== Admin initial créé : admin@plateforme.tg / Admin@1234 ===");
            log.warn("=== Changez ce mot de passe en production ! ===");
            return superAdmin;
        }
        return administrateurRepository.findAll().get(0);
    }

    // ── Sondages ──────────────────────────────────────────────────────────────

    @Transactional
    protected void seederSondages(Administrateur admin) {
        log.info("=== Seeding 3 sondages de démonstration ===");

        // ── Sondage 1 : Habitudes financières et paiement mobile ─────────────
        CreerSondageRequest req1 = new CreerSondageRequest();
        req1.setTitre("Habitudes financières et paiement mobile");
        req1.setDescription("Cette étude explore vos pratiques de paiement mobile et d'utilisation des services financiers numériques en Afrique de l'Ouest.");
        req1.setQuotaVise(50);
        req1.setRecompense(new BigDecimal("1500"));
        req1.setTypeRecompense(TypeRecompense.ARGENT);
        req1.setSeuilEligibilite(new BigDecimal("80"));
        req1.setNiveauVerification(NiveauVerification.AUCUN);
        req1.setModeDistribution(ModeDistribution.AUTO);
        req1.setDateExpiration(LocalDateTime.now().plusDays(90));
        req1.setQuestions(List.of(
            q(1, TypeQuestion.CHOIX_UNIQUE, "Quel opérateur de mobile money utilisez-vous principalement ?", true,
                opts("Flooz (Togocel/Moov)", "MTN MoMo", "Moov Money", "Je n'utilise pas le mobile money")),
            q(2, TypeQuestion.CHOIX_MULTIPLE, "Pour quels usages utilisez-vous le mobile money ? (plusieurs réponses possibles)", true,
                opts("Paiement de factures (eau, électricité)", "Transferts d'argent à la famille", "Épargne mobile", "Achats en ligne", "Retraits d'espèces")),
            q(3, TypeQuestion.OUI_NON, "Avez-vous déjà eu des difficultés lors d'une transaction mobile money ?", false, null),
            q(4, TypeQuestion.TEXTE_LIBRE, "Selon vous, quelle amélioration majeure devrait être apportée aux services de paiement mobile ?", false, null)
        ));
        SondageResponse s1 = sondageService.creer(admin.getId(), req1);

        CreerEligibiliteRequest elig1 = new CreerEligibiliteRequest();
        elig1.setTitre("Test d'éligibilité — Connaissances mobile money");
        elig1.setQuestions(List.of(
            qElig(1, TypeQuestion.CHOIX_UNIQUE, "À quelle catégorie appartient le service mobile money ?", true,
                List.of(
                    opt("Un service bancaire traditionnel avec agence physique", 1, false),
                    opt("Un service de paiement et transfert via téléphone mobile", 2, true),
                    opt("Un réseau social à dimension financière", 3, false),
                    opt("Un distributeur automatique numérique", 4, false)
                )),
            qElig(2, TypeQuestion.CHOIX_UNIQUE, "Quel élément est indispensable pour ouvrir un compte mobile money ?", true,
                List.of(
                    opt("Un compte bancaire physique préexistant", 1, false),
                    opt("Un téléphone mobile et une carte SIM enregistrée", 2, true),
                    opt("Une connexion Internet haut débit permanente", 3, false),
                    opt("Une carte bancaire Visa ou Mastercard", 4, false)
                )),
            qElig(3, TypeQuestion.CHOIX_UNIQUE, "Laquelle de ces informations NE DOIT JAMAIS être communiquée à un tiers ?", true,
                List.of(
                    opt("Votre numéro de téléphone mobile", 1, false),
                    opt("Le nom de votre opérateur mobile", 2, false),
                    opt("Votre code PIN ou mot de passe mobile money", 3, true),
                    opt("L'horodatage de vos transactions", 4, false)
                ))
        ));
        sondageService.creerEligibilite(s1.getId(), elig1);
        sondageService.activer(s1.getId());
        log.info("=== Sondage 1 créé et activé : {} ===", s1.getId());

        // ── Sondage 2 : Accès aux soins de santé en zone rurale ──────────────
        CreerSondageRequest req2 = new CreerSondageRequest();
        req2.setTitre("Accès aux soins de santé en zone rurale");
        req2.setDescription("Cette étude analyse les obstacles à l'accès aux soins de santé dans les zones rurales et semi-rurales. Votre expérience est précieuse.");
        req2.setQuotaVise(30);
        req2.setRecompense(new BigDecimal("2500"));
        req2.setTypeRecompense(TypeRecompense.ARGENT);
        req2.setSeuilEligibilite(new BigDecimal("60"));
        req2.setNiveauVerification(NiveauVerification.VERIFIE);
        req2.setModeDistribution(ModeDistribution.MANUEL);
        req2.setDateExpiration(LocalDateTime.now().plusDays(60));
        req2.setQuestions(List.of(
            q(1, TypeQuestion.CHOIX_UNIQUE, "Quel type de structure de santé consultez-vous en priorité ?", true,
                opts("Hôpital public", "Clinique privée", "Centre de santé communautaire", "Tradipraticien / médecine traditionnelle")),
            q(2, TypeQuestion.CHOIX_MULTIPLE, "Quels obstacles vous empêchent d'accéder aux soins ? (plusieurs réponses possibles)", true,
                opts("Coût élevé des soins médicaux", "Distance trop grande du centre de santé", "Manque de personnel médical qualifié", "Files d'attente trop longues", "Absence d'assurance maladie")),
            q(3, TypeQuestion.CHOIX_UNIQUE, "Êtes-vous couvert(e) par une assurance maladie ?", true,
                opts("Oui, assurance employeur", "Oui, assurance personnelle souscrite", "Non, aucune couverture", "Je ne sais pas")),
            q(4, TypeQuestion.CHOIX_UNIQUE, "Comment évaluez-vous globalement la qualité des soins dans votre localité ?", true,
                opts("Excellente", "Bonne", "Passable", "Insuffisante"))
        ));
        SondageResponse s2 = sondageService.creer(admin.getId(), req2);

        CreerEligibiliteRequest elig2 = new CreerEligibiliteRequest();
        elig2.setTitre("Test d'éligibilité — Profil zone rurale");
        elig2.setQuestions(List.of(
            qElig(1, TypeQuestion.CHOIX_UNIQUE, "Ce sondage est destiné aux résidents de zones rurales. Quelle est votre zone de résidence ?", true,
                List.of(
                    opt("Zone urbaine (grande ville de plus de 100 000 habitants)", 1, false),
                    opt("Zone péri-urbaine (banlieue)", 2, false),
                    opt("Zone rurale ou semi-rurale (village, campagne, bourg)", 3, true)
                )),
            qElig(2, TypeQuestion.CHOIX_UNIQUE, "Avez-vous eu recours à un service de santé (consultation, hospitalisation) au cours des 12 derniers mois ?", true,
                List.of(
                    opt("Oui, au moins une fois", 1, true),
                    opt("Non, je n'ai pas eu besoin", 2, false),
                    opt("Je ne me souviens pas", 3, false)
                )),
            qElig(3, TypeQuestion.CHOIX_UNIQUE, "Selon vous, l'accès aux soins de santé de qualité est :", true,
                List.of(
                    opt("Un luxe accessible uniquement aux personnes aisées", 1, false),
                    opt("Un droit fondamental qui doit être garanti pour tous", 2, true),
                    opt("Une responsabilité individuelle sans obligation d'État", 3, false)
                ))
        ));
        sondageService.creerEligibilite(s2.getId(), elig2);
        sondageService.activer(s2.getId());
        log.info("=== Sondage 2 créé et activé : {} ===", s2.getId());

        // ── Sondage 3 : Consommation numérique et réseaux sociaux ────────────
        CreerSondageRequest req3 = new CreerSondageRequest();
        req3.setTitre("Consommation numérique et réseaux sociaux");
        req3.setDescription("Cette étude mesure vos habitudes de consommation numérique et l'impact des réseaux sociaux sur votre quotidien.");
        req3.setQuotaVise(100);
        req3.setRecompense(new BigDecimal("750"));
        req3.setTypeRecompense(TypeRecompense.ARGENT);
        req3.setSeuilEligibilite(new BigDecimal("75"));
        req3.setNiveauVerification(NiveauVerification.AUCUN);
        req3.setModeDistribution(ModeDistribution.AUTO);
        req3.setDateExpiration(LocalDateTime.now().plusDays(120));
        req3.setQuestions(List.of(
            q(1, TypeQuestion.CHOIX_UNIQUE, "Quelle plateforme de réseaux sociaux ou messagerie utilisez-vous le plus souvent ?", true,
                opts("WhatsApp", "Facebook", "TikTok", "Instagram", "YouTube", "Twitter / X")),
            q(2, TypeQuestion.CHOIX_MULTIPLE, "Quel type de contenu consommez-vous principalement en ligne ? (plusieurs réponses possibles)", true,
                opts("Actualités et informations", "Divertissement et humour", "Tutoriels et formations", "Musique et vidéos", "Commerce et achats en ligne", "Contenus religieux ou spirituels")),
            q(3, TypeQuestion.CHOIX_UNIQUE, "Combien d'heures par jour passez-vous en moyenne sur les réseaux sociaux et applications ?", true,
                opts("Moins d'1 heure", "Entre 1 et 2 heures", "Entre 2 et 4 heures", "Plus de 4 heures"))
        ));
        SondageResponse s3 = sondageService.creer(admin.getId(), req3);

        CreerEligibiliteRequest elig3 = new CreerEligibiliteRequest();
        elig3.setTitre("Test d'éligibilité — Usages numériques");
        elig3.setQuestions(List.of(
            qElig(1, TypeQuestion.CHOIX_UNIQUE, "À quelle fréquence utilisez-vous les réseaux sociaux ou les applications de messagerie ?", true,
                List.of(
                    opt("Jamais", 1, false),
                    opt("Moins d'une fois par semaine", 2, false),
                    opt("Plusieurs fois par semaine ou tous les jours", 3, true)
                )),
            qElig(2, TypeQuestion.CHOIX_UNIQUE, "Quel est le principal danger à éviter sur les réseaux sociaux ?", true,
                List.of(
                    opt("Regarder trop de vidéos de divertissement", 1, false),
                    opt("Partager ses informations personnelles et bancaires avec des inconnus", 2, true),
                    opt("Avoir un trop grand nombre d'abonnés", 3, false),
                    opt("Consulter les actualités internationales", 4, false)
                ))
        ));
        sondageService.creerEligibilite(s3.getId(), elig3);
        sondageService.activer(s3.getId());
        log.info("=== Sondage 3 créé et activé : {} ===", s3.getId());

        log.info("=== 3 sondages créés avec tests d'éligibilité et activés ===");
    }

    // ── Helpers constructeurs DTO ─────────────────────────────────────────────

    private CreerSondageRequest.QuestionRequest q(int ordre, TypeQuestion type, String texte,
                                                   boolean obligatoire,
                                                   List<CreerSondageRequest.OptionRequest> options) {
        CreerSondageRequest.QuestionRequest q = new CreerSondageRequest.QuestionRequest();
        q.setOrdre(ordre);
        q.setTypeQuestion(type);
        q.setTexte(texte);
        q.setObligatoire(obligatoire);
        q.setOptions(options);
        return q;
    }

    private List<CreerSondageRequest.OptionRequest> opts(String... libelles) {
        List<CreerSondageRequest.OptionRequest> list = new ArrayList<>();
        for (int i = 0; i < libelles.length; i++) {
            CreerSondageRequest.OptionRequest o = new CreerSondageRequest.OptionRequest();
            o.setLibelle(libelles[i]);
            o.setOrdre(i + 1);
            list.add(o);
        }
        return list;
    }

    private CreerEligibiliteRequest.QuestionEligibiliteRequest qElig(int ordre, TypeQuestion type,
                                                                      String texte, boolean obligatoire,
                                                                      List<CreerEligibiliteRequest.OptionEligibiliteRequest> options) {
        CreerEligibiliteRequest.QuestionEligibiliteRequest q = new CreerEligibiliteRequest.QuestionEligibiliteRequest();
        q.setOrdre(ordre);
        q.setTypeQuestion(type);
        q.setTexte(texte);
        q.setObligatoire(obligatoire);
        q.setOptions(options);
        return q;
    }

    private CreerEligibiliteRequest.OptionEligibiliteRequest opt(String libelle, int ordre, boolean estCorrecte) {
        CreerEligibiliteRequest.OptionEligibiliteRequest o = new CreerEligibiliteRequest.OptionEligibiliteRequest();
        o.setLibelle(libelle);
        o.setOrdre(ordre);
        o.setEstCorrecte(estCorrecte);
        return o;
    }

    // ── Opportunités (achats groupés) ───────────────────────────────────────────

    /** Un item du catalogue de démo : catégorie, titre, prix normal (FCFA), seuil minimum de participants, jours avant expiration. */
    private record OpportuniteSeed(String categorie, String titre, long prixNormal, int seuilMinimum, int joursExpiration) {}

    private void seederOpportunites(Administrateur admin) {
        // Sélection pensée pour l'Afrique de l'Ouest (Togo, Bénin, Côte d'Ivoire, Sénégal) :
        // mélange de pagnes/mode locale, produits alimentaires de base, énergie solaire/groupes
        // électrogènes (délestage), mobilité (motos), et biens de consommation courants.
        // Pas d'image ni de description détaillée — à compléter ensuite côté admin.
        List<OpportuniteSeed> seeds = List.of(
            // ── Mode (pagnes, tissus, vêtements locaux) ──
            new OpportuniteSeed("Mode", "Pagne Wax Hollandais 6 yards", 22000, 25, 30),
            new OpportuniteSeed("Mode", "Ensemble boubou bazin riche brodé homme", 35000, 15, 25),
            new OpportuniteSeed("Mode", "Kaba façonné prêt-à-coudre", 18000, 20, 20),
            new OpportuniteSeed("Mode", "Pagne Java authentique 6 yards", 15000, 30, 28),
            new OpportuniteSeed("Mode", "Sac à main en tissu Kente tissé", 12000, 40, 15),
            new OpportuniteSeed("Mode", "Chemise homme imprimé Ankara", 9000, 35, 18),
            new OpportuniteSeed("Mode", "Foulard / gèlè en soie imprimée", 6000, 50, 12),
            new OpportuniteSeed("Mode", "Sandales en cuir tressé artisanales", 8500, 30, 22),

            // ── Électronique (énergie, téléphonie, ventilation) ──
            new OpportuniteSeed("Électronique", "Groupe électrogène essence 3.5 kVA", 185000, 12, 45),
            new OpportuniteSeed("Électronique", "Kit solaire complet (panneau 100W + batterie + régulateur)", 95000, 20, 35),
            new OpportuniteSeed("Électronique", "Smartphone Android 4G 64 Go", 42000, 25, 30),
            new OpportuniteSeed("Électronique", "Ventilateur sur pied rechargeable", 25000, 30, 20),
            new OpportuniteSeed("Électronique", "Régulateur de tension pour réfrigérateur", 15000, 25, 18),
            new OpportuniteSeed("Électronique", "Lampe solaire rechargeable à panneau intégré", 7500, 60, 15),
            new OpportuniteSeed("Électronique", "Chargeur solaire portable multi-USB", 6000, 50, 14),

            // ── Alimentaire (denrées de base) ──
            new OpportuniteSeed("Alimentaire", "Sac de riz local Ganta-Digue 50kg", 27000, 20, 21),
            new OpportuniteSeed("Alimentaire", "Bidon d'huile de palme rouge 20L", 18000, 25, 18),
            new OpportuniteSeed("Alimentaire", "Carton de gari qualité supérieure 25kg", 12000, 30, 20),
            new OpportuniteSeed("Alimentaire", "Sac de farine de maïs 25kg", 9500, 35, 15),
            new OpportuniteSeed("Alimentaire", "Carton de sucre en morceaux 10kg", 8000, 40, 12),
            new OpportuniteSeed("Alimentaire", "Bidon de lait en poudre enrichi 2.5kg", 6500, 45, 14),
            new OpportuniteSeed("Alimentaire", "Sac d'igname séché (cossettes) 25kg", 14000, 25, 20),

            // ── Maison ──
            new OpportuniteSeed("Maison", "Matelas mousse haute densité 1m40", 45000, 15, 25),
            new OpportuniteSeed("Maison", "Réchaud à gaz 2 feux avec bouteille", 22000, 20, 20),
            new OpportuniteSeed("Maison", "Moustiquaire imprégnée grand lit", 5000, 60, 12),
            new OpportuniteSeed("Maison", "Batterie de cuisine en inox 12 pièces", 28000, 20, 22),
            new OpportuniteSeed("Maison", "Bidons d'eau potable 20L (lot de 10)", 3500, 80, 10),
            new OpportuniteSeed("Maison", "Ventilateur brasseur d'air industriel", 32000, 15, 25),

            // ── Beauté (cosmétiques locaux) ──
            new OpportuniteSeed("Beauté", "Beurre de karité brut du Nord 1kg", 4500, 50, 15),
            new OpportuniteSeed("Beauté", "Savon noir traditionnel artisanal (lot de 5)", 5500, 45, 14),
            new OpportuniteSeed("Beauté", "Huile de coco vierge pressée à froid 500ml", 4000, 50, 12),
            new OpportuniteSeed("Beauté", "Kit tresses / mèches synthétiques premium", 8000, 35, 18),
            new OpportuniteSeed("Beauté", "Gommage corporel au marc de café local", 3500, 55, 10),

            // ── Informatique ──
            new OpportuniteSeed("Informatique", "Ordinateur portable reconditionné Core i5", 165000, 10, 40),
            new OpportuniteSeed("Informatique", "Imprimante multifonction jet d'encre", 55000, 15, 30),
            new OpportuniteSeed("Informatique", "Clé USB 64 Go (lot de 3)", 7000, 40, 12),
            new OpportuniteSeed("Informatique", "Routeur Wi-Fi 4G portable", 28000, 20, 20),
            new OpportuniteSeed("Informatique", "Casque audio Bluetooth antibruit", 18000, 25, 18),

            // ── Véhicules (mobilité) ──
            new OpportuniteSeed("Véhicules", "Moto utilitaire 125cc neuve", 620000, 8, 60),
            new OpportuniteSeed("Véhicules", "Casque de moto homologué", 12000, 30, 20),
            new OpportuniteSeed("Véhicules", "Kit de pièces détachées moto (plaquettes + chaîne)", 15000, 25, 18),
            new OpportuniteSeed("Véhicules", "Pneu moto renforcé (la paire)", 22000, 20, 20),
            new OpportuniteSeed("Véhicules", "Vélo tout-terrain robuste", 75000, 15, 30),

            // ── Mobilier ──
            new OpportuniteSeed("Mobilier", "Salon en résine tressée (3 pièces)", 95000, 12, 35),
            new OpportuniteSeed("Mobilier", "Lot de 6 chaises plastiques empilables", 18000, 25, 18),
            new OpportuniteSeed("Mobilier", "Armoire métallique 2 portes", 42000, 15, 25),
            new OpportuniteSeed("Mobilier", "Table pliante de marché renforcée", 22000, 20, 20),

            // ── Sport ──
            new OpportuniteSeed("Sport", "Ballons de football officiels (lot de 10)", 45000, 15, 20),
            new OpportuniteSeed("Sport", "Tenue de sport complète (short + maillot)", 8000, 40, 15),
            new OpportuniteSeed("Sport", "Vélo d'appartement pliable", 65000, 12, 30)
        );

        for (OpportuniteSeed s : seeds) {
            CreerOpportuniteRequest req = new CreerOpportuniteRequest();
            req.setTitre(s.titre());
            req.setCategorie(s.categorie());
            req.setPrixNormal(BigDecimal.valueOf(s.prixNormal()));
            req.setSeuilMinimum(s.seuilMinimum());
            req.setDateExpiration(LocalDateTime.now().plusDays(s.joursExpiration()));
            req.setActif(true);
            req.setPaliers(palierDegressifs(s.prixNormal(), s.seuilMinimum()));
            opportuniteService.creer(admin.getId(), req);
        }
        log.info("=== {} opportunités d'achat groupé créées (sans image ni description — à compléter) ===", seeds.size());
    }

    /** Trois paliers de prix dégressifs (-8%, -15%, -22% par rapport au prix normal) selon le nombre de participants. */
    private List<CreerOpportuniteRequest.PalierPrixRequest> palierDegressifs(long prixNormal, int seuilMinimum) {
        int max1 = seuilMinimum;
        int max2 = seuilMinimum * 2;
        return List.of(
            palier(1, max1, arrondir5(Math.round(prixNormal * 0.92))),
            palier(max1 + 1, max2, arrondir5(Math.round(prixNormal * 0.85))),
            palier(max2 + 1, max2 * 5, arrondir5(Math.round(prixNormal * 0.78)))
        );
    }

    private long arrondir5(long valeur) {
        return Math.round(valeur / 5.0) * 5;
    }

    private CreerOpportuniteRequest.PalierPrixRequest palier(int seuilMin, int seuilMax, long prix) {
        CreerOpportuniteRequest.PalierPrixRequest p = new CreerOpportuniteRequest.PalierPrixRequest();
        p.setSeuilMin(seuilMin);
        p.setSeuilMax(seuilMax);
        p.setPrix(BigDecimal.valueOf(prix));
        return p;
    }

    // ── Bannières ─────────────────────────────────────────────────────────────

    private void seederBannieres() {
        List<Banniere> bannieres = List.of(
            // ── ACCUEIL ──
            Banniere.builder()
                .titre("L'union fait le prix.")
                .description("Regroupez-vous avec d'autres acheteurs et accédez aux tarifs de gros. Plus on est nombreux, plus on économise.")
                .tag("Achat Groupé").icone("ti-users-group")
                .imageUrl("https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80")
                .pageCible(PageCible.ACCUEIL).lien("/opportunites").ordre(0).actif(true).build(),
            Banniere.builder()
                .titre("Répondez. Encaissez.")
                .description("Donnez votre avis sur des produits et services, et recevez une récompense directement dans votre portefeuille.")
                .tag("Sondages Rémunérés").icone("ti-clipboard-check")
                .imageUrl("https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80")
                .pageCible(PageCible.ACCUEIL).lien("/sondages").ordre(1).actif(true).build(),
            Banniere.builder()
                .titre("Vos gains, votre contrôle.")
                .description("Rechargez votre solde, financez vos achats groupés, retirez vos récompenses — tout depuis une seule application.")
                .tag("Portefeuille Intégré").icone("ti-wallet")
                .imageUrl("https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80")
                .pageCible(PageCible.ACCUEIL).lien("/portefeuille").ordre(2).actif(true).build(),
            // ── CATALOGUE ──
            Banniere.builder()
                .titre("Plus on est nombreux, moins on paie.")
                .description("Rejoignez un groupe d'acheteurs et accédez aux prix de gros réservés aux professionnels.")
                .tag("Achat groupé").icone("ti-users-group")
                .imageUrl("https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80")
                .pageCible(PageCible.CATALOGUE).ordre(0).actif(true).build(),
            Banniere.builder()
                .titre("Des économies jusqu'à -40% sur vos produits.")
                .description("Électronique, maison, alimentaire — toutes les catégories sont représentées.")
                .tag("Offres flash").icone("ti-bolt")
                .imageUrl("https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200&q=80")
                .pageCible(PageCible.CATALOGUE).ordre(1).actif(true).build(),
            Banniere.builder()
                .titre("Votre argent est protégé à 100%.")
                .description("Remboursement garanti si l'achat groupé n'atteint pas son seuil minimum.")
                .tag("Paiement sécurisé").icone("ti-shield-check")
                .imageUrl("https://images.unsplash.com/photo-1556742111-a301076d9d18?w=1200&q=80")
                .pageCible(PageCible.CATALOGUE).ordre(2).actif(true).build(),
            // ── SONDAGES ──
            Banniere.builder()
                .titre("Votre avis vaut de l'argent.")
                .description("Répondez à des sondages en quelques minutes et recevez entre 500 et 5 000 FCFA directement dans votre wallet.")
                .tag("Sondages rémunérés").icone("ti-clipboard-check")
                .imageUrl("https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?w=1200&q=80")
                .pageCible(PageCible.SONDAGES).ordre(0).actif(true).build(),
            Banniere.builder()
                .titre("Payé immédiatement après chaque réponse.")
                .description("Dès votre sondage validé, la récompense est créditée sur votre portefeuille OpportuniHub.")
                .tag("Récompenses instantanées").icone("ti-coin")
                .imageUrl("https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=1200&q=80")
                .pageCible(PageCible.SONDAGES).ordre(1).actif(true).build(),
            Banniere.builder()
                .titre("Répondez en 2 à 5 minutes, n'importe où.")
                .description("Depuis votre téléphone, en déplacement ou chez vous — chaque minute compte.")
                .tag("Simple & rapide").icone("ti-device-mobile")
                .imageUrl("https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80")
                .pageCible(PageCible.SONDAGES).ordre(2).actif(true).build()
        );
        banniereRepository.saveAll(bannieres);
        log.info("=== {} bannières de démo créées ===", bannieres.size());
    }
}
