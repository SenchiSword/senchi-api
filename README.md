# Comte Harebourg API (Supabase + Render)

Backend Express pour l'application desktop Tauri. Il gere :

- la verification de la sante de l'API (`/health`)
- la validation en temps reel des licences par machine (`/api/license/validate`)
- l'administration web des licences (`/admin/licenses`)
- le stockage dans **Supabase (PostgreSQL)** en production (avec fallback local JSON)
- la diffusion d'annonces en jeu (`/api/announcement`)

---

## 1. Fonctionnement

- **Base de donnees** : [Supabase](https://supabase.com) (tables `licenses` et `announcements`).
- **Hebergement** : [Render](https://render.com) (Web Service Node.js gratuit).
- **Fallback local** : `server/data/licenses.json` si Supabase n'est pas configure ou injoignable en local.
- **Securite** : Signature cryptographique ECDSA (`licenseProof.js`) verifiee par le client desktop.

---

## 2. Configuration Supabase

1. Creez un projet gratuit sur [supabase.com](https://supabase.com).
2. Rendez-vous dans **SQL Editor** -> **New query**.
3. Copiez et executez le contenu de `server/schema.sql`.
4. Allez dans **Settings** -> **API** et notez :
   - `Project URL` -> `SUPABASE_URL`
   - `service_role` (secret) -> `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Variables d'environnement

| Variable | Description | Exemple |
| :--- | :--- | :--- |
| `PORT` | Port d'ecoute | `8080` (ou auto sur Render) |
| `APP_NAME` | Nom de l'app | `Comte Harebourg API` |
| `APP_VERSION` | Version de l'API | `1.0.0` |
| `MIN_SUPPORTED_APP_VERSION` | Version minimale autorisee pour le client | `1.0.0` |
| `ALLOWED_ORIGINS` | Origines CORS autorisees | `*` |
| `ADMIN_USERNAME` | Identifiant de connexion admin | `admin` |
| `ADMIN_PASSWORD` | Mot de passe de connexion admin | `votre_mot_de_passe` |
| `SUPABASE_URL` | URL de votre projet Supabase | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle secrete service_role de Supabase | `eyJhbGciOi...` |
| `LICENSE_SIGNING_PRIVATE_KEY_PEM` | Cle privee de signature (`license-private.pem`) | `-----BEGIN EC PRIVATE KEY-----\n...` |
| `LICENSE_SIGNING_KEY_ID` | Identifiant de cle | `main` |

---

## 4. Deploiement sur Render

1. Connectez-vous sur [render.com](https://render.com).
2. Cliquez sur **New +** -> **Web Service**.
3. Liez votre depot GitHub.
4. Parametres :
   - **Root Directory** : `server`
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `node index.js`
   - **Instance Type** : `Free`
5. Dans la section **Environment Variables**, ajoutez les variables listees ci-dessus.
6. Cliquez sur **Deploy Web Service**.
7. Copiez l'URL HTTPS fournie par Render (ex : `https://senchi-api.onrender.com`).

---

## 5. Liaison avec l'application Desktop

Une fois l'URL Render obtenue, reportez-la dans :
- `src/utils/apiClient.js` (`DEFAULT_API_BASE_URL`)
- `src/desktop/desktopBridge.js` (`DEFAULT_API_BASE_URL`)
