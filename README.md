# Comte Harebourg API

Backend Express pour l'application desktop Tauri. Il gere :

- la sante de l'API
- la validation des licences
- l'administration des licences
- le stockage des licences dans Firestore en production

## Fonctionnement actuel

Le serveur utilise :

- **Firestore** sur Google Cloud pour le stockage principal des licences
- un **fallback local JSON** dans [data/licenses.json](c:\Users\Ayoub\Desktop\Comte\Pi\server\data\licenses.json) si Firestore n'est pas disponible en local
- une **authentification admin** pour la page `/admin/licenses` et les routes `/api/licenses*`

## Prerequis

- Node.js installe
- npm installe
- Google Cloud CLI si tu veux deployer sur Cloud Run
- Un projet Google Cloud avec :
  - Cloud Run
  - Cloud Build
  - Artifact Registry
  - Firestore

## Installation locale

Depuis le dossier [server](c:\Users\Ayoub\Desktop\Comte\Pi\server) :

```bash
npm install
```

## Variables d'environnement

Copie `.env.example` vers `.env` si tu veux travailler avec un fichier local.

Variables disponibles :

- `PORT` : port d'ecoute du serveur
- `APP_NAME` : nom renvoye par `/health`
- `APP_VERSION` : version renvoyee par `/health`
- `MIN_SUPPORTED_APP_VERSION` : version minimale autorisee pour la validation de licence
- `ALLOWED_ORIGINS` : liste separee par virgules, ou `*` en local uniquement
- `API_KEY` : cle API optionnelle attendue dans `x-api-key`
- `ADMIN_USERNAME` : identifiant de l'admin licences
- `ADMIN_PASSWORD` : mot de passe de l'admin licences
- `LICENSE_SIGNING_PRIVATE_KEY_PEM` : cle privee utilisee pour signer les preuves de licence
- `LICENSE_SIGNING_KEY_ID` : identifiant de la cle de signature
- `FIRESTORE_LICENSES_COLLECTION` : nom de la collection Firestore, par defaut `licenses`

Exemple minimal :

```env
PORT=8080
APP_NAME=Comte Harebourg API
APP_VERSION=1.0.0
MIN_SUPPORTED_APP_VERSION=1.0.0
ALLOWED_ORIGINS=*
API_KEY=change-moi
ADMIN_USERNAME=Pinklon
ADMIN_PASSWORD=Foxhound666**
LICENSE_SIGNING_PRIVATE_KEY_PEM=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
LICENSE_SIGNING_KEY_ID=main
FIRESTORE_LICENSES_COLLECTION=licenses
```

## Demarrage local

Mode normal :

```bash
npm start
```

Mode dev avec restart auto :

```bash
npm run dev
```

Par defaut, l'API ecoute sur :

- `http://localhost:8080`

En local, le serveur reste souple pour faciliter les tests si `API_KEY` ou l'auth admin ne sont pas definies.

En production, le serveur refuse maintenant de demarrer si l'une des conditions suivantes n'est pas respectee :

- `ADMIN_USERNAME` et `ADMIN_PASSWORD` definis
- `LICENSE_SIGNING_PRIVATE_KEY_PEM` definie
- `ALLOWED_ORIGINS` explicite, sans `*`

## Verification rapide

Health check :

```bash
curl http://localhost:8080/health
```

Validation d'une licence :

```bash
curl -X POST http://localhost:8080/api/license/validate ^
  -H "Content-Type: application/json" ^
  -d "{\"clientId\":\"senchi-sword-desktop\",\"licenseKey\":\"CLIENT-001\",\"machineId\":\"PC-01\",\"appVersion\":\"1.0.0\"}"
```

Si `appVersion` est inferieure a `MIN_SUPPORTED_APP_VERSION`, le serveur refuse la validation avec une erreur de mise a jour obligatoire.

## Routes disponibles

Routes publiques :

- `GET /health`
- `GET /api/status`
- `POST /api/license/validate`

Routes admin protegees :

- `GET /api/licenses`
- `POST /api/licenses/upsert`
- `POST /api/licenses/set-status`
- `POST /api/licenses/reset-machines`
- `POST /api/licenses/set-expiration`
- `GET /admin/licenses`

## Admin licences

Page admin :

- `http://localhost:8080/admin/licenses`

En production :

- l'acces est obligatoirement protege par `ADMIN_USERNAME` et `ADMIN_PASSWORD`
- le navigateur peut memoriser le login en Basic Auth
- pour retester proprement, utilise une fenetre privee

Depuis l'admin, tu peux :

- creer une licence
- activer / bloquer / suspendre / expirer une licence
- changer la date d'expiration
- reset les machines attachees

## Modele de licence

Chaque licence stocke :

- `license_key`
- `customer_name`
- `customer_email`
- `status`
- `expires_at`
- `machine_id`
- `machine_ids`
- `max_devices`
- `last_seen_at`
- `activated_at`
- `last_app_version`
- `notes`

## Stockage des licences

En production Cloud Run :

- les licences sont stockees dans **Firestore**
- collection par defaut : `licenses`

En local :

- si Firestore n'est pas disponible, le serveur retombe sur :
  - [data/licenses.json](c:\Users\Ayoub\Desktop\Comte\Pi\server\data\licenses.json)

## Deploiement Google Cloud Run

Depuis le dossier [server](c:\Users\Ayoub\Desktop\Comte\Pi\server) :

```bash
gcloud run deploy comte-harebourg-api ^
  --source . ^
  --region europe-west1 ^
  --allow-unauthenticated
```

## Mise a jour des variables Cloud Run

Exemple pour definir l'admin :

```bash
gcloud run services update comte-harebourg-api ^
  --region europe-west1 ^
  --set-env-vars "ADMIN_USERNAME=Pinklon,ADMIN_PASSWORD=Foxhound666**,FIRESTORE_LICENSES_COLLECTION=licenses"
```

## Verification apres deploiement

Verifier le service :

```bash
curl https://ton-service.run.app/health
```

Verifier l'admin :

- ouvre `https://ton-service.run.app/admin/licenses`
- teste en navigation privee si besoin

Verifier une fausse licence :

```bash
curl -X POST https://ton-service.run.app/api/license/validate ^
  -H "Content-Type: application/json" ^
  -d "{\"clientId\":\"senchi-sword-desktop\",\"licenseKey\":\"test\",\"machineId\":\"PC-TEST-01\",\"appVersion\":\"1.0.0\"}"
```

Le resultat attendu pour une fausse cle est :

- `License not found`

## Lien avec l'application desktop

L'app Tauri doit pointer sur le bon backend dans :

- [apiClient.js](c:\Users\Ayoub\Desktop\Comte\Pi\src\utils\apiClient.js)
- [desktopBridge.js](c:\Users\Ayoub\Desktop\Comte\Pi\src\desktop\desktopBridge.js)

Si tu changes l'URL Cloud Run, pense a mettre a jour ces deux fichiers puis a rebuild l'app.

## Notes utiles

- Un changement sur le **backend cloud** est visible sans reinstall de l'app si l'app appelle deja ce backend
- Un changement dans **l'app desktop** demande un nouveau build Tauri
- Pour tester la licence proprement, supprime au besoin le fichier session client :
  - `C:\Users\Ayoub\AppData\Roaming\com.senchi-sword.harebourg\license-session.json`
