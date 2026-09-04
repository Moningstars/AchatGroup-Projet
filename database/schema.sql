--
-- PostgreSQL database dump
--

\restrict LjA0RHyYy24etWYT5YOAxIucdppGa4lmAHv5ggQTWlGA7VBSen9f5QtiSB4iXeQ

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_table_access_method = heap;

--
-- Name: administrateurs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administrateurs (
    derniere_connexion timestamp(6) without time zone,
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    niveau_acces character varying(255) NOT NULL,
    nom character varying(255) NOT NULL,
    CONSTRAINT administrateurs_niveau_acces_check CHECK (((niveau_acces)::text = ANY ((ARRAY['SUPER_ADMIN'::character varying, 'MODERATEUR'::character varying])::text[])))
);


--
-- Name: bannieres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bannieres (
    actif boolean NOT NULL,
    ordre integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    date_debut timestamp(6) without time zone,
    date_fin timestamp(6) without time zone,
    id uuid NOT NULL,
    description text,
    icone character varying(255),
    image_url character varying(255) NOT NULL,
    lien character varying(255),
    page_cible character varying(255) NOT NULL,
    tag character varying(255),
    titre character varying(255) NOT NULL,
    CONSTRAINT bannieres_page_cible_check CHECK (((page_cible)::text = ANY ((ARRAY['ACCUEIL'::character varying, 'CATALOGUE'::character varying, 'SONDAGES'::character varying, 'TOUTES'::character varying])::text[])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid NOT NULL,
    icone character varying(255),
    nom character varying(255) NOT NULL
);


--
-- Name: commanditaires; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commanditaires (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    nom character varying(255) NOT NULL,
    prenom character varying(255) NOT NULL,
    societe character varying(255),
    statut character varying(255) NOT NULL,
    telephone character varying(255) NOT NULL,
    CONSTRAINT commanditaires_statut_check CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'SUSPENDU'::character varying, 'EN_ATTENTE'::character varying])::text[])))
);


--
-- Name: fournisseurs; Type: TABLE; Schema: public; Owner: -
-- Fournisseurs de produits pour les opportunités. Les commanditaires restent réservés aux sondages.
--

CREATE TABLE public.fournisseurs (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    logo_url character varying(255),
    nom character varying(255) NOT NULL,
    reseaux_url character varying(255),
    societe character varying(255),
    statut character varying(255) NOT NULL,
    telephone character varying(255) NOT NULL,
    CONSTRAINT fournisseurs_statut_check CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'SUSPENDU'::character varying, 'EN_ATTENTE'::character varying])::text[])))
);


--
-- Name: infos_personnelles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.infos_personnelles (
    date_expiration_piece date,
    date_naissance date,
    id uuid NOT NULL,
    utilisateur_id uuid NOT NULL,
    adresse character varying(255),
    email character varying(255),
    lieu_naissance character varying(255),
    nationalite character varying(255),
    nom character varying(255) NOT NULL,
    numero_piece character varying(255),
    pays character varying(255),
    photo character varying(255),
    prenom character varying(255) NOT NULL,
    profession character varying(255),
    source_revenus character varying(255),
    type_piece character varying(255),
    ville character varying(255),
    CONSTRAINT infos_personnelles_source_revenus_check CHECK (((source_revenus)::text = ANY ((ARRAY['SALARIE'::character varying, 'INDEPENDANT'::character varying, 'ETUDIANT'::character varying, 'RETRAITE'::character varying, 'SANS_EMPLOI'::character varying, 'AUTRE'::character varying])::text[]))),
    CONSTRAINT infos_personnelles_type_piece_check CHECK (((type_piece)::text = ANY ((ARRAY['CNI'::character varying, 'PASSEPORT'::character varying, 'PERMIS_CONDUIRE'::character varying, 'TITRE_SEJOUR'::character varying])::text[])))
);


--
-- Name: opportunite_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunite_images (
    ordre integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    opportunite_id uuid NOT NULL,
    legende character varying(255),
    url character varying(255) NOT NULL
);


