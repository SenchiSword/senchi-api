# 🛡️ Comte Harebourg API (Supabase + Render)

Backend Node.js / Express pour l'application desktop Tauri **Senchi Sword**. Il gère :

- La vérification de santé de l'API (`/health`) et favicon (`/favicon.ico`).
- La validation en temps réel des licences par machine HWID (`/api/license/validate`) avec Rate Limiting.
- La signature cryptographique des preuves de licence (ECDSA P-256 via `licenseProof.js`).
- Le panneau d'administration web des licences (`/admin/licenses`) avec export CSV et modales personnalisées.
- La page d'authentification dédiée avec session (`/admin/login` et `/admin/logout`) protégée contre le brute-force.
- La persistance sécurisée dans **Supabase (PostgreSQL)** en production (avec fallback local JSON).
- Le bot d'alertes Discord automatique **« Clepsydre »** (`discordWebhook.js`).
- La diffusion d'annonces en jeu (`/api/announcement` et `/api/announcements`).

---

## 1. Architecture & Fonctionnement

- **Base de données** : [Supabase](https://supabase.com) (tables `licenses` et `announcements`).
- **Hébergement** : [Render](https://render.com) (Web Service Node.js).
- **Fallback local** : `server/data/licenses.json` si Supabase n'est pas configuré en local.
- **Sécurité** : Signature cryptographique ECDSA (`licenseProof.js`) vérifiée côté client Tauri avec la clé publique.

---

## 2. Panneau d'Administration Web

- **URL d'accès** : `https://senchi-api.onrender.com/admin/licenses` (ou `/admin/login`).
- **Authentification** : Page de connexion moderne Dark Glassmorphism avec cookie de session sécurisé `senchi_admin_session`.
- **Interface** :
  - Métriques KPI en temps réel (Total, Actives, En risque, Expirent sous 14 jours).
  - Filtres par statut (Toutes, Actives, En attente, À risque) et recherche textuelle instantanée.
  - Bouton **Export CSV** : Téléchargement instantané en UTF-8 (BOM `\uFEFF`) compatible Excel avec séparateur `;`.
  - Bouton **Test Discord** : Test de connectivité du webhook avec le bot Clepsydre.
  - Générateur de clés de licence formatées `SENCHI-XXXX-XXXX-XXXX-XXXX`.
  - Puces de durée rapide (+7j, +30j, +90j, +365j, Illimitée).
  - Détachement de machine (Délier 🔄).
  - Suppression définitive dans Supabase (🗑️).
  - Gestion des annonces en jeu (Création, modification, suppression).
  - Modales personnalisées `<dialog>` (aucun `confirm()` ou `alert()` natif du navigateur).

---

## 3. Bot Discord « Clepsydre »

Le module `server/discordWebhook.js` envoie des notifications temps réel :
- 🎉 **Première activation** : Première utilisation historique de la licence.
- 🔄 **Réactivation de licence** : Reconnexion après qu'une machine a été déliée par l'admin.
- 💻 **Machine supplémentaire** : Rattachement d'un 2ème PC sur une licence multi-postes.
- ⚠️ **Dépassement de quota** : Tentative d'utilisation sur un PC excédant le quota `max_devices`.
- 🔔 **Test Webhook** : Affiche `Infrastructure : 🔒 Sécurisée`.

---

## 4. Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Rendez-vous dans **SQL Editor** -> **New query**.
3. Exécutez le script contenu dans `schema.sql`.
4. Allez dans **Project Settings** -> **API** et récupérez :
   - `Project URL` -> `SUPABASE_URL`
   - `service_role` (clé secrète) -> `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. Variables d'environnement requises

| Variable | Description | Exemple / Valeur |
| :--- | :--- | :--- |
| `PORT` | Port d'écoute | `10000` (auto sur Render) ou `8080` |
| `APP_NAME` | Nom de l'app | `Comte Harebourg API` |
| `APP_VERSION` | Version de l'API | `1.0.0` |
| `MIN_SUPPORTED_APP_VERSION` | Version client minimale autorisée | `1.0.0` |
| `ALLOWED_ORIGINS` | Origines CORS | `*` |
| `ADMIN_USERNAME` | Identifiant admin | `Senchi` |
| `ADMIN_PASSWORD` | Mot de passe admin | `Foxhound666**` |
| `SUPABASE_URL` | URL de votre projet Supabase | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète `service_role` | `sb_secret_...` |
| `LICENSE_SIGNING_PRIVATE_KEY_PEM` | Clé privée de signature ECDSA | `-----BEGIN EC PRIVATE KEY-----\n...` |
| `LICENSE_SIGNING_KEY_ID` | Identifiant de clé | `main` |
| `DISCORD_WEBHOOK_URL` | *(Optionnel)* URL Webhook Discord pour alertes en temps réel | `https://discord.com/api/webhooks/...` |
| `DISCORD_BOT_NAME` | *(Optionnel)* Surcharge du nom du bot (défaut : `Clepsydre`) | `Clepsydre` |

---

## 6. Déploiement vers Render via Git Subtree

Render est connecté au dépôt `https://github.com/SenchiSword/senchi-api.git`.

Pour déployer les modifications du dossier `server/` depuis la racine du projet principal :

```bash
git add .
git commit -m "feat: description des changements"
git push origin main

git subtree split --prefix server -b server-deploy-temp
git push https://github.com/SenchiSword/senchi-api.git server-deploy-temp:main --force
git branch -D server-deploy-temp
```

---

## 7. Endpoints API

| Méthode | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Healthcheck (état serveur, version) |
| `GET` | `/favicon.ico` | Favicon (204 No Content) |
| `POST` | `/api/license/validate` | Validation licence client + preuve ECDSA (Rate-limited: 40/min) |
| `POST` | `/api/announcement` | Récupération de l'annonce active pour un joueur |
| `GET` | `/admin/login` | Page de connexion admin |
| `POST` | `/admin/login` | Traitement de la connexion (Rate-limited: 10/15min) |
| `ALL` | `/admin/logout` | Déconnexion admin |
| `GET` | `/admin/licenses` | Tableau de bord admin |
| `GET` | `/api/licenses` | Liste des licences |
| `POST` | `/api/licenses/upsert` | Création / modification d'une licence |
| `POST` | `/api/licenses/delete` | Suppression d'une licence |
| `POST` | `/api/licenses/reset-machines` | Détacher la machine liée |
| `POST` | `/api/licenses/set-status` | Modifier le statut |
| `GET` | `/api/announcements` | Consultation de l'annonce active |
| `POST` | `/api/announcements` | Sauvegarder l'annonce |
| `POST` | `/api/announcements/upsert` | Sauvegarder l'annonce (alias) |
| `POST` | `/api/announcements/clear` | Supprimer l'annonce |
| `POST` | `/api/discord/test` | Tester la connexion Webhook Discord |
