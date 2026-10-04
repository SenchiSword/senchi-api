function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffDays = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) {
    const past = Math.abs(diffDays);
    return past === 1 ? 'Expiré hier' : `Expiré il y a ${past}j`;
  }
  if (diffDays === 0) return "Expire aujourd'hui";
  if (diffDays === 1) return 'Expire demain';
  return `Dans ${diffDays}j`;
}

function isExpiringSoon(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const delta = date.getTime() - Date.now();
  return delta >= 0 && delta <= 14 * 24 * 60 * 60 * 1000;
}

function renderAdminLicensesPage(initialLicenses = [], initialAnnouncement = null) {
  const serializedLicenses = JSON.stringify(Array.isArray(initialLicenses) ? initialLicenses : []);
  const serializedAnnouncement = JSON.stringify(initialAnnouncement || null);

  const total = initialLicenses.length;
  const active = initialLicenses.filter((l) => l.status === 'active').length;
  const risk = initialLicenses.filter((l) => ['blocked', 'suspended', 'expired'].includes(l.status)).length;
  const expiring = initialLicenses.filter((l) => isExpiringSoon(l.expires_at)).length;

  return `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senchi Admin • Gestion des Licences</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: dark;
      --bg: #090D16;
      --surface: #111827;
      --surface-card: #141E33;
      --surface-hover: #1A2744;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: #38BDF8;
      
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --text-dim: #64748B;
      
      --cyan: #38BDF8;
      --cyan-glow: rgba(56, 189, 248, 0.25);
      --blue: #3B82F6;
      --emerald: #10B981;
      --emerald-glow: rgba(16, 185, 129, 0.2);
      --amber: #F59E0B;
      --rose: #F43F5E;
      --purple: #8B5CF6;
      
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-xl: 28px;
      
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
      --shadow-md: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 20px 40px -10px rgba(0, 0, 0, 0.6);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      background-image: 
        radial-gradient(at 10% 10%, rgba(56, 189, 248, 0.08) 0px, transparent 40%),
        radial-gradient(at 90% 90%, rgba(59, 130, 246, 0.06) 0px, transparent 40%),
        linear-gradient(to bottom, #090D16, #05070B);
      background-attachment: fixed;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 32px 24px 60px;
    }

    /* Top Navigation Header */
    header.navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: rgba(17, 24, 39, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      margin-bottom: 28px;
      box-shadow: var(--shadow-sm);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284C7, #38BDF8);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.35);
    }

    .brand-icon svg {
      width: 24px;
      height: 24px;
      color: #fff;
    }

    .brand-info h1 {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #F8FAFC, #BAE6FD);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--emerald);
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 2px 8px;
      border-radius: 20px;
    }

    .brand-badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 0.88rem;
      font-weight: 600;
      font-family: inherit;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-decoration: none;
      user-select: none;
    }

    .btn:hover {
      background: var(--surface-hover);
      border-color: rgba(255, 255, 255, 0.16);
      transform: translateY(-1px);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-primary {
      background: linear-gradient(135deg, #0284C7, #0EA5E9 60%, #38BDF8);
      color: #031525;
      font-weight: 700;
      border: none;
      box-shadow: 0 4px 18px rgba(14, 165, 233, 0.35);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #0369A1, #0284C7 60%, #38BDF8);
      box-shadow: 0 6px 22px rgba(14, 165, 233, 0.5);
    }

    .btn-danger {
      background: linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(225, 29, 72, 0.35));
      border: 1px solid rgba(244, 63, 94, 0.45);
      color: #FDA4AF;
      font-weight: 700;
    }

    .btn-danger:hover {
      background: linear-gradient(135deg, #E11D48, #F43F5E);
      color: #FFF;
      border-color: #F43F5E;
      box-shadow: 0 4px 18px rgba(244, 63, 94, 0.4);
    }

    .btn-icon-only {
      padding: 10px;
      border-radius: var(--radius-md);
    }

    /* KPI Metrics Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .metric-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .metric-info span {
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .metric-info strong {
      display: block;
      font-size: 2rem;
      font-weight: 800;
      margin-top: 4px;
      letter-spacing: -0.03em;
    }

    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .metric-icon svg {
      width: 24px;
      height: 24px;
    }

    .metric-total .metric-icon { background: rgba(56, 189, 248, 0.12); color: var(--cyan); }
    .metric-active .metric-icon { background: rgba(16, 185, 129, 0.12); color: var(--emerald); }
    .metric-risk .metric-icon { background: rgba(244, 63, 94, 0.12); color: var(--rose); }
    .metric-expiring .metric-icon { background: rgba(245, 158, 11, 0.12); color: var(--amber); }

    /* Main Table Section */
    .table-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    /* Table Toolbar */
    .table-toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      background: rgba(17, 24, 39, 0.5);
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 280px;
      max-width: 420px;
    }

    .search-box svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: var(--text-dim);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 42px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text-main);
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 0 3px var(--cyan-glow);
    }

    /* Filter Pills */
    .filter-tabs {
      display: flex;
      gap: 6px;
      background: var(--bg);
      padding: 4px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
    }

    .filter-tab {
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }

    .filter-tab.active {
      background: var(--surface-card);
      color: var(--cyan);
      box-shadow: var(--shadow-sm);
    }

    .filter-tab:hover:not(.active) {
      color: var(--text-main);
    }

    /* Data Table */
    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.88rem;
    }

    thead th {
      padding: 14px 20px;
      font-size: 0.76rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      background: rgba(11, 15, 25, 0.6);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }

    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background 0.15s;
    }

    tbody tr:hover {
      background: var(--surface-hover);
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    tbody td {
      padding: 16px 20px;
      vertical-align: middle;
      white-space: nowrap;
    }

    /* Customer Info Cell */
    .customer-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(59, 130, 246, 0.2));
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: var(--cyan);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.88rem;
      flex-shrink: 0;
    }

    .customer-details strong {
      display: block;
      font-weight: 700;
      color: var(--text-main);
      font-size: 0.92rem;
    }

    .customer-details span {
      display: block;
      color: var(--text-dim);
      font-size: 0.8rem;
    }

    /* License Key Cell */
    .key-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      color: #E2E8F0;
    }

    .copy-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 4px;
      transition: color 0.15s;
    }

    .copy-btn:hover {
      color: var(--cyan);
    }

    /* Status Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .badge.active {
      background: rgba(16, 185, 129, 0.12);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .badge.active .badge-dot { background: #34D399; box-shadow: 0 0 8px #34D399; }

    .badge.suspended {
      background: rgba(245, 158, 11, 0.12);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }
    .badge.suspended .badge-dot { background: #FBBF24; box-shadow: 0 0 8px #FBBF24; }

    .badge.blocked {
      background: rgba(244, 63, 94, 0.12);
      color: #FB7185;
      border: 1px solid rgba(244, 63, 94, 0.25);
    }
    .badge.blocked .badge-dot { background: #FB7185; box-shadow: 0 0 8px #FB7185; }

    .badge.expired {
      background: rgba(100, 116, 139, 0.15);
      color: #94A3B8;
      border: 1px solid rgba(100, 116, 139, 0.25);
    }
    .badge.expired .badge-dot { background: #94A3B8; }

    /* Expiration Column */
    .exp-wrapper strong {
      display: block;
      font-size: 0.88rem;
      font-weight: 600;
    }

    .exp-relative {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-dim);
    }

    .exp-relative.warning {
      color: var(--amber);
    }

    .exp-relative.danger {
      color: var(--rose);
    }

    /* Device Cell */
    .device-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .device-count {
      font-weight: 700;
      color: var(--text-main);
    }

    .machine-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      color: var(--cyan);
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.18);
      padding: 2px 6px;
      border-radius: 4px;
      max-width: 110px;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: help;
    }

    .btn-unlink {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 4px 6px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.74rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }

    .btn-unlink:hover {
      background: rgba(244, 63, 94, 0.12);
      border-color: rgba(244, 63, 94, 0.3);
      color: var(--rose);
    }

    /* Actions Column Buttons */
    .action-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-btn {
      padding: 6px 10px;
      font-size: 0.78rem;
      font-weight: 600;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--surface-card);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }

    .action-btn:hover {
      background: var(--surface-hover);
      color: var(--text-main);
      border-color: rgba(255, 255, 255, 0.18);
    }

    .action-btn.edit-btn:hover {
      color: var(--cyan);
      border-color: var(--cyan);
    }

    .action-btn.delete-btn:hover {
      background: rgba(244, 63, 94, 0.12);
      border-color: rgba(244, 63, 94, 0.3);
      color: var(--rose);
    }

    /* Empty state */
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      color: var(--text-dim);
      margin-bottom: 12px;
    }

    /* Modal Dialogs */
    dialog {
      margin: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      background: rgba(17, 24, 39, 0.94);
      backdrop-filter: blur(24px);
      color: var(--text-main);
      padding: 0;
      max-width: 560px;
      width: calc(100% - 32px);
      box-shadow: var(--shadow-lg);
      outline: none;
    }

    dialog::backdrop {
      background: rgba(4, 7, 13, 0.75);
      backdrop-filter: blur(8px);
    }

    .dialog-header {
      padding: 24px 24px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dialog-header h3 {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .close-dialog-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      padding: 4px;
    }

    .close-dialog-btn:hover {
      color: var(--text-main);
    }

    .dialog-body {
      padding: 24px;
      display: grid;
      gap: 18px;
    }

    .form-group {
      display: grid;
      gap: 6px;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text-main);
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }

    .form-control:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 0 3px var(--cyan-glow);
    }

    .input-with-button {
      display: flex;
      gap: 8px;
    }

    .quick-preset-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }

    .chip-btn {
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s;
    }

    .chip-btn:hover {
      background: rgba(56, 189, 248, 0.12);
      border-color: var(--cyan);
      color: var(--cyan);
    }

    .dialog-footer {
      padding: 16px 24px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* Toast Notifications */
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: grid;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      background: var(--surface-card);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 12px 18px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toast.success { border-color: rgba(16, 185, 129, 0.4); }
    .toast.error { border-color: rgba(244, 63, 94, 0.4); }

    @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (max-width: 860px) {
      .form-row { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: 1fr 1fr; }
      .table-toolbar { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Navbar -->
    <header class="navbar">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="brand-info">
          <h1>SENCHI SWORD • LICENCES</h1>
          <div class="brand-badge">Supabase Live</div>
        </div>
      </div>
      <div class="nav-actions">
        <button type="button" class="btn" id="openAnnouncementBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Annonce en jeu
        </button>
        <button type="button" class="btn" id="refreshBtn" title="Actualiser la liste">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="refreshIcon"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Actualiser
        </button>
        <button type="button" class="btn btn-primary" id="openCreateBtn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvelle Licence
        </button>
        <a href="/admin/logout" class="btn" title="Se déconnecter" style="color:var(--rose); border-color:rgba(244,63,94,0.3);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Déconnexion
        </a>
      </div>
    </header>

    <!-- Metrics Cards -->
    <section class="metrics-grid">
      <div class="metric-card metric-total">
        <div class="metric-info">
          <span>Total Licences</span>
          <strong id="statTotal">${total}</strong>
        </div>
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
        </div>
      </div>
      <div class="metric-card metric-active">
        <div class="metric-info">
          <span>Licences Actives</span>
          <strong id="statActive">${active}</strong>
        </div>
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
      </div>
      <div class="metric-card metric-expiring">
        <div class="metric-info">
          <span>Expiration &lt; 14j</span>
          <strong id="statExpiring">${expiring}</strong>
        </div>
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div class="metric-card metric-risk">
        <div class="metric-info">
          <span>Bloquées / Expirées</span>
          <strong id="statRisk">${risk}</strong>
        </div>
        <div class="metric-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
      </div>
    </section>

    <!-- Main Table Container -->
    <section class="table-section">
      <div class="table-toolbar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="searchInput" class="search-input" placeholder="Rechercher par client, email, clé, note, machine...">
        </div>
        <div class="filter-tabs">
          <button type="button" class="filter-tab active" data-filter="all">Toutes</button>
          <button type="button" class="filter-tab" data-filter="active">Actives</button>
          <button type="button" class="filter-tab" data-filter="expiring">Bientôt expirées</button>
          <button type="button" class="filter-tab" data-filter="blocked">Bloquées</button>
          <button type="button" class="filter-tab" data-filter="expired">Expirées</button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Clé de Licence</th>
              <th>Statut</th>
              <th>Expiration</th>
              <th>Machine liée</th>
              <th>Dernière Activité</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="licensesTableBody">
            <!-- Dynamic rows rendered by JS -->
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <!-- Dialog: Create / Edit License -->
  <dialog id="licenseDialog">
    <form id="licenseForm">
      <input type="hidden" id="formMode" value="create">
      <div class="dialog-header">
        <h3 id="dialogTitle">Nouvelle Licence</h3>
        <button type="button" class="close-dialog-btn" onclick="document.getElementById('licenseDialog').close()">✕</button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label for="formKey">Clé de Licence</label>
          <div class="input-with-button">
            <input type="text" id="formKey" class="form-control" style="font-family:'JetBrains Mono',monospace;" required placeholder="Ex: SENCHI-XXXX-XXXX">
            <button type="button" class="btn" id="genKeyBtn" title="Générer une clé aléatoire">🎲 Générer</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="formName">Nom du Client</label>
            <input type="text" id="formName" class="form-control" required placeholder="Ex: Jean Dupont">
          </div>
          <div class="form-group">
            <label for="formEmail">Email (Optionnel)</label>
            <input type="email" id="formEmail" class="form-control" placeholder="client@exemple.com">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="formStatus">Statut</label>
            <select id="formStatus" class="form-control">
              <option value="active">Active</option>
              <option value="suspended">Suspendue</option>
              <option value="blocked">Bloquée</option>
              <option value="expired">Expirée</option>
            </select>
          </div>
          <div class="form-group">
            <label for="formDevices">Max Appareils</label>
            <input type="number" id="formDevices" class="form-control" min="1" max="10" value="1">
          </div>
        </div>

        <div class="form-group">
          <label for="formExpiration">Date d'Expiration</label>
          <input type="date" id="formExpiration" class="form-control">
          <div class="quick-preset-chips">
            <button type="button" class="chip-btn" data-days="7">+7 jours</button>
            <button type="button" class="chip-btn" data-days="30">+30 jours</button>
            <button type="button" class="chip-btn" data-days="90">+3 mois</button>
            <button type="button" class="chip-btn" data-days="365">+1 an</button>
            <button type="button" class="chip-btn" data-days="0">Permanent</button>
          </div>
        </div>

        <div class="form-group">
          <label for="formNotes">Notes Internes</label>
          <textarea id="formNotes" class="form-control" rows="2" placeholder="Informations de contact, moyen de paiement..."></textarea>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn" onclick="document.getElementById('licenseDialog').close()">Annuler</button>
        <button type="submit" class="btn btn-primary" id="saveLicenseBtn">Enregistrer</button>
      </div>
    </form>
  </dialog>

  <!-- Dialog: Announcement -->
  <dialog id="announcementDialog">
    <form id="announcementForm">
      <div class="dialog-header">
        <h3>📢 Annonce en Jeu (Pop-up Utilisateurs)</h3>
        <button type="button" class="close-dialog-btn" onclick="document.getElementById('announcementDialog').close()">✕</button>
      </div>
      <div class="dialog-body">
        <p style="font-size:0.86rem; color:var(--text-muted);">
          Publie une alerte qui s'affichera directement sur l'écran des utilisateurs au lancement de l'application.
        </p>
        <div class="form-group">
          <label for="annTitle">Titre de l'annonce</label>
          <input type="text" id="annTitle" class="form-control" placeholder="Ex: Maintenance prévue ce soir">
        </div>
        <div class="form-group">
          <label for="annMessage">Message complet</label>
          <textarea id="annMessage" class="form-control" rows="4" placeholder="Tapez votre message ici..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="annTargetType">Cible</label>
            <select id="annTargetType" class="form-control">
              <option value="all">Tous les utilisateurs</option>
              <option value="license_key">Une clé spécifique</option>
              <option value="customer_email">Un email spécifique</option>
            </select>
          </div>
          <div class="form-group">
            <label for="annTargetValue">Valeur de la cible</label>
            <input type="text" id="annTargetValue" class="form-control" placeholder="Clé ou email ciblé">
          </div>
        </div>
        <div class="form-group" style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="annActive" style="width:18px; height:18px; accent-color:var(--cyan);">
          <label for="annActive" style="cursor:pointer; text-transform:none; font-size:0.9rem;">Diffuser cette annonce maintenant</label>
        </div>
      </div>
      <div class="dialog-footer">
        <button type="button" class="btn" id="clearAnnBtn" style="color:var(--rose);">Supprimer l'annonce</button>
        <button type="submit" class="btn btn-primary">Enregistrer l'annonce</button>
      </div>
    </form>
  </dialog>

  <!-- Dialog: Custom Confirmation Dialog (No native browser popups) -->
  <dialog id="confirmDialog">
    <div class="dialog-header">
      <h3 style="display:flex; align-items:center; gap:10px;">
        <span id="confirmIcon" style="font-size:1.3rem;">⚠️</span>
        <span id="confirmHeading">Confirmation</span>
      </h3>
      <button type="button" class="close-dialog-btn" onclick="document.getElementById('confirmDialog').close()">✕</button>
    </div>
    <div class="dialog-body">
      <p id="confirmMessage" style="font-size:0.95rem; color:var(--text-main); line-height:1.6;"></p>
    </div>
    <div class="dialog-footer">
      <button type="button" class="btn" onclick="document.getElementById('confirmDialog').close()">Annuler</button>
      <button type="button" class="btn btn-danger" id="confirmActionBtn">Confirmer</button>
    </div>
  </dialog>

  <!-- Toast Container -->
  <div id="toast-container"></div>

  <script>
    let licenses = ${serializedLicenses};
    let activeAnnouncement = ${serializedAnnouncement};
    let currentFilter = 'all';

    // Elements
    const tableBody = document.getElementById('licensesTableBody');
    const searchInput = document.getElementById('searchInput');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const licenseDialog = document.getElementById('licenseDialog');
    const licenseForm = document.getElementById('licenseForm');
    const announcementDialog = document.getElementById('announcementDialog');
    const announcementForm = document.getElementById('announcementForm');
    const confirmDialog = document.getElementById('confirmDialog');
    const confirmHeading = document.getElementById('confirmHeading');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmIcon = document.getElementById('confirmIcon');
    const confirmActionBtn = document.getElementById('confirmActionBtn');

    function showConfirm({ title, message, icon = '⚠️', confirmText = 'Confirmer', danger = false }) {
      return new Promise((resolve) => {
        confirmHeading.textContent = title;
        confirmMessage.textContent = message;
        confirmIcon.textContent = icon;
        confirmActionBtn.textContent = confirmText;
        confirmActionBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

        const onConfirm = () => {
          cleanup();
          confirmDialog.close();
          resolve(true);
        };
        const onCancel = () => {
          cleanup();
          resolve(false);
        };
        function cleanup() {
          confirmActionBtn.removeEventListener('click', onConfirm);
          confirmDialog.removeEventListener('close', onCancel);
        }
        confirmActionBtn.addEventListener('click', onConfirm);
        confirmDialog.addEventListener('close', onCancel, { once: true });
        confirmDialog.showModal();
      });
    }

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.innerHTML = '<span>' + (type === 'success' ? '✓' : '⚠️') + '</span> ' + message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.2s';
        setTimeout(() => toast.remove(), 200);
      }, 3000);
    }

    function generateLicenseKey() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      function chunk(len) {
        let str = '';
        for (let i = 0; i < len; i++) str += chars.charAt(Math.floor(Math.random() * chars.length));
        return str;
      }
      return 'SENCHI-' + chunk(4) + '-' + chunk(4);
    }

    function isExpiringSoon(expiresAt) {
      if (!expiresAt) return false;
      const d = new Date(expiresAt);
      if (isNaN(d.getTime())) return false;
      const delta = d.getTime() - Date.now();
      return delta >= 0 && delta <= 14 * 24 * 60 * 60 * 1000;
    }

    function updateMetrics() {
      const total = licenses.length;
      const active = licenses.filter(l => l.status === 'active').length;
      const expiring = licenses.filter(l => isExpiringSoon(l.expires_at)).length;
      const risk = licenses.filter(l => ['blocked', 'suspended', 'expired'].includes(l.status)).length;

      document.getElementById('statTotal').textContent = total;
      document.getElementById('statActive').textContent = active;
      document.getElementById('statExpiring').textContent = expiring;
      document.getElementById('statRisk').textContent = risk;
    }

    function renderTable() {
      const query = (searchInput.value || '').trim().toLowerCase();

      const filtered = licenses.filter(lic => {
        // Status filter
        if (currentFilter === 'active' && lic.status !== 'active') return false;
        if (currentFilter === 'expiring' && !isExpiringSoon(lic.expires_at)) return false;
        if (currentFilter === 'blocked' && !['blocked', 'suspended'].includes(lic.status)) return false;
        if (currentFilter === 'expired' && lic.status !== 'expired') return false;

        // Search query
        if (query) {
          const matchKey = (lic.license_key || '').toLowerCase().includes(query);
          const matchName = (lic.customer_name || '').toLowerCase().includes(query);
          const matchEmail = (lic.customer_email || '').toLowerCase().includes(query);
          const matchNotes = (lic.notes || '').toLowerCase().includes(query);
          const matchMachine = (lic.machine_id || '').toLowerCase().includes(query);
          return matchKey || matchName || matchEmail || matchNotes || matchMachine;
        }

        return true;
      });

      if (!filtered.length) {
        tableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>' +
          '<h3>Aucune licence trouvée</h3><p>Aucune licence ne correspond à vos filtres actuels.</p></div></td></tr>';
        return;
      }

      tableBody.innerHTML = filtered.map(lic => {
        const safeKey = lic.license_key;
        const initials = (lic.customer_name || 'C').substring(0, 2).toUpperCase();
        const machines = Array.isArray(lic.machine_ids) ? lic.machine_ids : (lic.machine_id ? [lic.machine_id] : []);
        const primaryMachine = machines[0] || '';
        const shortMachine = primaryMachine ? primaryMachine.substring(0, 10) + '...' : '';

        // Expiration format
        let expText = 'Permanente';
        let expRelative = '';
        let expRelativeClass = '';
        if (lic.expires_at) {
          const d = new Date(lic.expires_at);
          if (!isNaN(d.getTime())) {
            expText = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const diffDays = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            if (diffDays < 0) {
              expRelative = 'Expiré (' + Math.abs(diffDays) + 'j)';
              expRelativeClass = 'danger';
            } else if (diffDays <= 7) {
              expRelative = diffDays === 0 ? "Aujourd'hui" : 'Dans ' + diffDays + 'j';
              expRelativeClass = 'warning';
            } else {
              expRelative = 'Dans ' + diffDays + 'j';
            }
          }
        }

        // Status badge label
        const statusMap = {
          active: 'Active',
          suspended: 'Suspendue',
          blocked: 'Bloquée',
          expired: 'Expirée'
        };
        const statusLabel = statusMap[lic.status] || lic.status;

        // Activity format
        let actText = 'Jamais';
        if (lic.last_seen_at) {
          const ad = new Date(lic.last_seen_at);
          if (!isNaN(ad.getTime())) {
            actText = ad.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' +
                      ad.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          }
        }

        return '<tr>' +
          '<td>' +
            '<div class="customer-cell">' +
              '<div class="avatar">' + initials + '</div>' +
              '<div class="customer-details">' +
                '<strong>' + (lic.customer_name || 'Sans nom') + '</strong>' +
                '<span>' + (lic.customer_email || 'Aucun email') + '</span>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td>' +
            '<div class="key-badge">' +
              '<span>' + safeKey + '</span>' +
              '<button type="button" class="copy-btn" onclick="copyText(\\'' + safeKey + '\\')" title="Copier la clé">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>' +
              '</button>' +
            '</div>' +
          '</td>' +
          '<td>' +
            '<span class="badge ' + (lic.status || 'active') + '">' +
              '<span class="badge-dot"></span>' + statusLabel +
            '</span>' +
          '</td>' +
          '<td>' +
            '<div class="exp-wrapper">' +
              '<strong>' + expText + '</strong>' +
              (expRelative ? '<span class="exp-relative ' + expRelativeClass + '">' + expRelative + '</span>' : '') +
            '</div>' +
          '</td>' +
          '<td>' +
            '<div class="device-cell">' +
              '<span class="device-count">' + machines.length + '/' + (lic.max_devices || 1) + '</span>' +
              (primaryMachine ? 
                '<span class="machine-tag" title="' + primaryMachine + '">' + shortMachine + '</span>' +
                '<button type="button" class="btn-unlink" onclick="resetDevice(\\'' + safeKey + '\\')" title="Délier cet ordinateur">' +
                  '<span>🔄</span> Délier' +
                '</button>' 
                : '<span style="color:var(--text-dim); font-size:0.8rem;">Aucune</span>') +
            '</div>' +
          '</td>' +
          '<td>' +
            '<span style="font-weight:600;">' + actText + '</span>' +
            (lic.last_app_version ? '<span style="display:block; font-size:0.75rem; color:var(--text-dim);">v' + lic.last_app_version + '</span>' : '') +
          '</td>' +
          '<td style="text-align: right;">' +
            '<div class="action-group" style="justify-content: flex-end;">' +
              '<button type="button" class="action-btn edit-btn" onclick="openEditDialog(\\'' + safeKey + '\\')" title="Modifier la licence">✏️ Éditer</button>' +
              (lic.status === 'active' 
                ? '<button type="button" class="action-btn" onclick="setStatus(\\'' + safeKey + '\\', \\'suspended\\')">⏸️ Suspendre</button>'
                : '<button type="button" class="action-btn" onclick="setStatus(\\'' + safeKey + '\\', \\'active\\')">▶️ Activer</button>') +
              '<button type="button" class="action-btn delete-btn" onclick="deleteLicenseItem(\\'' + safeKey + '\\')" title="Supprimer définitivement">🗑️</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    function copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Clé copiée dans le presse-papier !');
      }).catch(() => {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Clé copiée !');
      });
    }

    // Filter clicks
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderTable();
      });
    });

    searchInput.addEventListener('input', renderTable);

    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      const icon = document.getElementById('refreshIcon');
      icon.style.transform = 'rotate(360deg)';
      icon.style.transition = 'transform 0.5s';
      setTimeout(() => { icon.style.transform = ''; icon.style.transition = ''; }, 500);

      try {
        const res = await fetch('/api/licenses');
        const data = await res.json();
        if (data.ok && Array.isArray(data.licenses)) {
          licenses = data.licenses;
          updateMetrics();
          renderTable();
          showToast('Liste actualisée avec succès');
        }
      } catch (e) {
        showToast('Erreur actualisation: ' + e.message, 'error');
      }
    });

    // Create modal
    document.getElementById('openCreateBtn').addEventListener('click', () => {
      document.getElementById('dialogTitle').textContent = 'Nouvelle Licence';
      document.getElementById('formMode').value = 'create';
      document.getElementById('formKey').readOnly = false;
      document.getElementById('formKey').value = generateLicenseKey();
      document.getElementById('formName').value = '';
      document.getElementById('formEmail').value = '';
      document.getElementById('formStatus').value = 'active';
      document.getElementById('formDevices').value = '1';
      document.getElementById('formExpiration').value = '';
      document.getElementById('formNotes').value = '';
      licenseDialog.showModal();
    });

    document.getElementById('genKeyBtn').addEventListener('click', () => {
      document.getElementById('formKey').value = generateLicenseKey();
    });

    // Quick duration chips
    document.querySelectorAll('.chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        const days = parseInt(chip.dataset.days, 10);
        if (days === 0) {
          document.getElementById('formExpiration').value = '';
          return;
        }
        const target = new Date();
        target.setDate(target.getDate() + days);
        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, '0');
        const d = String(target.getDate()).padStart(2, '0');
        document.getElementById('formExpiration').value = y + '-' + m + '-' + d;
      });
    });

    // Open edit dialog
    window.openEditDialog = function(key) {
      const lic = licenses.find(l => l.license_key === key);
      if (!lic) return;

      document.getElementById('dialogTitle').textContent = 'Modifier la Licence';
      document.getElementById('formMode').value = 'edit';
      document.getElementById('formKey').readOnly = true;
      document.getElementById('formKey').value = lic.license_key;
      document.getElementById('formName').value = lic.customer_name || '';
      document.getElementById('formEmail').value = lic.customer_email || '';
      document.getElementById('formStatus').value = lic.status || 'active';
      document.getElementById('formDevices').value = lic.max_devices || 1;
      document.getElementById('formNotes').value = lic.notes || '';

      if (lic.expires_at) {
        const d = new Date(lic.expires_at);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          document.getElementById('formExpiration').value = y + '-' + m + '-' + day;
        } else {
          document.getElementById('formExpiration').value = '';
        }
      } else {
        document.getElementById('formExpiration').value = '';
      }

      licenseDialog.showModal();
    };

    // Save license submit
    licenseForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        license_key: document.getElementById('formKey').value.trim(),
        customer_name: document.getElementById('formName').value.trim(),
        customer_email: document.getElementById('formEmail').value.trim(),
        status: document.getElementById('formStatus').value,
        max_devices: parseInt(document.getElementById('formDevices').value, 10) || 1,
        expires_at: document.getElementById('formExpiration').value || null,
        notes: document.getElementById('formNotes').value.trim()
      };

      try {
        const res = await fetch('/api/licenses/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok && data.license) {
          const idx = licenses.findIndex(l => l.license_key === data.license.license_key);
          if (idx >= 0) licenses[idx] = data.license;
          else licenses.unshift(data.license);

          updateMetrics();
          renderTable();
          licenseDialog.close();
          showToast('Licence enregistrée avec succès !');
        } else {
          showToast('Erreur: ' + (data.error || 'Impossible d\\'enregistrer'), 'error');
        }
      } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
      }
    });

    // Reset device
    window.resetDevice = async function(key) {
      const ok = await showConfirm({
        title: 'Délier la machine',
        message: 'Voulez-vous détacher la machine liée à la clé "' + key + '" ? Le client pourra réactiver sa licence sur un nouvel ordinateur.',
        icon: '🔄',
        confirmText: 'Délier la machine',
        danger: false
      });
      if (!ok) return;
      try {
        const res = await fetch('/api/licenses/reset-machines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license_key: key })
        });
        const data = await res.json();
        if (data.ok && data.license) {
          const idx = licenses.findIndex(l => l.license_key === key);
          if (idx >= 0) licenses[idx] = data.license;
          renderTable();
          showToast('Machine réinitialisée !');
        }
      } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
      }
    };

    // Set status
    window.setStatus = async function(key, status) {
      try {
        const res = await fetch('/api/licenses/set-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license_key: key, status })
        });
        const data = await res.json();
        if (data.ok && data.license) {
          const idx = licenses.findIndex(l => l.license_key === key);
          if (idx >= 0) licenses[idx] = data.license;
          updateMetrics();
          renderTable();
          showToast('Statut mis à jour : ' + status);
        }
      } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
      }
    };

    // Delete license
    window.deleteLicenseItem = async function(key) {
      const ok = await showConfirm({
        title: 'Supprimer définitivement la licence',
        message: 'Êtes-vous sûr de vouloir SUPPRIMER DÉFINITIVEMENT cette licence ? Cette action est irréversible et supprimera la ligne de la base Supabase.',
        icon: '🗑️',
        confirmText: 'Supprimer définitivement',
        danger: true
      });
      if (!ok) return;
      try {
        const res = await fetch('/api/licenses/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license_key: key })
        });
        const data = await res.json();
        if (data.ok) {
          licenses = licenses.filter(l => l.license_key !== key);
          updateMetrics();
          renderTable();
          showToast('Licence supprimée !');
        } else {
          showToast('Erreur suppression: ' + (data.error || 'Échec'), 'error');
        }
      } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
      }
    };

    // Announcement Modal
    document.getElementById('openAnnouncementBtn').addEventListener('click', () => {
      document.getElementById('annTitle').value = activeAnnouncement?.title || '';
      document.getElementById('annMessage').value = activeAnnouncement?.message || '';
      document.getElementById('annTargetType').value = activeAnnouncement?.target_type || 'all';
      document.getElementById('annTargetValue').value = activeAnnouncement?.target_value || '';
      document.getElementById('annActive').checked = Boolean(activeAnnouncement?.active);
      announcementDialog.showModal();
    });

    announcementForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('annTitle').value.trim(),
        message: document.getElementById('annMessage').value.trim(),
        target_type: document.getElementById('annTargetType').value,
        target_value: document.getElementById('annTargetValue').value.trim(),
        active: document.getElementById('annActive').checked
      };

      try {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) {
          activeAnnouncement = data.announcement;
          announcementDialog.close();
          showToast('Annonce enregistrée !');
        }
      } catch (err) {
        showToast('Erreur annonce: ' + err.message, 'error');
      }
    });

    document.getElementById('clearAnnBtn').addEventListener('click', async () => {
      const ok = await showConfirm({
        title: 'Retirer l\'annonce',
        message: 'Voulez-vous désactiver et supprimer l\'annonce active actuellement affichée aux joueurs ?',
        icon: '📢',
        confirmText: 'Retirer l\'annonce',
        danger: true
      });
      if (!ok) return;
      try {
        const res = await fetch('/api/announcements/clear', { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          activeAnnouncement = null;
          announcementDialog.close();
          showToast('Annonce retirée !');
        }
      } catch (err) {
        showToast('Erreur: ' + err.message, 'error');
      }
    });

    // Initial render
    updateMetrics();
    renderTable();
  </script>
</body>
</html>`;
}

module.exports = {
  renderAdminLicensesPage
};
