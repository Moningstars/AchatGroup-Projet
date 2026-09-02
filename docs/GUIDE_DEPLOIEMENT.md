# Guide de déploiement OpportuniHub

Ce guide explique comment déployer OpportuniHub de façon locale mais professionnelle, depuis un PC Windows ou une machine virtuelle Linux, avec un nom de domaine et une option Cloudflare.

## 1. Résultat visé

L'objectif est d'obtenir une installation stable avec :

- l'interface participant accessible depuis un domaine, par exemple `https://app.votre-domaine.com` ;
- l'interface admin accessible depuis un domaine séparé, par exemple `https://admin.votre-domaine.com` ;
- l'API backend protégée derrière HTTPS, par exemple `https://api.votre-domaine.com` ou via `/api` derrière le même domaine ;
- PostgreSQL et Redis non exposés publiquement ;
- des secrets de production séparés des secrets de développement ;
- une sauvegarde régulière de la base de données ;
- une procédure claire de mise à jour.

Pour une vraie production, la meilleure option est une VM Linux. Le déploiement depuis un PC Windows est possible, surtout pour une démonstration, un intranet, un pilote client ou une petite exploitation maîtrisée.

## 2. Architecture recommandée

```text
Utilisateurs
    |
    | HTTPS
    v
Cloudflare DNS / Cloudflare Tunnel
    |
    v
Reverse proxy local : Caddy ou Nginx
    |
    +--> Frontend participant React/Vite
    +--> Frontend admin React/Vite
    +--> API backend Spring Boot
             |
             +--> PostgreSQL
             +--> Redis
             +--> stockage uploads
```

Cloudflare peut servir à deux choses :

- gérer le DNS du domaine ;
- publier votre application sans ouvrir directement votre machine sur Internet grâce à Cloudflare Tunnel.

Cloudflare indique dans sa documentation que les enregistrements DNS proxifiés pour les sites web passent par son réseau, ce qui permet d'appliquer des protections comme DDoS, WAF et cache. Avec Cloudflare Tunnel, un nom public peut pointer vers un service local sans exposer directement l'adresse IP d'origine.

## 3. Ports actuels du projet

En développement, le projet utilise actuellement :

- frontend participant : `http://localhost:5173` ;
- frontend admin : `http://localhost:5174` ;
- backend API : `http://localhost:8080` ;
- PostgreSQL : `localhost:5432` ;
- Redis : `localhost:6379`.

En production, il faut éviter de publier PostgreSQL et Redis. Ils doivent rester accessibles uniquement par les conteneurs Docker.

## 4. Préparation du nom de domaine

### Option A — avec Cloudflare Tunnel, recommandée si la machine est derrière une box Internet

Cette option est pratique si vous déployez depuis votre PC Windows ou une VM sans IP publique fixe.

Étapes générales :

1. Ajouter le domaine dans Cloudflare.
2. Changer les nameservers chez le registrar pour ceux fournis par Cloudflare.
3. Créer un tunnel Cloudflare.
4. Créer les hostnames publics :
   - `app.votre-domaine.com` vers `http://localhost:80` ou vers le reverse proxy ;
   - `admin.votre-domaine.com` vers `http://localhost:80` ;
   - éventuellement `api.votre-domaine.com` vers `http://localhost:8080` ou vers le reverse proxy.
5. Installer `cloudflared` comme service sur Windows ou Linux.

Sur Windows, Cloudflare fournit une commande de type :

```powershell
cloudflared.exe service install VOTRE_TOKEN_TUNNEL
```

Sur Docker/Linux, Cloudflare documente aussi l'exécution du tunnel avec une commande de type :

```bash
docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token VOTRE_TOKEN_TUNNEL
```

### Option B — DNS classique avec IP publique

Cette option convient à une VM chez un hébergeur ou un serveur avec IP publique.

1. Créer des enregistrements DNS :
   - `A app` vers l'IP publique du serveur ;
   - `A admin` vers l'IP publique du serveur ;
   - éventuellement `A api` vers l'IP publique du serveur.
