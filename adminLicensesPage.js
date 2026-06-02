function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsSingleQuoted(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function formatDateOnly(value, emptyLabel = 'Aucune') {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function formatDateTime(value, emptyLabel = 'Aucune') {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function isExpiringSoon(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const delta = date.getTime() - Date.now();
  return delta >= 0 && delta <= 14 * 24 * 60 * 60 * 1000;
}

function getStatusLabel(status) {
  return {
    active: 'Active',
    blocked: 'Bloquee',
    suspended: 'Suspendue',
    expired: 'Expiree'
  }[status] || status || 'Inconnu';
}

function renderLicenseCard(license) {
  const safeKey = escapeHtml(license.license_key);
  const safeExpiration = escapeHtml(license.expires_at || '');
  const machines = Array.isArray(license.machine_ids) ? license.machine_ids : [];
  const machinesLabel = escapeHtml(machines.length ? machines.join(' | ') : 'Aucune machine rattachee');
  const notesLabel = escapeHtml(license.notes || 'Aucune note');

  return '<article class="license">' +
    '<div class="license-head">' +
      '<div>' +
        '<strong>' + escapeHtml(license.customer_name || 'Client sans nom') + '</strong><br>' +
        '<span style="color:var(--muted)">' + escapeHtml(license.customer_email || 'Aucun email') + '</span>' +
      '</div>' +
      '<span class="status ' + escapeHtml(license.status) + '">' + escapeHtml(getStatusLabel(license.status)) + '</span>' +
    '</div>' +
    '<div class="meta">' +
      '<div class="meta-item"><span>Cle</span><div class="license-key">' + safeKey + '</div></div>' +
      '<div class="meta-item"><span>Appareils</span><div>' + escapeHtml(String(machines.length)) + ' / ' + escapeHtml(String(license.max_devices || 1)) + '</div></div>' +
      '<div class="meta-item"><span>Expiration</span><div>' + formatDateOnly(license.expires_at, 'Aucune') + '</div></div>' +
      '<div class="meta-item"><span>Derniere activite</span><div>' + formatDateTime(license.last_seen_at, 'Jamais') + '</div></div>' +
      '<div class="meta-item"><span>Version app</span><div>' + escapeHtml(license.last_app_version || 'Inconnue') + '</div></div>' +
    '</div>' +
    '<div class="license-extra">' +
      '<div class="meta-item meta-item-wide"><span>Machines</span><div>' + machinesLabel + '</div></div>' +
      '<div class="meta-item meta-item-wide"><span>Notes</span><div>' + notesLabel + '</div></div>' +
    '</div>' +
    '<div class="actions">' +
      '<button type="button" class="primary" data-action="edit-license" data-license-key="' + safeKey + '">Modifier</button>' +
      '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="active">Activer</button>' +
      '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="suspended">Suspendre</button>' +
      '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="blocked">Bloquer</button>' +
      '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="expired">Expirer</button>' +
      '<button type="button" data-action="set-expiration" data-license-key="' + safeKey + '" data-license-expiration="' + safeExpiration + '">Expiration</button>' +
      '<button type="button" data-action="reset-machines" data-license-key="' + safeKey + '">Reset appareils</button>' +
    '</div>' +
  '</article>';
}

function renderAdminLicensesPage(initialLicenses = [], initialAnnouncement = null) {
  const serializedLicenses = JSON.stringify(Array.isArray(initialLicenses) ? initialLicenses : []);
  const serializedAnnouncement = JSON.stringify(initialAnnouncement || null);
  const total = initialLicenses.length;
  const active = initialLicenses.filter((license) => license.status === 'active').length;
  const risk = initialLicenses.filter((license) => ['blocked', 'suspended', 'expired'].includes(license.status)).length;
  const expiring = initialLicenses.filter((license) => isExpiringSoon(license.expires_at)).length;
  const initialSubtitle = total ? `${total} licence(s) affichee(s) sur ${total}.` : 'Aucune licence pour le moment.';
  const initialCardsHtml = total
    ? initialLicenses.map((license) => renderLicenseCard(license)).join('')
    : '<div class="empty">Aucune licence pour le moment.</div>';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin licences</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111f;
      --bg-soft: #0d1a2d;
      --panel: rgba(11, 20, 36, 0.82);
      --panel-strong: rgba(18, 31, 52, 0.96);
      --line: rgba(127, 201, 255, 0.16);
      --line-strong: rgba(127, 201, 255, 0.28);
      --text: #eef6ff;
      --muted: #8ea7c6;
      --accent: #81d8ff;
      --accent-2: #5eb3ff;
      --danger: #ffb7c5;
      --success: #91f0bc;
      --warning: #ffd89b;
      --shadow: 0 30px 70px rgba(0, 0, 0, 0.32);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(94, 179, 255, 0.14), transparent 26%),
        radial-gradient(circle at top right, rgba(77, 208, 255, 0.08), transparent 22%),
        radial-gradient(circle at bottom left, rgba(85, 164, 255, 0.08), transparent 28%),
        linear-gradient(180deg, var(--bg) 0%, #050d18 100%);
      color: var(--text);
      min-height: 100vh;
    }

    .app {
      width: min(1380px, calc(100vw - 28px));
      margin: 0 auto;
      padding: 24px 0 32px;
    }

    .panel {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)),
        var(--panel);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }

    h1, h2 {
      margin: 0 0 10px;
      letter-spacing: -0.03em;
    }

    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px auto;
      gap: 12px;
      align-items: end;
    }

    label {
      display: grid;
      gap: 6px;
      font-size: 0.9rem;
      font-weight: 700;
    }

    input, select, textarea, button {
      font: inherit;
    }

    input, select, textarea {
      width: 100%;
      min-height: 42px;
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(7, 15, 28, 0.94);
      color: var(--text);
    }

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    button {
      min-height: 42px;
      padding: 10px 14px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(17, 34, 58, 0.96), rgba(11, 22, 39, 0.98));
      color: var(--text);
      cursor: pointer;
      transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }

    button:hover {
      transform: translateY(-1px);
      border-color: var(--line-strong);
    }

    button.primary {
      background: linear-gradient(135deg, #e5f6ff, #8fd3ff 55%, #69bfff);
      color: #08253d;
      border: 0;
      font-weight: 700;
      box-shadow: 0 12px 24px rgba(85, 177, 255, 0.24);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .stat {
      padding: 16px;
      border-radius: 18px;
      background:
        radial-gradient(circle at top right, rgba(129, 216, 255, 0.1), transparent 40%),
        rgba(255, 255, 255, 0.04);
      border: 1px solid var(--line);
    }

    .stat span {
      display: block;
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .stat strong {
      display: block;
      font-size: 1.7rem;
      margin-top: 10px;
    }

    #feedback {
      display: none;
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(140, 240, 182, 0.2);
      background: rgba(140, 240, 182, 0.08);
      color: var(--success);
      font-weight: 700;
    }

    #feedback.visible { display: block; }
    #feedback.error {
      border-color: rgba(255, 179, 192, 0.2);
      background: rgba(255, 179, 192, 0.08);
      color: var(--danger);
    }

    .licenses {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .license {
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 14px;
      background:
        radial-gradient(circle at top right, rgba(129, 216, 255, 0.08), transparent 30%),
        linear-gradient(180deg, rgba(17, 28, 47, 0.96), rgba(13, 22, 37, 0.98));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .license-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .status {
      padding: 5px 10px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.04);
    }

    .status.active { color: var(--success); background: rgba(145, 240, 188, 0.08); }
    .status.blocked { color: var(--danger); background: rgba(255, 183, 197, 0.08); }
    .status.suspended { color: var(--warning); background: rgba(255, 216, 155, 0.08); }
    .status.expired { color: #d4ceff; background: rgba(212, 206, 255, 0.08); }

    .meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      margin-bottom: 7px;
    }

    .meta-item {
      padding: 9px 11px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid var(--line);
      min-width: 0;
    }

    .meta-item span {
      display: block;
      color: var(--muted);
      font-size: 0.72rem;
      margin-bottom: 3px;
    }

    .meta-item div {
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.3;
      word-break: break-word;
    }

    .license-key {
      font-family: Consolas, monospace;
      word-break: break-all;
    }

    .license-extra {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
      margin-bottom: 8px;
    }

    .meta-item-wide {
      border-radius: 14px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .license .actions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }

    .license .actions button {
      width: 100%;
      min-height: 36px;
      padding: 7px 10px;
      border-radius: 12px;
      white-space: nowrap;
      font-size: 0.92rem;
    }

    .license-head strong {
      display: block;
      margin-bottom: 2px;
      font-size: 1.05rem;
    }

    .license-head span[style] {
      font-size: 0.94rem;
    }

    @media (max-width: 1180px) {
      .license .actions {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 980px) {
      .license-extra,
      .license .actions {
        grid-template-columns: 1fr;
      }
    }

    dialog {
      width: min(760px, calc(100vw - 24px));
      border: 1px solid var(--line);
      border-radius: 24px;
      background: #0d1626;
      color: var(--text);
      padding: 0;
      box-shadow: var(--shadow);
    }

    dialog::backdrop {
      background: rgba(3, 8, 14, 0.78);
    }

    .dialog-shell {
      padding: 18px;
      display: grid;
      gap: 14px;
    }

    .dialog-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .full {
      grid-column: 1 / -1;
    }

    .empty {
      padding: 28px 16px;
      text-align: center;
      border: 1px dashed var(--line);
      border-radius: 18px;
      color: var(--muted);
    }

    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: start;
    }

    .hero-kicker {
      display: inline-flex;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(129, 216, 255, 0.08);
      border: 1px solid var(--line);
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }

    .hero-title {
      font-size: clamp(1.8rem, 3.4vw, 2.6rem);
      margin-bottom: 8px;
    }

    .hero-copy {
      max-width: 760px;
      font-size: 0.98rem;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 14px;
    }

    .section-title h2 {
      margin-bottom: 4px;
    }

    .announcement-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px 220px;
      gap: 12px;
      align-items: end;
    }

    .announcement-toggle {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 42px;
      padding: 0 2px;
      color: var(--muted);
      font-size: 0.92rem;
      font-weight: 700;
    }

    .announcement-toggle input {
      width: 18px;
      height: 18px;
      min-height: auto;
      accent-color: #7fd3ff;
    }

    @media (max-width: 980px) {
      .toolbar, .stats, .licenses, .meta, .dialog-grid, .hero-grid, .announcement-grid {
        grid-template-columns: 1fr;
      }

      .hero-actions {
        justify-content: flex-start;
      }
    }
  </style>
</head>
<body>
  <main class="app">
    <section class="panel">
      <div class="hero-grid">
        <div>
          <div class="hero-kicker">Admin licences</div>
          <h1 class="hero-title">Pilotage des acces clients</h1>
          <p class="hero-copy">Un tableau pour suivre les activations, voir l'etat des machines, repérer les versions app utilisées et intervenir rapidement.</p>
        </div>
        <div class="hero-actions">
          <button type="button" id="refreshLicensesButton">Rafraichir</button>
          <button type="button" class="primary" id="openCreateLicenseButton">+ Creer une licence</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="toolbar">
        <label>
          Recherche
          <input id="searchInput" type="search" placeholder="Nom client, email, cle, note, machine...">
        </label>
        <label>
          Filtre statut
          <select id="statusFilter">
            <option value="all">Tous</option>
            <option value="active">Actives</option>
            <option value="blocked">Bloquees</option>
            <option value="suspended">Suspendues</option>
            <option value="expired">Expirees</option>
          </select>
        </label>
        <div class="actions">
          <button type="button" id="clearFiltersButton">Effacer</button>
        </div>
      </div>
      <div id="feedback"></div>
    </section>

    <section class="panel">
      <div class="stats">
        <div class="stat"><span>Licences totales</span><strong id="statTotal">${total}</strong></div>
        <div class="stat"><span>Licences actives</span><strong id="statActive">${active}</strong></div>
        <div class="stat"><span>A surveiller</span><strong id="statRisk">${risk}</strong></div>
        <div class="stat"><span>Expiration proche</span><strong id="statExpiring">${expiring}</strong></div>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <div>
          <h2>Annonce active</h2>
          <p>Publie une annonce obligatoire globale ou ciblée sur une licence ou un email. L'utilisateur la verra une seule fois, puis elle ne rebouclera pas tant que l'annonce ne change pas.</p>
        </div>
      </div>
      <div class="announcement-grid">
        <label>
          Titre
          <input id="announcementTitle" type="text" placeholder="Maintenance, mise a jour, information...">
        </label>
        <label>
          Cible
          <select id="announcementTargetType">
            <option value="all">Tous les utilisateurs</option>
            <option value="license_key">Licence precise</option>
            <option value="customer_email">Email precis</option>
          </select>
        </label>
        <label>
          Valeur cible
          <input id="announcementTargetValue" type="text" placeholder="Laisse vide pour une annonce globale">
        </label>
        <label style="grid-column:1 / -1;">
          Message
          <textarea id="announcementMessage" placeholder="Ton message obligatoire dans l'application..."></textarea>
        </label>
        <label class="announcement-toggle">
          <input id="announcementActive" type="checkbox">
          <span>Annonce active</span>
        </label>
        <div class="actions" style="grid-column:1 / -1;">
          <button type="button" class="primary" id="saveAnnouncementButton">Enregistrer l'annonce</button>
          <button type="button" id="clearAnnouncementButton">Retirer l'annonce</button>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">
        <div>
          <h2>Portefeuille clients</h2>
          <p id="tableSubtitle">${escapeHtml(initialSubtitle)}</p>
        </div>
      </div>
      <div class="licenses" id="licensesGrid">
        ${initialCardsHtml}
      </div>
    </section>
  </main>

  <dialog id="createLicenseDialog">
    <form method="dialog" class="dialog-shell" id="createLicenseForm">
      <h2>Nouvelle licence</h2>
      <div class="dialog-grid">
        <label>Cle de licence<input id="licenseKey" name="license_key" type="text" required></label>
        <label>Nom du client<input id="customerName" name="customer_name" type="text" required></label>
        <label>Email<input id="customerEmail" name="customer_email" type="email"></label>
        <label>Statut
          <select id="licenseStatus" name="status">
            <option value="active">Active</option>
            <option value="blocked">Bloquee</option>
            <option value="suspended">Suspendue</option>
            <option value="expired">Expiree</option>
          </select>
        </label>
        <label>Expiration<input id="licenseExpiration" name="expires_at" type="date"></label>
        <label>Duree rapide
          <select id="licenseDurationPreset">
            <option value="">Choisir...</option>
            <option value="7d">7 jours</option>
            <option value="1m">1 mois</option>
            <option value="3m">3 mois</option>
            <option value="6m">6 mois</option>
            <option value="1y">1 an</option>
          </select>
        </label>
        <label>Max appareils<input id="licenseDevices" name="max_devices" type="number" min="1" step="1" value="1"></label>
        <label class="full">Notes<textarea id="licenseNotes" name="notes"></textarea></label>
      </div>
      <div class="actions">
        <button type="button" id="closeCreateLicenseButton">Annuler</button>
        <button type="submit" class="primary">Enregistrer</button>
      </div>
    </form>
  </dialog>

  <dialog id="editLicenseDialog">
    <form method="dialog" class="dialog-shell" id="editLicenseForm">
      <h2>Modifier la licence</h2>
      <div class="dialog-grid">
        <label>Cle de licence<input id="editLicenseKey" name="license_key" type="text" readonly></label>
        <label>Nom du client<input id="editCustomerName" name="customer_name" type="text" required></label>
        <label>Email<input id="editCustomerEmail" name="customer_email" type="email"></label>
        <label>Statut
          <select id="editLicenseStatus" name="status">
            <option value="active">Active</option>
            <option value="blocked">Bloquee</option>
            <option value="suspended">Suspendue</option>
            <option value="expired">Expiree</option>
          </select>
        </label>
        <label>Expiration<input id="editLicenseExpiration" name="expires_at" type="date"></label>
        <label>Duree rapide
          <select id="editLicenseDurationPreset">
            <option value="">Choisir...</option>
            <option value="7d">7 jours</option>
            <option value="1m">1 mois</option>
            <option value="3m">3 mois</option>
            <option value="6m">6 mois</option>
            <option value="1y">1 an</option>
          </select>
        </label>
        <label>Max appareils<input id="editLicenseDevices" name="max_devices" type="number" min="1" step="1" value="1"></label>
        <label class="full">Notes<textarea id="editLicenseNotes" name="notes"></textarea></label>
      </div>
      <div class="actions">
        <button type="button" id="closeEditLicenseButton">Annuler</button>
        <button type="submit" class="primary">Enregistrer</button>
      </div>
    </form>
  </dialog>

  <dialog id="expirationDialog">
    <form method="dialog" class="dialog-shell" id="expirationForm">
      <input type="hidden" name="license_key" id="expirationLicenseKey">
      <h2>Modifier l'expiration</h2>
      <label>Date d'expiration<input id="expirationDate" name="expires_at" type="date"></label>
      <label>Duree rapide
        <select id="expirationDurationPreset">
          <option value="">Choisir...</option>
          <option value="7d">7 jours</option>
          <option value="1m">1 mois</option>
          <option value="3m">3 mois</option>
          <option value="6m">6 mois</option>
          <option value="1y">1 an</option>
        </select>
      </label>
      <div class="actions">
        <button type="button" id="clearExpirationButton">Retirer la date</button>
        <button type="button" id="closeExpirationButton">Annuler</button>
        <button type="submit" class="primary">Mettre a jour</button>
      </div>
    </form>
  </dialog>

  <script>
    window.__INITIAL_LICENSES__ = ${serializedLicenses};
    window.__INITIAL_ANNOUNCEMENT__ = ${serializedAnnouncement};

    const feedback = document.getElementById('feedback');
    const licensesGrid = document.getElementById('licensesGrid');
    const createDialog = document.getElementById('createLicenseDialog');
    const createForm = document.getElementById('createLicenseForm');
    const editDialog = document.getElementById('editLicenseDialog');
    const editForm = document.getElementById('editLicenseForm');
    const expirationDialog = document.getElementById('expirationDialog');
    const expirationForm = document.getElementById('expirationForm');
    const createExpirationInput = document.getElementById('licenseExpiration');
    const createDurationPreset = document.getElementById('licenseDurationPreset');
    const editExpirationInput = document.getElementById('editLicenseExpiration');
    const editDurationPreset = document.getElementById('editLicenseDurationPreset');
    const expirationDateInput = document.getElementById('expirationDate');
    const expirationDurationPreset = document.getElementById('expirationDurationPreset');
    const expirationLicenseKeyInput = document.getElementById('expirationLicenseKey');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const tableSubtitle = document.getElementById('tableSubtitle');
    const statTotal = document.getElementById('statTotal');
    const statActive = document.getElementById('statActive');
    const statRisk = document.getElementById('statRisk');
    const statExpiring = document.getElementById('statExpiring');
    const refreshLicensesButton = document.getElementById('refreshLicensesButton');
    const openCreateLicenseButton = document.getElementById('openCreateLicenseButton');
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    const closeCreateLicenseButton = document.getElementById('closeCreateLicenseButton');
    const closeEditLicenseButton = document.getElementById('closeEditLicenseButton');
    const clearExpirationButton = document.getElementById('clearExpirationButton');
    const closeExpirationButton = document.getElementById('closeExpirationButton');
    const announcementTitle = document.getElementById('announcementTitle');
    const announcementMessage = document.getElementById('announcementMessage');
    const announcementTargetType = document.getElementById('announcementTargetType');
    const announcementTargetValue = document.getElementById('announcementTargetValue');
    const announcementActive = document.getElementById('announcementActive');
    const saveAnnouncementButton = document.getElementById('saveAnnouncementButton');
    const clearAnnouncementButton = document.getElementById('clearAnnouncementButton');

    let allLicenses = Array.isArray(window.__INITIAL_LICENSES__) ? window.__INITIAL_LICENSES__ : [];
    let activeAnnouncement = window.__INITIAL_ANNOUNCEMENT__ || null;
    const statusLabels = {
      active: 'Active',
      blocked: 'Bloquee',
      suspended: 'Suspendue',
      expired: 'Expiree'
    };

    function setFeedback(message, isError = false) {
      feedback.textContent = message || '';
      feedback.className = message ? 'visible' : '';
      if (message && isError) {
        feedback.classList.add('error');
      }
    }

    function updateAnnouncementTargetField() {
      announcementTargetValue.disabled = announcementTargetType.value === 'all';
      if (announcementTargetValue.disabled) {
        announcementTargetValue.value = '';
        announcementTargetValue.placeholder = 'Laisse vide pour une annonce globale';
      } else if (announcementTargetType.value === 'license_key') {
        announcementTargetValue.placeholder = 'Ex: CLIENT-001';
      } else {
        announcementTargetValue.placeholder = 'Ex: client@email.com';
      }
    }

    function syncAnnouncementForm() {
      const announcement = activeAnnouncement || null;
      announcementTitle.value = announcement?.title || '';
      announcementMessage.value = announcement?.message || '';
      announcementTargetType.value = announcement?.target_type || 'all';
      announcementTargetValue.value = announcement?.target_value || '';
      announcementActive.checked = Boolean(announcement?.active);
      updateAnnouncementTargetField();
    }

    async function api(path, options = {}) {
      const response = await fetch(path, {
        credentials: 'same-origin',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const data = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };
      if (!response.ok) {
        throw new Error(data.error || ('HTTP ' + response.status));
      }
      return data;
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function escapeJsSingleQuoted(value) {
      return String(value || '')
        .replace(/\\\\/g, '\\\\\\\\')
        .replace(/'/g, "\\'")
        .replace(/\\r/g, '\\r')
        .replace(/\\n/g, '\\n');
    }

    function formatDateTime(value, emptyLabel = 'Aucune') {
      if (!value) return emptyLabel;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return escapeHtml(value);
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    function formatDateOnly(value, emptyLabel = 'Aucune') {
      if (!value) return emptyLabel;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return escapeHtml(value);
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    }

    function toInputDateValue(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
    }

    function isExpiringSoon(value) {
      if (!value) return false;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      const delta = date.getTime() - Date.now();
      return delta >= 0 && delta <= 14 * 24 * 60 * 60 * 1000;
    }

    function getPresetExpirationDate(preset) {
      if (!preset) return '';

      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (preset === '7d') {
        target.setDate(target.getDate() + 6);
      } else if (preset === '1m') {
        target.setMonth(target.getMonth() + 1);
      } else if (preset === '3m') {
        target.setMonth(target.getMonth() + 3);
      } else if (preset === '6m') {
        target.setMonth(target.getMonth() + 6);
      } else if (preset === '1y') {
        target.setFullYear(target.getFullYear() + 1);
      } else {
        return '';
      }

      return target.getFullYear() + '-' + String(target.getMonth() + 1).padStart(2, '0') + '-' + String(target.getDate()).padStart(2, '0');
    }

    function bindDurationPreset(selectEl, dateInputEl) {
      if (!selectEl || !dateInputEl) return;
      selectEl.addEventListener('change', () => {
        const value = getPresetExpirationDate(selectEl.value);
        if (value) {
          dateInputEl.value = value;
        }
      });
    }

    function getStatusLabel(status) {
      return statusLabels[status] || status || 'Inconnu';
    }

    function renderLicenseCard(license) {
      const safeKey = escapeHtml(license.license_key);
      const safeExpiration = escapeHtml(license.expires_at || '');
      const machines = Array.isArray(license.machine_ids) ? license.machine_ids : [];

      return '<article class="license">' +
        '<div class="license-head">' +
          '<div>' +
            '<strong>' + escapeHtml(license.customer_name || 'Client sans nom') + '</strong><br>' +
            '<span style="color:var(--muted)">' + escapeHtml(license.customer_email || 'Aucun email') + '</span>' +
          '</div>' +
          '<span class="status ' + escapeHtml(license.status) + '">' + escapeHtml(getStatusLabel(license.status)) + '</span>' +
        '</div>' +
        '<div class="meta">' +
          '<div class="meta-item"><span>Cle</span><div class="license-key">' + safeKey + '</div></div>' +
          '<div class="meta-item"><span>Appareils</span><div>' + escapeHtml(String(machines.length)) + ' / ' + escapeHtml(String(license.max_devices || 1)) + '</div></div>' +
          '<div class="meta-item"><span>Expiration</span><div>' + formatDateOnly(license.expires_at, 'Aucune') + '</div></div>' +
          '<div class="meta-item"><span>Derniere activite</span><div>' + formatDateTime(license.last_seen_at, 'Jamais') + '</div></div>' +
          '<div class="meta-item"><span>Version app</span><div>' + escapeHtml(license.last_app_version || 'Inconnue') + '</div></div>' +
        '</div>' +
        '<div class="meta-item" style="margin-bottom:12px"><span>Machines</span><div>' + escapeHtml(machines.length ? machines.join(' | ') : 'Aucune machine rattachee') + '</div></div>' +
        '<div class="meta-item" style="margin-bottom:12px"><span>Notes</span><div>' + escapeHtml(license.notes || 'Aucune note') + '</div></div>' +
        '<div class="actions">' +
          '<button type="button" class="primary" data-action="edit-license" data-license-key="' + safeKey + '">Modifier</button>' +
          '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="active">Activer</button>' +
          '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="suspended">Suspendre</button>' +
          '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="blocked">Bloquer</button>' +
          '<button type="button" data-action="set-status" data-license-key="' + safeKey + '" data-status="expired">Expirer</button>' +
          '<button type="button" data-action="set-expiration" data-license-key="' + safeKey + '" data-license-expiration="' + safeExpiration + '">Expiration</button>' +
          '<button type="button" data-action="reset-machines" data-license-key="' + safeKey + '">Reset appareils</button>' +
        '</div>' +
      '</article>';
    }

    function upsertLocalLicense(license) {
      if (!license || !license.license_key) {
        return;
      }

      const nextKey = String(license.license_key);
      const nextIndex = allLicenses.findIndex((item) => String(item.license_key || '') === nextKey);
      if (nextIndex >= 0) {
        allLicenses[nextIndex] = license;
      } else {
        allLicenses.push(license);
      }

      allLicenses.sort((left, right) => {
        const leftValue = String(left.customer_name || left.license_key || '').toLowerCase();
        const rightValue = String(right.customer_name || right.license_key || '').toLowerCase();
        return leftValue.localeCompare(rightValue, 'fr', { numeric: true });
      });
    }

    function applyLicenseMutation(license, message) {
      upsertLocalLicense(license);
      updateStats(allLicenses);
      renderLicenses();
      setFeedback(message);
    }

    function updateStats(licenses) {
      const total = licenses.length;
      const active = licenses.filter((license) => license.status === 'active').length;
      const risk = licenses.filter((license) => ['blocked', 'suspended', 'expired'].includes(license.status)).length;
      const expiring = licenses.filter((license) => isExpiringSoon(license.expires_at)).length;
      statTotal.textContent = String(total);
      statActive.textContent = String(active);
      statRisk.textContent = String(risk);
      statExpiring.textContent = String(expiring);
    }

    function findLicenseByKey(key) {
      return allLicenses.find((license) => String(license.license_key || '') === String(key || '')) || null;
    }

    function getFilteredLicenses() {
      const search = String(searchInput.value || '').trim().toLowerCase();
      const status = statusFilter.value || 'all';
      return allLicenses.filter((license) => {
        if (status !== 'all' && license.status !== status) return false;
        if (!search) return true;
        const haystack = [
          license.customer_name,
          license.customer_email,
          license.license_key,
          license.last_app_version,
          license.notes,
          ...(Array.isArray(license.machine_ids) ? license.machine_ids : [])
        ].join(' ').toLowerCase();
        return haystack.includes(search);
      });
    }

    function renderLicenses() {
      const licenses = getFilteredLicenses();
      const total = allLicenses.length;
      tableSubtitle.textContent = total ? licenses.length + ' licence(s) affichee(s) sur ' + total + '.' : 'Aucune licence pour le moment.';

      if (!licenses.length) {
        licensesGrid.innerHTML = '<div class="empty">Aucun resultat.</div>';
        return;
      }

      licensesGrid.innerHTML = licenses.map((license) => renderLicenseCard(license)).join('');
    }

    async function setStatus(key, status) {
      try {
        const data = await api('/api/licenses/set-status', {
          method: 'POST',
          body: JSON.stringify({ license_key: key, status })
        });
        applyLicenseMutation(data.license, 'Statut mis a jour.');
      } catch (error) {
        setFeedback(error.message, true);
      }
    }

    async function resetMachines(key) {
      try {
        const data = await api('/api/licenses/reset-machines', {
          method: 'POST',
          body: JSON.stringify({ license_key: key })
        });
        applyLicenseMutation(data.license, 'Appareils reinitialises.');
      } catch (error) {
        setFeedback(error.message, true);
      }
    }

    function openCreateDialog() {
      createForm.reset();
      createForm.elements.max_devices.value = '1';
      if (createDurationPreset) {
        createDurationPreset.value = '';
      }
      createDialog.showModal();
    }

    function closeCreateDialog() {
      createDialog.close();
    }

    function openEditDialog(licenseKey) {
      const license = findLicenseByKey(licenseKey);
      if (!license) {
        setFeedback('Licence introuvable.', true);
        return;
      }
      editForm.elements.license_key.value = String(license.license_key || '');
      editForm.elements.customer_name.value = String(license.customer_name || '');
      editForm.elements.customer_email.value = String(license.customer_email || '');
      editForm.elements.status.value = String(license.status || 'active');
      editForm.elements.expires_at.value = toInputDateValue(license.expires_at);
      if (editDurationPreset) {
        editDurationPreset.value = '';
      }
      editForm.elements.max_devices.value = String(license.max_devices || 1);
      editForm.elements.notes.value = String(license.notes || '');
      editDialog.showModal();
    }

    function closeEditDialog() {
      editDialog.close();
    }

    function openExpirationDialog(licenseKey, expiresAt) {
      expirationLicenseKeyInput.value = licenseKey;
      expirationDateInput.value = toInputDateValue(expiresAt);
      if (expirationDurationPreset) {
        expirationDurationPreset.value = '';
      }
      expirationDialog.showModal();
    }

    function closeExpirationDialog() {
      expirationDialog.close();
    }

    function clearExpirationValue() {
      expirationDateInput.value = '';
      if (expirationDurationPreset) {
        expirationDurationPreset.value = '';
      }
    }

    function clearFilters() {
      searchInput.value = '';
      statusFilter.value = 'all';
      renderLicenses();
    }

    async function loadAnnouncement() {
      try {
        const data = await api('/api/announcements/active');
        activeAnnouncement = data.announcement || null;
        syncAnnouncementForm();
      } catch (error) {
        setFeedback(error.message, true);
      }
    }

    async function saveAnnouncement() {
      try {
        const payload = {
          title: String(announcementTitle.value || '').trim(),
          message: String(announcementMessage.value || '').trim(),
          target_type: String(announcementTargetType.value || 'all').trim(),
          target_value: String(announcementTargetValue.value || '').trim(),
          active: Boolean(announcementActive.checked)
        };
        const data = await api('/api/announcements/upsert', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        activeAnnouncement = data.announcement || null;
        syncAnnouncementForm();
        setFeedback('Annonce enregistree avec succes.');
      } catch (error) {
        setFeedback(error.message, true);
      }
    }

    async function clearAnnouncement() {
      try {
        const data = await api('/api/announcements/clear', {
          method: 'POST',
          body: JSON.stringify({})
        });
        activeAnnouncement = data.announcement || null;
        syncAnnouncementForm();
        setFeedback('Annonce retiree.');
      } catch (error) {
        setFeedback(error.message, true);
      }
    }

    createForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(createForm);
      const payload = {
        license_key: String(formData.get('license_key') || '').trim(),
        customer_name: String(formData.get('customer_name') || '').trim(),
        customer_email: String(formData.get('customer_email') || '').trim(),
        status: String(formData.get('status') || 'active').trim().toLowerCase(),
        expires_at: String(formData.get('expires_at') || '').trim() || null,
        max_devices: Number(formData.get('max_devices') || 1),
        notes: String(formData.get('notes') || '').trim()
      };

      try {
        const data = await api('/api/licenses/upsert', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        closeCreateDialog();
        applyLicenseMutation(data.license, 'Licence creee avec succes.');
      } catch (error) {
        setFeedback(error.message, true);
      }
    });

    editForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(editForm);
      const payload = {
        license_key: String(formData.get('license_key') || '').trim(),
        customer_name: String(formData.get('customer_name') || '').trim(),
        customer_email: String(formData.get('customer_email') || '').trim(),
        status: String(formData.get('status') || 'active').trim().toLowerCase(),
        expires_at: String(formData.get('expires_at') || '').trim() || null,
        max_devices: Number(formData.get('max_devices') || 1),
        notes: String(formData.get('notes') || '').trim()
      };

      try {
        const data = await api('/api/licenses/upsert', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        closeEditDialog();
        applyLicenseMutation(data.license, 'Licence mise a jour avec succes.');
      } catch (error) {
        setFeedback(error.message, true);
      }
    });

    expirationForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const data = await api('/api/licenses/set-expiration', {
          method: 'POST',
          body: JSON.stringify({
            license_key: String(expirationLicenseKeyInput.value || '').trim(),
            expires_at: String(expirationDateInput.value || '').trim() || null
          })
        });
        closeExpirationDialog();
        applyLicenseMutation(data.license, 'Date d expiration mise a jour.');
      } catch (error) {
        setFeedback(error.message, true);
      }
    });

    async function loadLicenses() {
      try {
        const data = await api('/api/licenses');
        allLicenses = Array.isArray(data.licenses) ? data.licenses : [];
        updateStats(allLicenses);
        renderLicenses();
        setFeedback('');
      } catch (error) {
        licensesGrid.innerHTML = '<div class="empty">Erreur de chargement.</div>';
        tableSubtitle.textContent = 'Chargement impossible.';
        setFeedback(error.message, true);
      }
    }

    licensesGrid.addEventListener('click', (event) => {
      const actionButton = event.target.closest('button[data-action]');
      if (!actionButton) {
        return;
      }

      const licenseKey = String(actionButton.dataset.licenseKey || '').trim();
      const action = String(actionButton.dataset.action || '').trim();

      if (action === 'edit-license') {
        openEditDialog(licenseKey);
        return;
      }

      if (action === 'set-status') {
        setStatus(licenseKey, String(actionButton.dataset.status || '').trim());
        return;
      }

      if (action === 'set-expiration') {
        openExpirationDialog(licenseKey, String(actionButton.dataset.licenseExpiration || ''));
        return;
      }

      if (action === 'reset-machines') {
        resetMachines(licenseKey);
      }
    });

    refreshLicensesButton.addEventListener('click', loadLicenses);
    openCreateLicenseButton.addEventListener('click', openCreateDialog);
    clearFiltersButton.addEventListener('click', clearFilters);
    closeCreateLicenseButton.addEventListener('click', closeCreateDialog);
    closeEditLicenseButton.addEventListener('click', closeEditDialog);
    clearExpirationButton.addEventListener('click', clearExpirationValue);
    closeExpirationButton.addEventListener('click', closeExpirationDialog);
    bindDurationPreset(createDurationPreset, createExpirationInput);
    bindDurationPreset(editDurationPreset, editExpirationInput);
    bindDurationPreset(expirationDurationPreset, expirationDateInput);
    searchInput.addEventListener('input', renderLicenses);
    statusFilter.addEventListener('change', renderLicenses);
    announcementTargetType.addEventListener('change', updateAnnouncementTargetField);
    saveAnnouncementButton.addEventListener('click', saveAnnouncement);
    clearAnnouncementButton.addEventListener('click', clearAnnouncement);
    syncAnnouncementForm();

    if (allLicenses.length) {
      updateStats(allLicenses);
      renderLicenses();
    } else {
      loadLicenses();
    }

    loadAnnouncement();
  </script>
</body>
</html>`;
}

module.exports = { renderAdminLicensesPage };