--
-- Name: opportunites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunites (
    participants_actuels integer NOT NULL,
    prix_normal numeric(38,2) NOT NULL,
    seuil_minimum integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    date_expiration timestamp(6) without time zone NOT NULL,
    admin_id uuid NOT NULL,
    categorie_id uuid,
    fournisseur_id uuid,
    id uuid NOT NULL,
    description text,
    specs_cas_usage text,
    specs_fine_print text,
    specs_points_forts text,
    statut character varying(255) NOT NULL,
    titre character varying(255) NOT NULL,
    CONSTRAINT opportunites_statut_check CHECK (((statut)::text = ANY ((ARRAY['BROUILLON'::character varying, 'ACTIVE'::character varying, 'CLOTUREE'::character varying, 'ANNULEE'::character varying])::text[])))
);


--
-- Name: options_eligibilite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.options_eligibilite (
    est_correcte boolean NOT NULL,
    ordre integer NOT NULL,
    id uuid NOT NULL,
    question_eligibilite_id uuid NOT NULL,
    libelle character varying(255) NOT NULL
);


--
-- Name: options_reponse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.options_reponse (
    ordre integer NOT NULL,
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    libelle character varying(255) NOT NULL
);


--
-- Name: otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otps (
    utilise boolean NOT NULL,
    code character varying(6) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    expires_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    identifiant character varying(255) NOT NULL
);


--
-- Name: paiements_paygate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paiements_paygate (
    montant numeric(38,2) NOT NULL,
    confirmed_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    utilisateur_id uuid NOT NULL,
    identifier character varying(255) NOT NULL,
    network character varying(255) NOT NULL,
    payment_reference character varying(255),
    statut character varying(255) NOT NULL,
    telephone character varying(255) NOT NULL,
    tx_reference character varying(255),
    CONSTRAINT paiements_paygate_statut_check CHECK (((statut)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'CONFIRME'::character varying, 'ECHOUE'::character varying])::text[])))
);


--
-- Name: paliers_prix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paliers_prix (
    prix numeric(38,2) NOT NULL,
    seuil_max integer NOT NULL,
    seuil_min integer NOT NULL,
    id uuid NOT NULL,
    opportunite_id uuid NOT NULL
);


--
-- Name: participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participants (
    profil_complete boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    niveau_verification character varying(255) NOT NULL,
    nom character varying(255) NOT NULL,
    operateur_mobile character varying(255) NOT NULL,
    push_token character varying(255),
    statut character varying(255) NOT NULL,
    telephone character varying(255) NOT NULL,
    CONSTRAINT participants_niveau_verification_check CHECK (((niveau_verification)::text = ANY ((ARRAY['AUCUN'::character varying, 'QUESTIONS_FILTRES'::character varying, 'PREUVE_DOCUMENT'::character varying])::text[]))),
    CONSTRAINT participants_operateur_mobile_check CHECK (((operateur_mobile)::text = ANY ((ARRAY['MOOV'::character varying, 'YAS'::character varying, 'FLOOZ'::character varying])::text[]))),
    CONSTRAINT participants_statut_check CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'SUSPENDU'::character varying, 'EN_ATTENTE'::character varying])::text[])))
);


--
-- Name: participations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participations (
    montant_gele numeric(38,2) NOT NULL,
    quantite integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    opportunite_id uuid NOT NULL,
    transaction_id uuid,
    utilisateur_id uuid NOT NULL,
    creneau_traitement timestamp(6) without time zone,
    date_confirmation_participant timestamp(6) without time zone,
    date_expedition timestamp(6) without time zone,
    date_livraison_prevue timestamp(6) without time zone,
    date_preparation timestamp(6) without time zone,
    date_remise timestamp(6) without time zone,
    priorite_traitement boolean DEFAULT false,
    adresse_livraison character varying(255),
    commentaire_participant_livraison character varying(500),
    note_livraison character varying(500),
    note_traitement character varying(500),
    reference_livraison character varying(120),
    statut_livraison character varying(255) DEFAULT 'EN_ATTENTE_QUOTA'::character varying,
    transporteur character varying(120),
    statut character varying(255) NOT NULL,
    CONSTRAINT participations_statut_livraison_check CHECK (((statut_livraison)::text = ANY ((ARRAY['EN_ATTENTE_QUOTA'::character varying, 'A_PREPARER'::character varying, 'PREPARATION'::character varying, 'PRET_LIVRAISON'::character varying, 'EN_LIVRAISON'::character varying, 'LIVRE_A_CONFIRMER'::character varying, 'LIVRE_CONFIRME'::character varying, 'ECHEC_LIVRAISON'::character varying, 'LITIGE'::character varying, 'ANNULE'::character varying])::text[]))),
    CONSTRAINT participations_statut_check CHECK (((statut)::text = ANY ((ARRAY['EN_ATTENTE'::character varying, 'CONFIRMEE'::character varying, 'REMBOURSEE'::character varying])::text[])))
);