2. Activer le proxy Cloudflare, aussi appelé nuage orange, pour les enregistrements web.
3. Ouvrir uniquement les ports nécessaires :
   - `80/tcp` pour HTTP ;
   - `443/tcp` pour HTTPS.
4. Ne pas ouvrir `5432`, `6379` ou les ports internes de service.

## 5. Préparer les secrets de production

Le fichier de modèle est :

```text
backend/secrets.properties.example
```

Créer le fichier réel :

```powershell
Copy-Item backend\secrets.properties.example backend\secrets.properties
```

Puis remplacer toutes les valeurs :

```properties
DB_PASSWORD=mot-de-passe-postgres-tres-fort
JWT_SECRET_PARTICIPANT=secret-jwt-participant-long-aleatoire
JWT_SECRET_ADMIN=secret-jwt-admin-long-aleatoire-different
PAYGATE_AUTH_TOKEN=token-paygate-production
GEMINI_API_KEY=cle-gemini-si-utilisee
PUSHER_APP_ID=id-pusher
PUSHER_KEY=cle-pusher
PUSHER_SECRET=secret-pusher
```

Conseils :

- utiliser au moins 32 à 64 caractères pour les secrets JWT ;
- ne jamais commiter `backend/secrets.properties` ;
- changer le mot de passe admin initial après la première connexion ;
- séparer les clés de test et les clés de production PayGate/Firebase/Pusher.

Des fichiers d'exemple ont aussi été ajoutés au projet pour accélérer la préparation :

```text
.env.prod.example
docker-compose.prod.example.yml
deploy/Caddyfile.example
frontend/admin/.env.production.example
frontend/Opportunités de sondage et réduction/.env.production.example
```

Avant le déploiement, copiez-les vers leurs noms réels :

```powershell
Copy-Item .env.prod.example .env.prod
Copy-Item docker-compose.prod.example.yml docker-compose.prod.yml
Copy-Item deploy\Caddyfile.example deploy\Caddyfile
Copy-Item frontend\admin\.env.production.example frontend\admin\.env.production
Copy-Item "frontend\Opportunités de sondage et réduction\.env.production.example" "frontend\Opportunités de sondage et réduction\.env.production"
```

## 6. Préparation frontend pour un domaine

Aujourd'hui, les frontends appellent l'API locale. Pour un déploiement propre, il faut que les frontends utilisent une URL API configurable.

Configuration recommandée :

- en développement : `http://localhost:8080/api` ;
- en production avec sous-domaine API : `https://api.votre-domaine.com/api` ;
- en production derrière le même domaine : `/api`.

Créer des fichiers d'environnement côté frontend :

```text
frontend/admin/.env.production
frontend/Opportunités de sondage et réduction/.env.production
```

Exemple :

```env
VITE_API_BASE_URL=https://api.votre-domaine.com/api
```

Si vous préférez passer par le reverse proxy avec `/api`, utilisez :

```env
VITE_API_BASE_URL=/api
```

Le back-office admin lit maintenant `import.meta.env.VITE_API_BASE_URL`. Si la variable n'existe pas, il garde le comportement local actuel : `http://<hôte-de-la-page>:8080/api`.

## 7. Build de l'application

### Backend Java

Sur Windows PowerShell :

```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
cmd /c ".\mvnw.cmd -pl app -am package -Dmaven.test.skip=true"
cd ..
```

Sur Linux :

```bash
cd backend
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
./mvnw -pl app -am package -Dmaven.test.skip=true
cd ..
```

Le JAR attendu est :

```text
backend/app/target/app-1.0.0-SNAPSHOT.jar
```

Note : les tests sont volontairement ignorés dans cette commande car le projet contient actuellement des tests existants à remettre à niveau. Pour une production mature, il faudra corriger ces tests et construire sans `-Dmaven.test.skip=true`.

### Frontend admin

```powershell
cd frontend\admin
npm ci
npm run build
cd ..\..
```

Le résultat est :

```text
frontend/admin/dist
```

### Frontend participant

Sur Windows PowerShell :

```powershell
cd "frontend\Opportunités de sondage et réduction"
npm ci
npm run build
cd ..\..
```

Le résultat est :

```text
frontend/Opportunités de sondage et réduction/dist
```

