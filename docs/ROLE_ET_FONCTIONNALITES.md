# OpportuniHub — rôle du logiciel et fonctionnalités

## 1. Rôle du logiciel

OpportuniHub est une plateforme web de gestion d'achats groupés et de sondages rémunérés.

Son objectif est de mettre en relation :

- des participants, qui peuvent consulter des opportunités d'achat groupé, participer à des sondages, gérer leur profil et leur portefeuille ;
- des administrateurs, qui pilotent les opportunités, les participants, les sondages, les validations KYC, les transactions, les retraits et les contenus affichés ;
- des fournisseurs, qui approvisionnent les produits proposés dans les opportunités d'achat groupé ;
- des commanditaires, qui financent ou sponsorisent exclusivement les sondages.

Le logiciel sert donc à centraliser l'ensemble du cycle opérationnel :

1. publication d'une opportunité ou d'un sondage ;
2. participation des utilisateurs ;
3. suivi de l'avancement ;
4. validation administrative ;
5. traitement financier ;
6. reporting et export des données utiles.

En clair : c'est un outil métier pour organiser des achats groupés, récompenser des participations à des sondages, suivre les utilisateurs, et donner à l'administrateur un tableau de bord de pilotage.

## 2. Architecture fonctionnelle

La solution est composée de trois grandes parties :

- une interface publique/participant : application React/Vite destinée aux utilisateurs ;
- une interface d'administration : back-office React/Vite destiné aux administrateurs ;
- une API backend : application Java Spring Boot qui gère la logique métier, l'authentification, la base de données, les fichiers et les flux temps réel.

Les données sont stockées dans PostgreSQL. Redis est utilisé comme service de support, notamment pour les besoins de cache, d'état ou de traitement rapide selon l'évolution de l'application.

## 3. Fonctionnalités côté participant

### Authentification et profil

- Connexion/identification utilisateur.
- Vérification par token Firebase Phone Auth.
- Complétion du profil participant.
- Définition du mot de passe.
- Déconnexion.
- Gestion du profil KYC.

### Opportunités d'achat groupé

- Consultation des opportunités disponibles.
- Affichage du détail d'une opportunité.
- Suivi de l'avancement d'une opportunité : nombre de participants, objectif, statut, prix et expiration.
- Souscription/participation à une opportunité.
- Consultation de ses propres participations.

### Sondages

- Consultation des sondages actifs.
- Affichage du détail d'un sondage.
- Vérification de l'éligibilité.
- Réponse aux questions.
- Envoi éventuel de preuve justificative.
- Consultation de ses participations aux sondages.

### Portefeuille

- Consultation du solde.
- Recharge du portefeuille.
- Demande de retrait.
- Consultation de l'historique des transactions.
- Conversion de points en solde monétaire selon le taux configuré.

## 4. Fonctionnalités côté administration

### Tableau de bord

- Vue d'ensemble des indicateurs de la plateforme.
- Statistiques globales.
- Suivi des activités importantes.
- Flux temps réel pour certaines informations d'administration.

### Gestion des opportunités

- Liste des opportunités.
- Création d'une nouvelle opportunité.
- Modification d'une opportunité.
- Activation ou clôture d'une opportunité.
- Gestion des images associées.
- Génération de spécifications par IA si la clé Gemini est configurée.
- Consultation des participants à une opportunité.
- Remboursement d'une participation.

Une interface de détail avancée a été ajoutée pour faciliter le travail de l'administrateur. Elle permet notamment :

- d'afficher les informations complètes de l'opportunité ;
- de voir le prix normal, le prix actuel et les paliers de prix ;
- de suivre le nombre de participants, le seuil, la progression et l'expiration ;
- de consulter les participants liés à l'opportunité ;
- de filtrer les participants par statut, créneau ou recherche ;
- de sélectionner les participants à traiter ;
- de planifier un traitement aujourd'hui, demain ou à une date précise ;
- d'ajouter une note de traitement ;
- d'exporter la liste filtrée ou sélectionnée en CSV.