-- Les tentatives échouées restent séparées des participations : une ligne dans
-- cette table n'implique ni dépôt gelé, ni réservation d'unité.
CREATE TABLE public.tentatives_souscription (
    id uuid NOT NULL,
    opportunite_id uuid NOT NULL,
    utilisateur_id uuid NOT NULL,
    quantite integer NOT NULL,
    motif character varying(40) NOT NULL,
    detail character varying(500) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    CONSTRAINT tentatives_souscription_pkey PRIMARY KEY (id)
);

CREATE INDEX tentatives_souscription_created_idx ON public.tentatives_souscription (created_at DESC);
CREATE INDEX tentatives_souscription_opportunite_idx ON public.tentatives_souscription (opportunite_id);


--
-- Name: portefeuilles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portefeuilles (
    solde_disponible numeric(38,2) NOT NULL,
    solde_gele numeric(38,2) NOT NULL,
    solde_points numeric(38,2) NOT NULL,
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    utilisateur_id uuid NOT NULL,
    devise character varying(255) NOT NULL
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    obligatoire boolean NOT NULL,
    ordre integer NOT NULL,
    id uuid NOT NULL,
    sondage_id uuid NOT NULL,
    texte text NOT NULL,
    type_question character varying(255) NOT NULL,
    CONSTRAINT questions_type_question_check CHECK (((type_question)::text = ANY ((ARRAY['CHOIX_UNIQUE'::character varying, 'CHOIX_MULTIPLE'::character varying, 'OUI_NON'::character varying, 'TEXTE_LIBRE'::character varying])::text[])))
);


--
-- Name: questions_eligibilite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions_eligibilite (
    obligatoire boolean NOT NULL,
    ordre integer NOT NULL,
    id uuid NOT NULL,
    sondage_eligibilite_id uuid NOT NULL,
    reponse_attendue character varying(255),
    texte text NOT NULL,
    type_question character varying(255) NOT NULL,
    CONSTRAINT questions_eligibilite_type_question_check CHECK (((type_question)::text = ANY ((ARRAY['CHOIX_UNIQUE'::character varying, 'CHOIX_MULTIPLE'::character varying, 'OUI_NON'::character varying, 'TEXTE_LIBRE'::character varying])::text[])))
);


--
-- Name: reponses_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reponses_detail (
    id uuid NOT NULL,
    option_reponse_id uuid,
    question_id uuid NOT NULL,
    sondage_reponse_id uuid NOT NULL,
    valeur_texte character varying(255)
);


--
-- Name: resultats_eligibilite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resultats_eligibilite (
    est_eligible boolean NOT NULL,
    taux_obtenu numeric(38,2) NOT NULL,
    passee_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    sondage_eligibilite_id uuid NOT NULL,
    utilisateur_id uuid NOT NULL
);


