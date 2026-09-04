# OpportuniHub

Plateforme d'opportunités collectives combinant **achat groupé** (prix dégressifs selon le nombre de participants) et **sondages rémunérés** (réponse à des enquêtes contre récompense en argent ou en points), pensée pour l'Afrique de l'Ouest (Togo, Bénin, Côte d'Ivoire, Sénégal — mobile money Flooz/MTN MoMo/Moov, devise XOF/FCFA).

## Sommaire
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Lancer en local — mode développement](#lancer-en-local--mode-développement)
- [Lancer en local — build de production](#lancer-en-local--build-de-production)
- [Compte admin par défaut](#compte-admin-par-défaut)
- [Accès depuis un autre appareil (même réseau)](#accès-depuis-un-autre-appareil-même-réseau)

## Fonctionnalités

### Côté participant (`frontend/app`)
- **Inscription / connexion par téléphone + OTP** (pas de mot de passe email classique), gestion de session par JWT.
- **Catalogue d'achats groupés** : liste et détail des opportunités, prix dégressif par palier (`PalierPrix`) selon le nombre de participants actuels, compte à rebours avant expiration, participation avec gel du montant sur le portefeuille.
- **Statuts d'opportunité** : `BROUILLON → ACTIVE → CLOTUREE` (ou `ANNULEE`), clôture automatique planifiée (succès si seuil minimum atteint, sinon remboursement).
- **Sondages rémunérés** : test d'éligibilité préalable (score minimum requis), questionnaire principal (choix unique, choix multiple, oui/non, texte libre), upload de preuve si nécessaire, récompense en argent ou en points versée automatiquement ou après validation admin (`ModeDistribution AUTO`/`MANUEL`).
- **Portefeuille intégré** : solde disponible, solde gelé (participations en cours), solde en points, recharge via **Paygate** (mobile money), retrait, conversion points → argent, historique des transactions.
- **Vérification d'identité (KYC)** : upload de pièce d'identité, suivi du niveau de vérification (`AUCUN → EN_ATTENTE → VERIFIE`/`REJETE`) — le niveau `VERIFIE` est requis pour les retraits.
- **Profil utilisateur** et **historique** complet des participations/réponses/transactions.
- **Notifications temps réel** via Pusher + SSE (nouvelles opportunités, clôtures, validations de sondage, etc.).

### Côté administration (`frontend/admin`)
- **Tableau de bord** avec statistiques globales (utilisateurs, opportunités, sondages, wallet plateforme).
- **Gestion des utilisateurs** : consultation, statut de compte.
- **Gestion des opportunités** : création, paliers de prix, images, activation/clôture/annulation.
- **Gestion des sondages** : création (questions + test d'éligibilité), activation, consultation des résultats agrégés (répartition par option pour les questions à choix, verbatims pour le texte libre — calculés sur les réponses validées), validation des réponses et des preuves.
- **Gestion des commanditaires** (entités finançant les sondages).
- **Gestion des portefeuilles** : wallet plateforme, transactions, validation des retraits.
- **KYC** : validation ou rejet des demandes de vérification d'identité.
- **Bannières promotionnelles** : gestion des bannières par page cible (accueil, catalogue, sondages).
- **Paramètres** de la plateforme.

## Architecture

Backend **Java/Spring Boot multi-module Maven** (pas un monolithe à packages) :

| Module | Contenu |
|---|---|
| `common` | enums, événements applicatifs (Spring Events), `JwtService`, `GlobalExceptionHandler`, `RedisService`, `PusherNotificationService` |
| `identity` | Auth (OTP téléphone + JWT), KYC, gestion admin/commanditaires |
| `finance` | Portefeuille, wallet plateforme, transactions, intégration **Paygate** |
| `opportunite` | Achats groupés, paliers de prix, catégories, bannières, galerie d'images |
| `sondage` | Sondages, éligibilité, questions/réponses, résultats |
| `app` | Point d'entrée Spring Boot (seul module packagé en `.jar` exécutable), `DataInitializer`, scheduler de clôture, contrôleurs SSE/stats |

Communication inter-modules par **événements Spring** (quota atteint, remboursement, récompense, demande de retrait...). Notifications temps réel via **Pusher** + **SSE** en complément. Une seule base **PostgreSQL**, cache/blacklist JWT via **Redis**.

Deux frontends **React + Vite** consomment l'API REST :
- `frontend/app` — application participant
- `frontend/admin` — back-office administrateur

> `frontend/Opportunités de sondage et réduction/` est un export Figma de référence (maquette), non branché sur le code réel.

## Stack technique

- **Backend** : Java 21, Spring Boot 3.3.5, Spring Security (JWT), Spring Data JPA/Hibernate, Spring Data Redis, JJWT 0.12.6, MapStruct 1.5.5, Lombok, Springdoc OpenAPI 2.6.0
- **Base de données** : PostgreSQL, Redis
- **Frontend** : React, Vite, Tailwind CSS, Axios
- **Paiement mobile money** : Paygate
- **Temps réel** : Pusher, Server-Sent Events (SSE)

## Structure du projet

```
backend/
  common/  identity/  finance/  opportunite/  sondage/  app/   ← modules Maven
frontend/
  app/     ← application participant (React + Vite)
  admin/   ← back-office admin (React + Vite)
database/
  schema.sql
```

## Prérequis

- Java 21
- Node.js + npm
- PostgreSQL (base `plateforme_opportunites`)
- Redis

## Lancer en local — mode développement

Depuis `backend/` :
```powershell
.\mvnw.cmd spring-boot:run -pl app -am
```
Backend disponible sur `http://localhost:8080`.

Dans un terminal séparé pour chaque frontend :
```powershell
cd frontend\app
npm run dev
```
```powershell
cd frontend\admin
npm run dev
```
Vite choisit automatiquement un port libre (5173, 5174…) — vérifier le port affiché dans le terminal.

## Lancer en local — build de production

Backend (jar exécutable) :
```powershell
.\mvnw.cmd clean package -DskipTests
java -jar app\target\app-1.0.0-SNAPSHOT.jar
```

Frontends (fichiers statiques) :
```powershell
cd frontend\app
npm run build
npm run preview -- --port 4173
```
```powershell
cd frontend\admin
npm run build
npm run preview -- --port 4174
```

## Compte admin par défaut

Créé automatiquement au premier démarrage (`DataInitializer`) si aucun administrateur n'existe :
```
email : admin@plateforme.tg
mot de passe : Admin@1234
```
⚠️ À changer avant toute mise en production.

## Accès depuis un autre appareil (même réseau)

Le backend écoute déjà sur toutes les interfaces réseau. Les frontends (`vite dev`/`vite preview`) n'écoutent que sur `localhost` par défaut — ajouter `--host` pour les exposer sur le réseau local :
```powershell
npm run dev -- --host
```
L'URL de l'API est dérivée automatiquement de l'hôte utilisé pour charger la page (`window.location.hostname`), donc aucune configuration supplémentaire n'est nécessaire côté frontend.