Elle intègre maintenant un vrai processus de suivi livraison :

- suivi séparé du statut financier et du statut logistique ;
- statut livraison par participant : quota non validé, à préparer, préparation, prêt, en livraison, remis à confirmer, reçu confirmé, échec, litige ou annulé ;
- pourcentage de complétion logistique calculé à partir de l'étape courante ;
- sélection de participants prioritaires ;
- actions groupées pour faire avancer un lot de participants ;
- planification d'un créneau de traitement ou de livraison ;
- renseignement du transporteur, de la référence de livraison, de l'adresse et des notes logistiques ;
- affichage des confirmations de réception participant ;
- identification visuelle des litiges et échecs de livraison.

Ce choix évite de mélanger deux réalités différentes : une participation peut être confirmée financièrement sans être encore livrée, et une livraison peut nécessiter une confirmation participant avant d'être considérée terminée.

### Gestion des sondages

- Création et modification de sondages.
- Activation et clôture.
- Configuration de l'éligibilité.
- Consultation des réponses à valider.
- Validation de réponses.
- Distribution de récompenses.
- Consultation des répondants.
- Consultation des résultats statistiques.
- Suppression d'un sondage.

### Gestion des utilisateurs

- Liste des utilisateurs.
- Consultation du détail d'un utilisateur.
- Activation ou suspension.
- Vérification administrative.
- Suppression.

### KYC

- Liste des demandes KYC en attente.
- Consultation d'un dossier utilisateur.
- Approbation ou rejet d'un dossier KYC.

### Portefeuille et transactions

- Consultation du portefeuille plateforme.
- Alimentation du portefeuille plateforme.
- Configuration du taux de conversion.
- Ajustement du solde utilisateur.
- Consultation des transactions.
- Traitement des retraits en attente.
- Approbation ou rejet de retraits.

### Fournisseurs

- Liste des fournisseurs de produits.
- Création, activation ou suspension d'un fournisseur.
- Liaison d'un fournisseur à une opportunité avec préremplissage de son identité, son logo et son lien public.

### Commanditaires de sondages

- Liste des commanditaires de sondages.
- Création, activation ou suspension d'un commanditaire.
- Liaison d'un commanditaire uniquement aux sondages.

### Bannières

- Liste des bannières.
- Création de bannières avec image.
- Modification.
- Activation/désactivation.
- Suppression.
- Affichage côté participant via l'API publique.

## 5. Paiement et services externes

Le logiciel prévoit plusieurs intégrations externes :

- PayGate pour les recharges et webhooks de paiement ;
- Firebase Admin SDK pour la vérification des tokens d'authentification téléphone ;
- Pusher pour certaines fonctionnalités temps réel privées ;
- OVH SMS si la configuration SMS est activée ;
- Gemini API pour la génération assistée de spécifications.

Ces services doivent être configurés avec de vraies clés avant un déploiement de production.

## 6. Technologies principales

- Backend : Java 21, Spring Boot 3.3.5, Maven multi-modules.
- Modules backend : common, identity, finance, opportunite, sondage, app.
- Frontend admin : React, Vite, Tailwind CSS.
- Frontend participant : React, Vite, Material UI, Tailwind CSS.
- Base de données : PostgreSQL.
- Service support : Redis.
- Conteneurisation : Docker Compose.

## 7. Points d'attention avant production

Avant d'utiliser OpportuniHub avec de vrais utilisateurs, il faut impérativement :

- remplacer tous les secrets de développement ;
- changer le mot de passe administrateur initial ;
- vérifier les règles de sécurité et les rôles ;
- sécuriser le stockage des fichiers uploadés ;
- protéger l'API derrière HTTPS ;
- configurer les sauvegardes PostgreSQL ;
- ne pas exposer PostgreSQL et Redis sur Internet ;
- vérifier les intégrations PayGate, Firebase, Pusher, OVH et Gemini ;
- contrôler ou désactiver les données de démonstration générées au démarrage.