--
-- Name: sondages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sondages (
    budget_libere boolean DEFAULT false,
    budget_distribue numeric(15,2),
    budget_reserve numeric(15,2),
    quota_vise integer NOT NULL,
    recompense numeric(38,2) NOT NULL,
    repondants_actuels integer NOT NULL,
    seuil_eligibilite numeric(38,2) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    date_expiration timestamp(6) without time zone NOT NULL,
    admin_id uuid NOT NULL,
    commanditaire_id uuid,
    id uuid NOT NULL,
    description text,
    mode_distribution character varying(255) NOT NULL,
    niveau_verification character varying(255) NOT NULL,
    statut character varying(255) NOT NULL,
    titre character varying(255) NOT NULL,
    type_recompense character varying(255) NOT NULL,
    CONSTRAINT sondages_mode_distribution_check CHECK (((mode_distribution)::text = ANY ((ARRAY['AUTO'::character varying, 'MANUEL'::character varying])::text[]))),
    CONSTRAINT sondages_statut_check CHECK (((statut)::text = ANY ((ARRAY['BROUILLON'::character varying, 'ACTIF'::character varying, 'EN_ATTENTE_DISTRIBUTION'::character varying, 'CLOTURE'::character varying, 'ANNULE'::character varying])::text[]))),
    CONSTRAINT sondages_type_recompense_check CHECK (((type_recompense)::text = ANY ((ARRAY['ARGENT'::character varying, 'POINTS'::character varying])::text[])))
);


--
-- Name: sondages_eligibilite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sondages_eligibilite (
    nombre_questions integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    sondage_id uuid NOT NULL,
    titre character varying(255) NOT NULL
);


--
-- Name: sondages_reponses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sondages_reponses (
    recompense_versee boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    validee_at timestamp(6) without time zone,
    id uuid NOT NULL,
    sondage_id uuid NOT NULL,
    utilisateur_id uuid NOT NULL,
    fichier_preuve character varying(255),
    statut_validation character varying(255) NOT NULL,
    CONSTRAINT sondages_reponses_statut_validation_check CHECK (((statut_validation)::text = ANY ((ARRAY['VALIDE'::character varying, 'EN_ATTENTE_PREUVE'::character varying, 'REJETE'::character varying])::text[])))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    montant numeric(38,2) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    utilisateur_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    coordonnees character varying(255),
    moyen_paiement character varying(255),
    reference character varying(255),
    statut character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    CONSTRAINT transactions_statut_check CHECK (((statut)::text = ANY ((ARRAY['EN_COURS'::character varying, 'SUCCESS'::character varying, 'ECHEC'::character varying])::text[]))),
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY ((ARRAY['DEPOT'::character varying, 'GEL'::character varying, 'DEBIT'::character varying, 'REMBOURSEMENT'::character varying, 'RECOMPENSE'::character varying, 'RETRAIT'::character varying, 'CONVERSION_POINTS'::character varying])::text[])))
);


--
-- Name: transactions_plateforme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions_plateforme (
    montant numeric(38,2) NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    admin_id uuid,
    id uuid NOT NULL,
    sondage_id uuid,
    mode_distribution character varying(255),
    statut character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    CONSTRAINT transactions_plateforme_mode_distribution_check CHECK (((mode_distribution)::text = ANY ((ARRAY['AUTO'::character varying, 'MANUEL'::character varying])::text[]))),
    CONSTRAINT transactions_plateforme_statut_check CHECK (((statut)::text = ANY ((ARRAY['EN_COURS'::character varying, 'SUCCESS'::character varying, 'ECHEC'::character varying])::text[]))),
    CONSTRAINT transactions_plateforme_type_check CHECK (((type)::text = ANY ((ARRAY['ALIMENTATION'::character varying, 'DISTRIBUTION_AUTO'::character varying, 'DISTRIBUTION_MANUELLE'::character varying, 'RESERVATION_BUDGET'::character varying, 'LIBERATION_BUDGET'::character varying])::text[])))
);


--
-- Name: utilisateurs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.utilisateurs (
    profil_complete boolean NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    id uuid NOT NULL,
    mot_de_passe character varying(255),
    niveau_verification character varying(255) NOT NULL,
    nom character varying(255),
    operateur_mobile character varying(255),
    push_token character varying(255),
    statut character varying(255) NOT NULL,
    telephone character varying(255),
    CONSTRAINT utilisateurs_operateur_mobile_check CHECK (((operateur_mobile)::text = ANY ((ARRAY['MOOV'::character varying, 'YAS'::character varying, 'FLOOZ'::character varying])::text[]))),
    CONSTRAINT utilisateurs_statut_check CHECK (((statut)::text = ANY ((ARRAY['ACTIF'::character varying, 'SUSPENDU'::character varying, 'EN_ATTENTE'::character varying])::text[])))
);


