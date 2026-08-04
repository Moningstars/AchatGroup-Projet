package com.plateformeopportunites.common.config;

import com.plateformeopportunites.common.enums.*;
import com.plateformeopportunites.finance.entity.WalletPlateforme;
import com.plateformeopportunites.finance.repository.WalletPlateformeRepository;
import com.plateformeopportunites.identity.entity.Administrateur;
import com.plateformeopportunites.identity.repository.AdministrateurRepository;
import com.plateformeopportunites.opportunite.entity.Banniere;
import com.plateformeopportunites.opportunite.entity.Categorie;
import com.plateformeopportunites.opportunite.entity.Opportunite;
import com.plateformeopportunites.opportunite.entity.OpportuniteImage;
import com.plateformeopportunites.opportunite.entity.PalierPrix;
import com.plateformeopportunites.opportunite.repository.BanniereRepository;
import com.plateformeopportunites.opportunite.repository.CategorieRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteImageRepository;
import com.plateformeopportunites.opportunite.repository.OpportuniteRepository;
import com.plateformeopportunites.opportunite.repository.PalierPrixRepository;
import com.plateformeopportunites.sondage.dto.CreerEligibiliteRequest;
import com.plateformeopportunites.sondage.dto.CreerSondageRequest;
import com.plateformeopportunites.sondage.dto.SondageResponse;
import com.plateformeopportunites.sondage.repository.ResultatEligibiliteRepository;
import com.plateformeopportunites.sondage.repository.SondageEligibiliteRepository;
import com.plateformeopportunites.sondage.repository.SondageReponseRepository;
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
    private final CategorieRepository categorieRepository;
    private final OpportuniteRepository opportuniteRepository;
    private final PalierPrixRepository palierPrixRepository;
    private final OpportuniteImageRepository imageRepository;
    private final WalletPlateformeRepository walletPlateformeRepository;

    private final JdbcTemplate jdbcTemplate;
    private final BanniereRepository banniereRepository;

    // ── Sondage ──────────────────────────────────────────────────────────────
    private final SondageService sondageService;
    private final SondageRepository sondageRepository;
    private final SondageEligibiliteRepository sondageEligibiliteRepository;
    private final SondageReponseRepository sondageReponseRepository;
    private final ResultatEligibiliteRepository resultatEligibiliteRepository;

    @Override
    @Transactional
    public void run(String... args) {
        corrigerContraintesSchema();
        Administrateur admin = creerAdminSiAbsent();
        initialiserWalletPlateforme();
        if (opportuniteRepository.count() == 0) {
            seederOpportunites(admin);
        }
        // Toujours recréer les sondages de démo (purge + recréation complète)
        supprimerTousSondages();
        seederSondages(admin);
        if (banniereRepository.count() == 0) {
            seederBannieres();
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

    // ── Opportunités ──────────────────────────────────────────────────────────

    private Categorie cat(String nom, String icone) {
        return categorieRepository.findByNom(nom)
                .orElseGet(() -> categorieRepository.save(
                        Categorie.builder().nom(nom).icone(icone).build()));
    }

    private Opportunite creerOpp(Administrateur admin, Categorie categorie,
                                  String titre, String description,
                                  BigDecimal prixNormal, int seuilMin,
                                  int participants, int joursRestants) {
        Opportunite opp = Opportunite.builder()
                .admin(admin)
                .categorie(categorie)
                .titre(titre)
                .description(description)
                .prixNormal(prixNormal)
                .seuilMinimum(seuilMin)
                .dateExpiration(LocalDateTime.now().plusDays(joursRestants))
                .statut(StatutOpportunite.ACTIVE)
                .participantsActuels(participants)
                .createdAt(LocalDateTime.now())
                .build();
        return opportuniteRepository.save(opp);
    }

    private void addPalier(Opportunite opp, int min, int max, BigDecimal prix) {
        palierPrixRepository.save(PalierPrix.builder()
                .opportunite(opp).seuilMin(min).seuilMax(max).prix(prix).build());
    }

    private void addImage(Opportunite opp, String seed, String legende, int ordre) {
        imageRepository.save(OpportuniteImage.builder()
                .opportunite(opp)
                .url("https://picsum.photos/seed/" + seed + "/800/600")
                .legende(legende)
                .ordre(ordre)
                .createdAt(LocalDateTime.now())
                .build());
    }

    @Transactional
    protected void seederOpportunites(Administrateur admin) {
        log.info("=== Seeding 10 opportunités de démonstration ===");

        Categorie electronique  = cat("Électronique",  "📱");
        Categorie vehicules     = cat("Véhicules",     "🚗");
        Categorie maison        = cat("Maison",        "🏠");
        Categorie alimentaire   = cat("Alimentaire",   "🛒");
        Categorie informatique  = cat("Informatique",  "💻");
        Categorie beaute        = cat("Beauté",        "✨");
        Categorie mobilier      = cat("Mobilier",      "🪑");
        Categorie sport         = cat("Sport",         "⚽");

        // ── 1. DJI Mini 4 Pro ────────────────────────────────────────────────
        Opportunite drone = creerOpp(admin, electronique,
                "DJI Mini 4 Pro — Drone 4K HDR",
                "Drone compact avec caméra 4K HDR, stabilisation sur 3 axes, autonomie 34 min. Idéal pour les voyages et créateurs de contenu. Poids inférieur à 249 g, ne nécessite pas d'enregistrement.",
                new BigDecimal("485000"), 10, 7, 25);
        addPalier(drone,  1,  9, new BigDecimal("420000"));
        addPalier(drone, 10, 19, new BigDecimal("355000"));
        addPalier(drone, 20, 29, new BigDecimal("310000"));
        addPalier(drone, 30, 999, new BigDecimal("275000"));
        addImage(drone, "dji-drone-box",     "Boîte d'emballage avec dimensions",  0);
        addImage(drone, "dji-drone-storage", "Affichage stockage et accessoires",   1);
        addImage(drone, "dji-drone-case",    "Mallette de protection waterproof",   2);
        addImage(drone, "dji-drone-field",   "Utilisation terrain — en vol",        3);

        // ── 2. Trottinette électrique Xiaomi ────────────────────────────────
        Opportunite trottinette = creerOpp(admin, vehicules,
                "Xiaomi Electric Scooter 4 Pro",
                "Trottinette électrique avec autonomie de 55 km, vitesse max 25 km/h, moteur 700 W, pneus anti-crevaison 10 pouces. Pliable et légère.",
                new BigDecimal("195000"), 8, 12, 18);
        addPalier(trottinette,  1,  7, new BigDecimal("170000"));
        addPalier(trottinette,  8, 14, new BigDecimal("145000"));
        addPalier(trottinette, 15, 999, new BigDecimal("125000"));
        addImage(trottinette, "scooter-box",  "Trottinette pliée — vue de face",    0);
        addImage(trottinette, "scooter-ride", "En utilisation sur route",            1);
        addImage(trottinette, "scooter-fold", "Mécanisme de pliage compact",         2);
        addImage(trottinette, "scooter-app",  "Application de contrôle smartphone", 3);

        // ── 3. Robot aspirateur ECOVACS ────────────────────────────────────
        Opportunite robot = creerOpp(admin, maison,
                "ECOVACS DEEBOT T20 Pro — Robot Aspirateur",
                "Robot aspirateur et laveur 2-en-1. Aspiration 6000 Pa, navigation laser LIDAR, station de vidange automatique, compatible avec assistant vocal.",
                new BigDecimal("135000"), 10, 5, 30);
        addPalier(robot,  1,  9, new BigDecimal("118000"));
        addPalier(robot, 10, 19, new BigDecimal("98000"));
        addPalier(robot, 20, 999, new BigDecimal("82000"));
        addImage(robot, "robot-vacuum-top",    "Vue du dessus — détail capteur",  0);
        addImage(robot, "robot-vacuum-action", "En fonctionnement dans salon",    1);
        addImage(robot, "robot-vacuum-base",   "Station de charge et vidange",    2);
        addImage(robot, "robot-vacuum-map",    "Carte maison sur application",    3);

        // ── 4. Lot de courses premium ────────────────────────────────────────
        Opportunite courses = creerOpp(admin, alimentaire,
                "Lot de courses familiales — Panier Premium",
                "Panier de 25 kg comprenant huiles, farines, légumineuses, produits laitiers longue conservation et conserves. Sélection de marques premium livrée à domicile.",
                new BigDecimal("38500"), 20, 35, 10);
        addPalier(courses,  1, 19, new BigDecimal("34000"));
        addPalier(courses, 20, 49, new BigDecimal("28500"));
        addPalier(courses, 50, 999, new BigDecimal("24000"));
        addImage(courses, "grocery-basket",  "Contenu complet du panier",           0);
        addImage(courses, "grocery-fresh",   "Produits frais inclus",                1);
        addImage(courses, "grocery-dry",     "Épicerie sèche sélectionnée",          2);
        addImage(courses, "grocery-deliver", "Livraison à domicile en camion frigo", 3);

        // ── 5. MacBook Air M2 ───────────────────────────────────────────────
        Opportunite macbook = creerOpp(admin, informatique,
                "Apple MacBook Air M2 — 13 pouces 8 Go / 256 Go",
                "Ordinateur portable ultra-fin avec puce M2, écran Liquid Retina 13,6 pouces, autonomie jusqu'à 18 heures. Idéal pour les professionnels et étudiants.",
                new BigDecimal("895000"), 5, 3, 45);
        addPalier(macbook,  1,  4, new BigDecimal("780000"));
        addPalier(macbook,  5,  9, new BigDecimal("695000"));
        addPalier(macbook, 10, 999, new BigDecimal("640000"));
        addImage(macbook, "macbook-open",    "MacBook ouvert — affichage clavier",  0);
        addImage(macbook, "macbook-side",    "Profil ultra-fin",                    1);
        addImage(macbook, "macbook-ports",   "Ports USB-C et MagSafe",              2);
        addImage(macbook, "macbook-screen",  "Écran Retina — rendu couleurs",       3);

        // ── 6. Kit beauté L'Oréal ───────────────────────────────────────────
        Opportunite beaute_kit = creerOpp(admin, beaute,
                "Kit Beauté L'Oréal Paris — Soin Complet",
                "Kit de 12 produits comprenant sérum, crème de jour, nuit, contour des yeux, masques et soins hydratants. Coffret édition prestige.",
                new BigDecimal("48000"), 15, 18, 15);
        addPalier(beaute_kit,  1, 14, new BigDecimal("42000"));
        addPalier(beaute_kit, 15, 29, new BigDecimal("36000"));
        addPalier(beaute_kit, 30, 999, new BigDecimal("30000"));
        addImage(beaute_kit, "beauty-kit-full",  "Kit complet — 12 produits",        0);
        addImage(beaute_kit, "beauty-serum",     "Sérum hydratant — zoom texture",   1);
        addImage(beaute_kit, "beauty-cream",     "Crème de nuit régénérante",        2);
        addImage(beaute_kit, "beauty-packaging", "Coffret emballage cadeau",          3);

        // ── 7. Canapé d'angle ──────────────────────────────────────────────
        Opportunite canape = creerOpp(admin, mobilier,
                "Canapé d'angle convertible — 5 places",
                "Canapé d'angle modulable, tissu microfibre ultra-doux, méridienne réversible, coffre de rangement intégré. Disponible en gris anthracite et beige naturel.",
                new BigDecimal("345000"), 5, 2, 60);
        addPalier(canape,  1,  4, new BigDecimal("295000"));
        addPalier(canape,  5, 11, new BigDecimal("255000"));
        addPalier(canape, 12, 999, new BigDecimal("220000"));
        addImage(canape, "sofa-corner",    "Canapé en angle — vue d'ensemble",    0);
        addImage(canape, "sofa-fabric",    "Détail tissu microfibre",              1);
        addImage(canape, "sofa-storage",   "Coffre de rangement intégré",         2);
        addImage(canape, "sofa-room",      "Mise en scène salon moderne",         3);

        // ── 8. Vélo électrique ────────────────────────────────────────────
        Opportunite velo = creerOpp(admin, vehicules,
                "Vélo électrique Urbain — 250 W / 36 V",
                "Vélo électrique pliable avec moteur brushless 250 W, batterie 36 V 10 Ah (autonomie 60 km), écran LCD, freins à disque hydrauliques, poids 22 kg.",
                new BigDecimal("285000"), 8, 6, 35);
        addPalier(velo,  1,  7, new BigDecimal("245000"));
        addPalier(velo,  8, 14, new BigDecimal("210000"));
        addPalier(velo, 15, 999, new BigDecimal("185000"));
        addImage(velo, "ebike-side",    "Vélo électrique — profil complet",     0);
        addImage(velo, "ebike-display", "Écran LCD et commandes guidon",         1);
        addImage(velo, "ebike-motor",   "Moteur roue arrière brushless",         2);
        addImage(velo, "ebike-fold",    "Mécanisme de pliage — compact",         3);

        // ── 9. Samsung Smart TV 65" ─────────────────────────────────────────
        Opportunite tv = creerOpp(admin, electronique,
                "Samsung QLED 4K 65\" — Smart TV 2024",
                "Téléviseur QLED 4K 65 pouces avec Quantum Dot, HDR10+, 120 Hz, Tizen OS, 4 ports HDMI 2.1, son Dolby Atmos. Gaming mode & Multi-View inclus.",
                new BigDecimal("420000"), 12, 15, 20);
        addPalier(tv,  1, 11, new BigDecimal("370000"));
        addPalier(tv, 12, 24, new BigDecimal("320000"));
        addPalier(tv, 25, 999, new BigDecimal("278000"));
        addImage(tv, "samsung-tv-front",  "Samsung QLED — vue de face",           0);
        addImage(tv, "samsung-tv-angle",  "Angle pied design",                    1);
        addImage(tv, "samsung-tv-ports",  "Connectique HDMI et USB arrière",      2);
        addImage(tv, "samsung-tv-setup",  "Installation salon — ambiance",        3);

        // ── 10. Kit Yoga premium ────────────────────────────────────────────
        Opportunite yoga = creerOpp(admin, sport,
                "Kit Yoga Complet Premium — 8 accessoires",
                "Kit yoga professionnel : tapis TPE antidérapant 6 mm, 2 briques en mousse, sangle de stretching, roue de yoga, sac de transport, 2 balles de massage. Pour tous niveaux.",
                new BigDecimal("32000"), 20, 28, 12);
        addPalier(yoga,  1, 19, new BigDecimal("27500"));
        addPalier(yoga, 20, 39, new BigDecimal("22000"));
        addPalier(yoga, 40, 999, new BigDecimal("18500"));
        addImage(yoga, "yoga-mat-full",   "Kit complet posé sur tapis",           0);
        addImage(yoga, "yoga-mat-detail", "Texture tapis TPE antidérapant",       1);
        addImage(yoga, "yoga-blocks",     "Briques et sangle de stretching",      2);
        addImage(yoga, "yoga-session",    "Séance en cours — utilisation réelle", 3);

        log.info("=== 10 opportunités créées avec succès ===");
    }

    // ── Sondages ──────────────────────────────────────────────────────────────

    private void supprimerTousSondages() {
        resultatEligibiliteRepository.deleteAll();
        sondageReponseRepository.deleteAll();
        sondageEligibiliteRepository.deleteAll();
        sondageRepository.deleteAll();
        log.info("=== Anciens sondages purgés ===");
    }

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