## 8. Déploiement Docker Compose professionnel

Copier le fichier d'exemple :

```text
docker-compose.prod.example.yml -> docker-compose.prod.yml
```

Exemple de base :

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: plateforme_opportunites
      POSTGRES_USER: opportunihub
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - opportunihub_postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opportunihub -d plateforme_opportunites"]
      interval: 10s
      timeout: 5s
      retries: 12
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - opportunihub_redis_data:/data
    restart: unless-stopped

  backend:
    image: eclipse-temurin:21-jre
    working_dir: /app
    command: ["java", "-jar", "/app/app-1.0.0-SNAPSHOT.jar"]
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/plateforme_opportunites
      SPRING_DATASOURCE_USERNAME: opportunihub
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
    volumes:
      - ./backend/app/target/app-1.0.0-SNAPSHOT.jar:/app/app-1.0.0-SNAPSHOT.jar:ro
      - ./backend/secrets.properties:/app/secrets.properties:ro
      - ./.runtime/uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./frontend/admin/dist:/srv/admin:ro
      - ./frontend/Opportunités de sondage et réduction/dist:/srv/app:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  opportunihub_postgres_data:
  opportunihub_redis_data:
  caddy_data:
  caddy_config:
```

Copier aussi `.env.prod.example` vers `.env.prod`, puis remplacer le mot de passe :

```env
DB_PASSWORD=mot-de-passe-postgres-tres-fort
```

Lancer :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

## 9. Exemple Caddyfile

Copier :

```text
deploy/Caddyfile.example -> deploy/Caddyfile
```

Exemple avec trois sous-domaines :

```caddyfile
app.votre-domaine.com {
  root * /srv/app
  try_files {path} /index.html
  file_server

  reverse_proxy /api/* backend:8080
  reverse_proxy /uploads/* backend:8080
}

admin.votre-domaine.com {
  root * /srv/admin
  try_files {path} /index.html
  file_server

  reverse_proxy /api/* backend:8080
  reverse_proxy /uploads/* backend:8080
}

api.votre-domaine.com {
  reverse_proxy backend:8080
}
```

Si vous utilisez Cloudflare Tunnel et que Cloudflare termine le HTTPS, vous pouvez aussi faire pointer le tunnel vers le service Caddy en HTTP interne.

## 10. Déploiement depuis un PC Windows

Cette option est acceptable pour un pilote, une démonstration ou une petite installation contrôlée.

Prérequis :

- Windows 10/11 ;
- Docker Desktop avec WSL2 activé ;
- Node.js LTS ;
- JDK 21 ;
- Git ;
- un compte Cloudflare si vous voulez publier avec un domaine sans ouvrir la box ;
- idéalement une alimentation stable et une connexion Internet fiable.

Procédure :

1. Placer le projet dans un dossier stable, par exemple `C:\opportunihub`.
2. Préparer `backend\secrets.properties`.
3. Préparer `.env.prod`.
4. Construire le backend.
5. Construire les deux frontends.
6. Lancer Docker Compose :

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

7. Installer Cloudflare Tunnel comme service Windows :

```powershell
cloudflared.exe service install VOTRE_TOKEN_TUNNEL
```

8. Vérifier :

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs backend
```

Limites de Windows en production :

- redémarrages automatiques Windows Update ;
- dépendance à Docker Desktop ;
- disponibilité réseau moins prévisible qu'une VM ;
- sauvegardes et monitoring à organiser sérieusement.

## 11. Déploiement sur VM Linux, option recommandée

Prérequis recommandés :

- Ubuntu Server 22.04 LTS ou 24.04 LTS ;
- 2 CPU minimum ;
- 4 Go RAM minimum, 8 Go recommandé ;
- 40 Go disque minimum ;
- Docker Engine et plugin Docker Compose ;
- accès SSH ;
- firewall actif.

Installation Docker sur Ubuntu :

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Se reconnecter ensuite en SSH pour que le groupe Docker soit pris en compte.

Déploiement :

```bash
sudo mkdir -p /opt/opportunihub
sudo chown -R $USER:$USER /opt/opportunihub
cd /opt/opportunihub
git clone VOTRE_REPO_GIT .
```

Créer les secrets :

```bash
cp backend/secrets.properties.example backend/secrets.properties
nano backend/secrets.properties
nano .env.prod
```

Construire :

```bash
cd backend
./mvnw -pl app -am package -Dmaven.test.skip=true
cd ../frontend/admin
npm ci
npm run build
cd "../Opportunités de sondage et réduction"
npm ci
npm run build
cd ../..
```

Démarrer :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Firewall :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Avec Cloudflare Tunnel, vous pouvez ne pas ouvrir `80` et `443` publiquement si le tunnel est le seul point d'entrée.

## 12. Sauvegarde PostgreSQL

Créer un dossier de sauvegarde :

```bash
mkdir -p backups
```

Sauvegarde manuelle :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U opportunihub plateforme_opportunites > backups/opportunihub-$(date +%F-%H%M).sql
```

Restauration :

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  psql -U opportunihub plateforme_opportunites < backups/fichier.sql
```

Pour une vraie production, programmer une sauvegarde quotidienne avec `cron` ou le planificateur Windows, puis copier les sauvegardes hors de la machine.

## 13. Mise à jour de l'application

Procédure standard :

```bash
git pull
cd backend
./mvnw -pl app -am package -Dmaven.test.skip=true
cd ../frontend/admin
npm ci
npm run build
cd "../Opportunités de sondage et réduction"
npm ci
npm run build
cd ../..
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate
```

Avant une mise à jour importante :

1. sauvegarder PostgreSQL ;
2. vérifier les notes de version ;
3. tester sur une copie si possible ;
4. redémarrer les services ;
5. vérifier les logs.

## 14. Checklist sécurité avant mise en ligne

- Changer `Admin@1234` après la première connexion.
- Utiliser des secrets JWT longs et différents.
- Ne pas exposer PostgreSQL ni Redis au public.
- Activer HTTPS partout.
- Vérifier CORS côté backend.
- Configurer PayGate avec les clés de production.
- Configurer Firebase correctement pour le domaine public.
- Configurer Pusher si les notifications privées sont utilisées.
- Vérifier les limites d'upload et le stockage des fichiers.
- Mettre en place des sauvegardes automatiques.
- Vérifier les logs backend après chaque redémarrage.
- Désactiver ou contrôler les données de démonstration au démarrage.
- Prévoir un compte admin nominatif par administrateur réel.

## 15. Vérifications après déploiement

Tester dans cet ordre :

1. `https://app.votre-domaine.com` charge l'interface participant.
2. `https://admin.votre-domaine.com` charge l'interface admin.
3. `https://api.votre-domaine.com/api/stats` ou `/api/stats` répond.
4. Connexion admin réussie.
5. Liste des opportunités visible.
6. Bouton détail d'une opportunité ouvre l'interface avancée.
7. Suivi livraison visible dans le détail d'une opportunité.
8. Action groupée livraison testée sur une participation de test.
9. Export CSV des participants fonctionne.
10. Création/modification d'une opportunité fonctionne.
11. Recharge portefeuille en mode configuré fonctionne.
12. Sauvegarde PostgreSQL réussie.

## 16. Recommandation finale

Pour un déploiement professionnel depuis vos moyens actuels :

1. utiliser une VM Linux si le logiciel doit être accessible en continu ;
2. utiliser Cloudflare DNS + Cloudflare Tunnel si vous ne voulez pas gérer d'IP fixe ou d'ouverture de ports ;
3. servir les frontends avec Caddy ;
4. garder PostgreSQL, Redis et le backend dans Docker Compose ;
5. mettre en place sauvegardes, secrets forts et supervision des logs avant d'avoir de vrais utilisateurs.

Références utiles :

- Documentation Cloudflare DNS proxy status : https://developers.cloudflare.com/dns/proxy-status/
- Documentation Cloudflare Tunnel setup : https://developers.cloudflare.com/tunnel/setup/
- Documentation Cloudflare Tunnel avec Docker : https://developers.cloudflare.com/tunnel/downloads/update-cloudflared/
- Paramètres d'exécution `cloudflared` : https://developers.cloudflare.com/tunnel/advanced/run-parameters/