--
-- Name: wallet_plateforme; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_plateforme (
    solde_plateforme numeric(38,2) NOT NULL,
    solde_points numeric(38,2) NOT NULL,
    solde_reserve numeric(38,2) NOT NULL,
    taux_conversion_points numeric(38,2),
    updated_at timestamp(6) without time zone,
    id uuid NOT NULL,
    devise character varying(255) NOT NULL
);


--
-- Name: administrateurs administrateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrateurs
    ADD CONSTRAINT administrateurs_email_key UNIQUE (email);


--
-- Name: administrateurs administrateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administrateurs
    ADD CONSTRAINT administrateurs_pkey PRIMARY KEY (id);


--
-- Name: bannieres bannieres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bannieres
    ADD CONSTRAINT bannieres_pkey PRIMARY KEY (id);


--
-- Name: categories categories_nom_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_nom_key UNIQUE (nom);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: commanditaires commanditaires_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commanditaires
    ADD CONSTRAINT commanditaires_email_key UNIQUE (email);


--
-- Name: commanditaires commanditaires_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commanditaires
    ADD CONSTRAINT commanditaires_pkey PRIMARY KEY (id);


--
-- Name: commanditaires commanditaires_telephone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commanditaires
    ADD CONSTRAINT commanditaires_telephone_key UNIQUE (telephone);


--
-- Name: fournisseurs fournisseurs_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_email_key UNIQUE (email);

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_telephone_key UNIQUE (telephone);

ALTER TABLE ONLY public.fournisseurs
    ADD CONSTRAINT fournisseurs_pkey PRIMARY KEY (id);


--
-- Name: infos_personnelles infos_personnelles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infos_personnelles
    ADD CONSTRAINT infos_personnelles_email_key UNIQUE (email);


--
-- Name: infos_personnelles infos_personnelles_numero_piece_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infos_personnelles
    ADD CONSTRAINT infos_personnelles_numero_piece_key UNIQUE (numero_piece);


--
-- Name: infos_personnelles infos_personnelles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infos_personnelles
    ADD CONSTRAINT infos_personnelles_pkey PRIMARY KEY (id);


--
-- Name: infos_personnelles infos_personnelles_utilisateur_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infos_personnelles
    ADD CONSTRAINT infos_personnelles_utilisateur_id_key UNIQUE (utilisateur_id);


--
-- Name: opportunite_images opportunite_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunite_images
    ADD CONSTRAINT opportunite_images_pkey PRIMARY KEY (id);


--
-- Name: opportunites opportunites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT opportunites_pkey PRIMARY KEY (id);


--
-- Name: options_eligibilite options_eligibilite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.options_eligibilite
    ADD CONSTRAINT options_eligibilite_pkey PRIMARY KEY (id);


--
-- Name: options_reponse options_reponse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.options_reponse
    ADD CONSTRAINT options_reponse_pkey PRIMARY KEY (id);


--
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_pkey PRIMARY KEY (id);


--
-- Name: paiements_paygate paiements_paygate_identifier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paiements_paygate
    ADD CONSTRAINT paiements_paygate_identifier_key UNIQUE (identifier);


--
-- Name: paiements_paygate paiements_paygate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paiements_paygate
    ADD CONSTRAINT paiements_paygate_pkey PRIMARY KEY (id);


--
-- Name: paliers_prix paliers_prix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paliers_prix
    ADD CONSTRAINT paliers_prix_pkey PRIMARY KEY (id);


--
-- Name: participants participants_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_email_key UNIQUE (email);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: participants participants_telephone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_telephone_key UNIQUE (telephone);


--
-- Name: participations participations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participations
    ADD CONSTRAINT participations_pkey PRIMARY KEY (id);


--
-- Name: portefeuilles portefeuilles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portefeuilles
    ADD CONSTRAINT portefeuilles_pkey PRIMARY KEY (id);


--
-- Name: portefeuilles portefeuilles_utilisateur_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portefeuilles
    ADD CONSTRAINT portefeuilles_utilisateur_id_key UNIQUE (utilisateur_id);


