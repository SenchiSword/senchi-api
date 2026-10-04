function renderAdminLoginPage(errorMessage = null) {
  const errorHtml = errorMessage
    ? `<div class="error-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${String(errorMessage).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connexion • Senchi Sword Admin</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚔️</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: dark;
      --bg: #090D16;
      --surface: #111827;
      --surface-card: #141E33;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: #38BDF8;
      
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --text-dim: #64748B;
      
      --cyan: #38BDF8;
      --cyan-glow: rgba(56, 189, 248, 0.25);
      --rose: #F43F5E;
      
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-xl: 28px;
      
      --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background-image: 
        radial-gradient(at 20% 20%, rgba(56, 189, 248, 0.12) 0px, transparent 50%),
        radial-gradient(at 80% 80%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
        linear-gradient(to bottom, #090D16, #04060A);
      background-attachment: fixed;
      -webkit-font-smoothing: antialiased;
    }

    .login-container {
      width: 100%;
      max-width: 440px;
    }

    .login-card {
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(24px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 40px 36px;
      box-shadow: var(--shadow-lg);
    }

    .brand-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .brand-logo {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: linear-gradient(135deg, #0284C7, #38BDF8);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 25px rgba(56, 189, 248, 0.4);
      margin-bottom: 16px;
    }

    .brand-logo svg {
      width: 30px;
      height: 30px;
      color: #fff;
    }

    .brand-header h1 {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #F8FAFC, #BAE6FD);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 6px;
    }

    .brand-header p {
      font-size: 0.88rem;
      color: var(--text-muted);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #FB7185;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      font-size: 0.86rem;
      font-weight: 600;
      margin-bottom: 24px;
      animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97);
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }

    form {
      display: grid;
      gap: 20px;
    }

    .form-group {
      display: grid;
      gap: 8px;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      width: 18px;
      height: 18px;
      color: var(--text-dim);
      pointer-events: none;
    }

    .form-control {
      width: 100%;
      padding: 12px 14px 12px 42px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      color: var(--text-main);
      font-size: 0.95rem;
      font-family: inherit;
      outline: none;
      transition: all 0.2s;
    }

    .form-control:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 0 3px var(--cyan-glow);
    }

    .toggle-pwd-btn {
      position: absolute;
      right: 12px;
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
    }

    .toggle-pwd-btn:hover {
      color: var(--cyan);
    }

    .submit-btn {
      margin-top: 8px;
      padding: 13px;
      background: linear-gradient(135deg, #0284C7, #0EA5E9 60%, #38BDF8);
      color: #031525;
      font-size: 0.95rem;
      font-weight: 800;
      font-family: inherit;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
      transition: all 0.2s;
    }

    .submit-btn:hover {
      background: linear-gradient(135deg, #0369A1, #0284C7 60%, #38BDF8);
      box-shadow: 0 8px 24px rgba(14, 165, 233, 0.5);
      transform: translateY(-1px);
    }

    .submit-btn:active {
      transform: translateY(0);
    }

    .footer-note {
      text-align: center;
      margin-top: 24px;
      font-size: 0.78rem;
      color: var(--text-dim);
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="login-card">
      <div class="brand-header">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1>SENCHI SWORD</h1>
        <p>Connexion à l'espace d'administration</p>
      </div>

      ${errorHtml}

      <form action="/admin/login" method="POST">
        <div class="form-group">
          <label for="username">Identifiant</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input type="text" id="username" name="username" class="form-control" placeholder="Nom d'utilisateur" required autofocus>
          </div>
        </div>

        <div class="form-group">
          <label for="password">Mot de passe</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input type="password" id="password" name="password" class="form-control" placeholder="••••••••••••" required>
            <button type="button" class="toggle-pwd-btn" id="togglePwd" title="Afficher/Masquer le mot de passe">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="submit-btn">Se connecter</button>
      </form>

      <div class="footer-note">
        Accès restreint • Comte Harebourg Security
      </div>
    </div>
  </div>

  <script>
    const toggleBtn = document.getElementById('togglePwd');
    const pwdInput = document.getElementById('password');
    if (toggleBtn && pwdInput) {
      toggleBtn.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
      });
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderAdminLoginPage
};