--
-- Name: questions_eligibilite questions_eligibilite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions_eligibilite
    ADD CONSTRAINT questions_eligibilite_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: reponses_detail reponses_detail_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponses_detail
    ADD CONSTRAINT reponses_detail_pkey PRIMARY KEY (id);


--
-- Name: resultats_eligibilite resultats_eligibilite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultats_eligibilite
    ADD CONSTRAINT resultats_eligibilite_pkey PRIMARY KEY (id);


--
-- Name: resultats_eligibilite resultats_eligibilite_utilisateur_id_sondage_eligibilite_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultats_eligibilite
    ADD CONSTRAINT resultats_eligibilite_utilisateur_id_sondage_eligibilite_id_key UNIQUE (utilisateur_id, sondage_eligibilite_id);


--
-- Name: sondages_eligibilite sondages_eligibilite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages_eligibilite
    ADD CONSTRAINT sondages_eligibilite_pkey PRIMARY KEY (id);


--
-- Name: sondages_eligibilite sondages_eligibilite_sondage_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages_eligibilite
    ADD CONSTRAINT sondages_eligibilite_sondage_id_key UNIQUE (sondage_id);


--
-- Name: sondages sondages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages
    ADD CONSTRAINT sondages_pkey PRIMARY KEY (id);


--
-- Name: sondages_reponses sondages_reponses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages_reponses
    ADD CONSTRAINT sondages_reponses_pkey PRIMARY KEY (id);


--
-- Name: sondages_reponses sondages_reponses_utilisateur_id_sondage_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages_reponses
    ADD CONSTRAINT sondages_reponses_utilisateur_id_sondage_id_key UNIQUE (utilisateur_id, sondage_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions_plateforme transactions_plateforme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions_plateforme
    ADD CONSTRAINT transactions_plateforme_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_telephone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_telephone_key UNIQUE (telephone);


--
-- Name: wallet_plateforme wallet_plateforme_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_plateforme
    ADD CONSTRAINT wallet_plateforme_pkey PRIMARY KEY (id);


--
-- Name: reponses_detail fk13a53vb22cls447h7wbpkvl33; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponses_detail
    ADD CONSTRAINT fk13a53vb22cls447h7wbpkvl33 FOREIGN KEY (option_reponse_id) REFERENCES public.options_reponse(id);


--
-- Name: questions_eligibilite fk6ku4y19rjfwfblubm83gm4uuo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions_eligibilite
    ADD CONSTRAINT fk6ku4y19rjfwfblubm83gm4uuo FOREIGN KEY (sondage_eligibilite_id) REFERENCES public.sondages_eligibilite(id);


--
-- Name: sondages_reponses fk7n75ubos6tt1d1rmla2n2pa2; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages_reponses
    ADD CONSTRAINT fk7n75ubos6tt1d1rmla2n2pa2 FOREIGN KEY (sondage_id) REFERENCES public.sondages(id);


--
-- Name: resultats_eligibilite fk9ff29p02c4y9fygue6tucr4qw; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultats_eligibilite
    ADD CONSTRAINT fk9ff29p02c4y9fygue6tucr4qw FOREIGN KEY (sondage_eligibilite_id) REFERENCES public.sondages_eligibilite(id);


--
-- Name: sondages_eligibilite fk9yb6015taa393vnhn8i9jhwoe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages_eligibilite
    ADD CONSTRAINT fk9yb6015taa393vnhn8i9jhwoe FOREIGN KEY (sondage_id) REFERENCES public.sondages(id);


--
-- Name: reponses_detail fkd1obg4dystdpp1iv4bgc881w7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponses_detail
    ADD CONSTRAINT fkd1obg4dystdpp1iv4bgc881w7 FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: questions fkd5hr6a8j8to8pk4l80soovtk4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT fkd5hr6a8j8to8pk4l80soovtk4 FOREIGN KEY (sondage_id) REFERENCES public.sondages(id);


--
-- Name: sondages_reponses fkdnnjhdlnjngmysg92b8fm1g88; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages_reponses
    ADD CONSTRAINT fkdnnjhdlnjngmysg92b8fm1g88 FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id);


--
-- Name: sondages fkedbiitohu5gv2cjqf96ho0lio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sondages
    ADD CONSTRAINT fkedbiitohu5gv2cjqf96ho0lio FOREIGN KEY (admin_id) REFERENCES public.administrateurs(id);


--
-- Name: infos_personnelles fkf4tivhixumxj7ktav1cgeuo7w; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.infos_personnelles
    ADD CONSTRAINT fkf4tivhixumxj7ktav1cgeuo7w FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id);


--
-- Name: opportunites fkgm51hh1hcm5m3x6duheydvwlp; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT fkgm51hh1hcm5m3x6duheydvwlp FOREIGN KEY (categorie_id) REFERENCES public.categories(id);

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT opportunites_fournisseur_fk FOREIGN KEY (fournisseur_id) REFERENCES public.fournisseurs(id);


--
-- Name: opportunite_images fkhpns4phq8fuuiy2aqvj8hyduw; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunite_images
    ADD CONSTRAINT fkhpns4phq8fuuiy2aqvj8hyduw FOREIGN KEY (opportunite_id) REFERENCES public.opportunites(id);


--
-- Name: options_reponse fkk1i87463luthfx54ppegpqnmx; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.options_reponse
    ADD CONSTRAINT fkk1i87463luthfx54ppegpqnmx FOREIGN KEY (question_id) REFERENCES public.questions(id);


--
-- Name: opportunites fkl15a5qa8mdi7acd5cyk6eqxmi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunites
    ADD CONSTRAINT fkl15a5qa8mdi7acd5cyk6eqxmi FOREIGN KEY (admin_id) REFERENCES public.administrateurs(id);


--
-- Name: participations fkl23uedf68lt3cmpm1tcwybomv; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participations
    ADD CONSTRAINT fkl23uedf68lt3cmpm1tcwybomv FOREIGN KEY (opportunite_id) REFERENCES public.opportunites(id);


--
-- Name: reponses_detail fklacou4prwoa1b62askr6kri42; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reponses_detail
    ADD CONSTRAINT fklacou4prwoa1b62askr6kri42 FOREIGN KEY (sondage_reponse_id) REFERENCES public.sondages_reponses(id);


--
-- Name: options_eligibilite fkm5yk48wilu35omxa86oew0qy3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.options_eligibilite
    ADD CONSTRAINT fkm5yk48wilu35omxa86oew0qy3 FOREIGN KEY (question_eligibilite_id) REFERENCES public.questions_eligibilite(id);


--
-- Name: paliers_prix fkobuun4ak9nb160yychch4hmq3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paliers_prix
    ADD CONSTRAINT fkobuun4ak9nb160yychch4hmq3 FOREIGN KEY (opportunite_id) REFERENCES public.opportunites(id);


--
-- Name: portefeuilles fkorspbj0c9d8u8alv7m8tlmxhx; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portefeuilles
    ADD CONSTRAINT fkorspbj0c9d8u8alv7m8tlmxhx FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id);


--
-- Name: participations fkp0n0du82ikr2v8bwnnt2bugo3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participations
    ADD CONSTRAINT fkp0n0du82ikr2v8bwnnt2bugo3 FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id);


--
-- Name: resultats_eligibilite fkp6j278rlxg6em3hk8ljrj0rrw; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resultats_eligibilite
    ADD CONSTRAINT fkp6j278rlxg6em3hk8ljrj0rrw FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id);

ALTER TABLE ONLY public.tentatives_souscription
    ADD CONSTRAINT tentatives_souscription_opportunite_fk FOREIGN KEY (opportunite_id) REFERENCES public.opportunites(id);

ALTER TABLE ONLY public.tentatives_souscription
    ADD CONSTRAINT tentatives_souscription_utilisateur_fk FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id);


--
-- PostgreSQL database dump complete
--

\unrestrict LjA0RHyYy24etWYT5YOAxIucdppGa4lmAHv5ggQTWlGA7VBSen9f5QtiSB4iXeQ
