const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const {
  getLicenses,
  findLicenseByKey,
  saveLicense,
  deleteLicense
} = require('./licensesStore');
const {
  getActiveAnnouncement,
  saveActiveAnnouncement,
  clearActiveAnnouncement
} = require('./announcementsStore');
const { createLicenseProof } = require('./licenseProof');
const { renderAdminLicensesPage } = require('./adminLicensesPage');

const app = express();
const port = Number(process.env.PORT || 8080);
const appName = process.env.APP_NAME || 'Comte Harebourg API';
const appVersion = process.env.APP_VERSION || '1.0.0';
const minSupportedAppVersion = String(process.env.MIN_SUPPORTED_APP_VERSION || appVersion).trim();
const apiKey = process.env.API_KEY || '';
const adminUsername = process.env.ADMIN_USERNAME || '';
const adminPassword = process.env.ADMIN_PASSWORD || '';
const licenseSigningPrivateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY_PEM || '';
const licenseSigningKeyId = process.env.LICENSE_SIGNING_KEY_ID || 'main';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';
const adminSessionCookieName = 'senchi_admin_session';
const hasConfiguredApiKey = Boolean(apiKey);
const hasConfiguredAdminAuth = Boolean(adminUsername && adminPassword);
const hasConfiguredLicenseSigningKey = Boolean(licenseSigningPrivateKeyPem);

function getStartupConfigErrors() {
  const errors = [];

  if (!hasConfiguredLicenseSigningKey) {
    errors.push('LICENSE_SIGNING_PRIVATE_KEY_PEM is required');
  }

  if (isProduction) {
    if (!hasConfiguredAdminAuth) {
      errors.push('ADMIN_USERNAME and ADMIN_PASSWORD are required in production');
    }

    if (!allowedOrigins.length || allowedOrigins.includes('*')) {
      errors.push('ALLOWED_ORIGINS must be explicitly configured in production');
    }
  }

  return errors;
}

function validateStartupConfig() {
  const errors = getStartupConfigErrors();
  if (!errors.length) {
    return;
  }

  const details = errors.map((entry) => `- ${entry}`).join('\n');
  throw new Error(`Invalid server configuration:\n${details}`);
}

function parseVersionParts(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!match) {
    return null;
  }

  return [
    Number(match[1] || 0),
    Number(match[2] || 0),
    Number(match[3] || 0)
  ];
}

function compareVersions(left, right) {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);

  if (!leftParts || !rightParts) {
    return null;
  }

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }
    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
}

function parseExpirationDate(value) {
  if (!value) {
    return null;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/').map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeLicensePayload(input = {}, existing = null) {
  const normalizedKey = String(input.license_key || '').trim();
  const normalizedCustomerName = String(input.customer_name || '').trim();
  const normalizedCustomerEmail = String(input.customer_email || '').trim();
  const normalizedStatus = String(input.status || existing?.status || 'active').trim().toLowerCase();
  const normalizedNotes = input.notes === undefined
    ? String(existing?.notes || '').trim()
    : String(input.notes || '').trim();
  const parsedMaxDevices = Number(input.max_devices);
  const normalizedMaxDevices = input.max_devices === undefined || input.max_devices === null || input.max_devices === ''
    ? Number(existing?.max_devices || 1)
    : parsedMaxDevices;
  const normalizedMachineId = input.machine_id === undefined
    ? existing?.machine_id || null
    : String(input.machine_id || '').trim() || null;
  const normalizedExpiration = input.expires_at === undefined
    ? existing?.expires_at || null
    : (input.expires_at ? parseExpirationDate(input.expires_at) : null);

  if (!normalizedKey || !normalizedCustomerName) {
    return { error: 'license_key and customer_name are required' };
  }

  if (!['active', 'blocked', 'suspended', 'expired'].includes(normalizedStatus)) {
    return { error: 'Invalid status' };
  }

  if (!Number.isFinite(normalizedMaxDevices) || normalizedMaxDevices < 1) {
    return { error: 'max_devices must be a number greater than or equal to 1' };
  }

  if (input.expires_at !== undefined && input.expires_at && !normalizedExpiration) {
    return { error: 'Invalid expires_at date' };
  }

  const normalizedMachineIds = normalizedMachineId
    ? [normalizedMachineId]
    : existing?.machine_ids || (existing?.machine_id ? [existing.machine_id] : []);

  return {
    value: {
      ...(existing || {}),
      license_key: normalizedKey,
      customer_name: normalizedCustomerName,
      customer_email: normalizedCustomerEmail,
      status: normalizedStatus,
      expires_at: normalizedExpiration,
      machine_id: normalizedMachineId,
      machine_ids: normalizedMachineIds,
      max_devices: Math.max(1, Math.trunc(normalizedMaxDevices)),
      notes: normalizedNotes
    }
  };
}

function normalizeAnnouncementPayload(input = {}, existing = null) {
  const title = String(input.title || '').trim();
  const message = String(input.message || '').trim();
  const targetType = String(input.target_type || existing?.target_type || 'all').trim().toLowerCase();
  const targetValue = String(input.target_value || '').trim();
  const active = input.active === undefined ? Boolean(existing?.active) : Boolean(input.active);

  if (!title || !message) {
    return { error: 'title and message are required' };
  }

  if (!['all', 'license_key', 'customer_email'].includes(targetType)) {
    return { error: 'Invalid target_type' };
  }

  if (targetType !== 'all' && !targetValue) {
    return { error: 'target_value is required for targeted announcements' };
  }

  return {
    value: {
      id: existing?.id || `announcement-${Date.now()}`,
      title,
      message,
      active,
      target_type: targetType,
      target_value: targetType === 'all' ? null : targetValue,
      updated_at: new Date().toISOString()
    }
  };
}

function announcementMatchesTarget(announcement, context = {}) {
  if (!announcement?.active) {
    return false;
  }

  if (announcement.target_type === 'all') {
    return true;
  }

  if (announcement.target_type === 'license_key') {
    return String(context.licenseKey || '').trim() === String(announcement.target_value || '').trim();
  }

  if (announcement.target_type === 'customer_email') {
    return String(context.customerEmail || '').trim().toLowerCase() === String(announcement.target_value || '').trim().toLowerCase();
  }

  return false;
}

function hasValidAdminBasicAuth(req) {
  const header = req.header('authorization') || '';
  if (!header.startsWith('Basic ')) {
    return false;
  }

  const encoded = header.slice('Basic '.length).trim();
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
  const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
  return username === adminUsername && password === adminPassword;
}

function parseCookies(req) {
  const header = req.header('cookie') || '';
  return header
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf('=');
      const key = separatorIndex >= 0 ? entry.slice(0, separatorIndex).trim() : entry.trim();
      const value = separatorIndex >= 0 ? entry.slice(separatorIndex + 1).trim() : '';
      if (key) {
        cookies[key] = decodeURIComponent(value);
      }
      return cookies;
    }, {});
}

function getAdminSessionToken() {
  return crypto
    .createHash('sha256')
    .update(`${adminUsername}:${adminPassword}`)
    .digest('hex');
}

function hasValidAdminSession(req) {
  if (!adminUsername || !adminPassword) {
    return false;
  }

  const cookies = parseCookies(req);
  return cookies[adminSessionCookieName] === getAdminSessionToken();
}

function setAdminSessionCookie(req, res) {
  if (!adminUsername || !adminPassword) {
    return;
  }

  const cookieParts = [
    `${adminSessionCookieName}=${encodeURIComponent(getAdminSessionToken())}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (req.secure || String(req.header('x-forwarded-proto') || '').toLowerCase() === 'https') {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  }
}));

app.use((req, res, next) => {
  if (
    req.originalUrl.startsWith('/api/licenses') ||
    req.originalUrl.startsWith('/api/announcements') ||
    req.originalUrl.startsWith('/api/license/upsert') ||
    req.originalUrl.startsWith('/admin/licenses') ||
    req.originalUrl.startsWith('/admin/license')
  ) {
    next();
    return;
  }

  if (!hasConfiguredApiKey) {
    next();
    return;
  }

  const providedApiKey = req.header('x-api-key');
  if (providedApiKey !== apiKey) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  next();
});

function requireAdminAuth(req, res, next) {
  const isAdminApiRoute = (
    req.originalUrl.startsWith('/api/licenses') ||
    req.originalUrl.startsWith('/api/license/upsert') ||
    req.originalUrl.startsWith('/api/announcements')
  );

  if (!hasConfiguredAdminAuth) {
    if (isAdminApiRoute) {
      res.status(503).json({
        ok: false,
        error: 'Admin authentication is not configured'
      });
      return;
    }

    res.status(503).type('html').send('Authentification admin non configuree.');
    return;
  }

  if (hasValidAdminSession(req)) {
    next();
    return;
  }

  if (hasValidAdminBasicAuth(req)) {
    setAdminSessionCookie(req, res);
    next();
    return;
  }

  if (isAdminApiRoute) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Senchi Admin"');
    res.status(401).json({
      ok: false,
      error: 'Admin authentication required'
    });
    return;
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Senchi Admin"');
  res.status(401).type('html').send('Authentification admin requise.');
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    app: appName,
    version: appVersion,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug', async (req, res) => {
  const { testSupabaseConnection } = require('./supabaseClient');
  const supabaseDiag = await testSupabaseConnection();
  res.json({
    ok: true,
    app: appName,
    version: appVersion,
    uptimeSeconds: Math.floor(process.uptime()),
    supabase: supabaseDiag
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    message: 'API reachable from desktop app',
    deployment: process.env.K_SERVICE ? 'google-cloud-run' : 'local'
  });
});

app.post('/api/announcement', async (req, res) => {
  const { licenseKey, customerEmail } = req.body || {};
  const announcement = await getActiveAnnouncement();

  if (!announcement || !announcementMatchesTarget(announcement, { licenseKey, customerEmail })) {
    res.json({
      ok: true,
      announcement: null
    });
    return;
  }

  res.json({
    ok: true,
    announcement
  });
});

app.post('/api/license/validate', async (req, res) => {
  const {
    clientId,
    licenseKey,
    machineId,
    appVersion
  } = req.body || {};

  if (!clientId || !licenseKey) {
    res.status(400).json({
      ok: false,
      error: 'clientId and licenseKey are required'
    });
    return;
  }

  if (!machineId) {
    res.status(400).json({
      ok: false,
      error: 'machineId is required'
    });
    return;
  }

  const versionComparison = compareVersions(appVersion, minSupportedAppVersion);
  if (!appVersion || versionComparison === null) {
    res.status(400).json({
      ok: false,
      valid: false,
      status: 'invalid_version',
      error: 'App version is required'
    });
    return;
  }

  if (versionComparison < 0) {
    res.status(426).json({
      ok: false,
      valid: false,
      status: 'update_required',
      error: `Update required: minimum supported version is ${minSupportedAppVersion}`,
      minSupportedVersion: minSupportedAppVersion,
      currentVersion: appVersion
    });
    return;
  }

  const license = await findLicenseByKey(licenseKey);
  if (!license) {
    res.status(404).json({
      ok: false,
      valid: false,
      status: 'invalid',
      error: 'License not found'
    });
    return;
  }

  if (license.status !== 'active') {
    res.status(403).json({
      ok: false,
      valid: false,
      status: license.status,
      error: `License is ${license.status}`
    });
    return;
  }

  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
    const expiredLicense = await saveLicense({
      ...license,
      status: 'expired'
    });

    res.status(403).json({
      ok: false,
      valid: false,
      status: expiredLicense.status,
      error: 'License expired',
      customerName: expiredLicense.customer_name,
      customerEmail: expiredLicense.customer_email,
      expiresAt: expiredLicense.expires_at
    });
    return;
  }

  const machineIds = Array.isArray(license.machine_ids) ? [...license.machine_ids] : [];
  const isKnownMachine = machineIds.includes(machineId);
  if (!isKnownMachine && machineIds.length >= license.max_devices) {
    res.status(403).json({
      ok: false,
      valid: false,
      status: 'device_limit',
      error: 'Maximum devices reached',
      customerName: license.customer_name,
      customerEmail: license.customer_email,
      maxDevices: license.max_devices,
      machineIds
    });
    return;
  }

  if (!isKnownMachine) {
    machineIds.push(machineId);
  }

  const now = new Date().toISOString();
  const updatedLicense = await saveLicense({
    ...license,
    machine_id: machineIds[0] || machineId,
    machine_ids: machineIds,
    activated_at: license.activated_at || now,
    last_seen_at: now,
    last_app_version: appVersion || license.last_app_version || null
  });

  const responsePayload = {
    ok: true,
    valid: true,
    clientId,
    status: updatedLicense.status,
    customerName: updatedLicense.customer_name,
    customerEmail: updatedLicense.customer_email,
    expiresAt: updatedLicense.expires_at,
    machineId,
    machineIds: updatedLicense.machine_ids,
    maxDevices: updatedLicense.max_devices,
    lastSeenAt: updatedLicense.last_seen_at,
    activatedAt: updatedLicense.activated_at,
    appVersion: updatedLicense.last_app_version
  };

  try {
    responsePayload.proof = createLicenseProof(responsePayload, licenseSigningPrivateKeyPem, licenseSigningKeyId);
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: `License signing unavailable: ${error.message}`
    });
    return;
  }

  res.json(responsePayload);
});

app.use('/api/licenses', requireAdminAuth);
app.use('/api/announcements', requireAdminAuth);
app.use('/api/license/upsert', requireAdminAuth);
app.use('/admin/licenses', requireAdminAuth);
app.use('/admin/license', requireAdminAuth);

app.get('/api/licenses', async (req, res) => {
  const licenses = (await getLicenses())
    .sort((a, b) => {
      const left = (a.customer_name || a.license_key).toLowerCase();
      const right = (b.customer_name || b.license_key).toLowerCase();
      return left.localeCompare(right, 'fr', { numeric: true });
    })
    .map((license) => ({
      ...license,
      is_active_recently: Boolean(
        license.last_seen_at &&
        Date.now() - new Date(license.last_seen_at).getTime() <= 7 * 24 * 60 * 60 * 1000
      )
    }));

  res.json({
    ok: true,
    total: licenses.length,
    licenses
  });
});

async function handleLicenseUpsert(req, res) {
  const licenseKey = String(req.body?.license_key || '').trim();
  const existing = await findLicenseByKey(licenseKey);
  const normalizedPayload = normalizeLicensePayload(req.body, existing);

  if (normalizedPayload.error) {
    res.status(400).json({
      ok: false,
      error: normalizedPayload.error
    });
    return;
  }

  const nextLicense = await saveLicense(normalizedPayload.value);

  res.json({
    ok: true,
    license: nextLicense
  });
}

app.post('/api/licenses/upsert', handleLicenseUpsert);
app.post('/api/license/upsert', handleLicenseUpsert);

app.post('/api/licenses/set-status', async (req, res) => {
  const { license_key, status } = req.body || {};
  const allowedStatuses = new Set(['active', 'blocked', 'suspended', 'expired']);

  if (!license_key || !status) {
    res.status(400).json({
      ok: false,
      error: 'license_key and status are required'
    });
    return;
  }

  if (!allowedStatuses.has(String(status).trim().toLowerCase())) {
    res.status(400).json({
      ok: false,
      error: 'Invalid status'
    });
    return;
  }

  const existing = await findLicenseByKey(license_key);
  if (!existing) {
    res.status(404).json({
      ok: false,
      error: 'License not found'
    });
    return;
  }

  const updated = await saveLicense({
    ...existing,
    status: String(status).trim().toLowerCase()
  });

  res.json({
    ok: true,
    license: updated
  });
});

app.post('/api/licenses/reset-machines', async (req, res) => {
  const { license_key } = req.body || {};

  if (!license_key) {
    res.status(400).json({
      ok: false,
      error: 'license_key is required'
    });
    return;
  }

  const existing = await findLicenseByKey(license_key);
  if (!existing) {
    res.status(404).json({
      ok: false,
      error: 'License not found'
    });
    return;
  }

  const updated = await saveLicense({
    ...existing,
    machine_id: null,
    machine_ids: []
  });

  res.json({
    ok: true,
    license: updated
  });
});

app.post('/api/licenses/delete', async (req, res) => {
  const { license_key } = req.body || {};

  if (!license_key) {
    res.status(400).json({
      ok: false,
      error: 'license_key is required'
    });
    return;
  }

  await deleteLicense(license_key);

  res.json({
    ok: true,
    deleted: license_key
  });
});

app.post('/api/licenses/set-expiration', async (req, res) => {
  const { license_key, expires_at } = req.body || {};

  if (!license_key) {
    res.status(400).json({
      ok: false,
      error: 'license_key is required'
    });
    return;
  }

  const existing = await findLicenseByKey(license_key);
  if (!existing) {
    res.status(404).json({
      ok: false,
      error: 'License not found'
    });
    return;
  }

  const normalizedExpiration = expires_at ? parseExpirationDate(expires_at) : null;
  if (expires_at && !normalizedExpiration) {
    res.status(400).json({
      ok: false,
      error: 'Invalid expires_at date'
    });
    return;
  }

  const updated = await saveLicense({
    ...existing,
    expires_at: normalizedExpiration
  });

  res.json({
    ok: true,
    license: updated
  });
});

app.get('/api/announcements/active', async (req, res) => {
  const announcement = await getActiveAnnouncement();
  res.json({
    ok: true,
    announcement: announcement || null
  });
});

app.post('/api/announcements/upsert', async (req, res) => {
  const existing = await getActiveAnnouncement();
  const normalized = normalizeAnnouncementPayload(req.body, existing);

  if (normalized.error) {
    res.status(400).json({
      ok: false,
      error: normalized.error
    });
    return;
  }

  const announcement = await saveActiveAnnouncement(normalized.value);
  res.json({
    ok: true,
    announcement
  });
});

app.post('/api/announcements/clear', async (req, res) => {
  await clearActiveAnnouncement();
  res.json({
    ok: true,
    announcement: null
  });
});

app.get('/admin/licenses', async (req, res, next) => {
  try {
    const licenses = (await getLicenses())
      .sort((a, b) => {
        const left = (a.customer_name || a.license_key).toLowerCase();
        const right = (b.customer_name || b.license_key).toLowerCase();
        return left.localeCompare(right, 'fr', { numeric: true });
      })
      .map((license) => ({
        ...license,
        is_active_recently: Boolean(
          license.last_seen_at &&
          Date.now() - new Date(license.last_seen_at).getTime() <= 7 * 24 * 60 * 60 * 1000
        )
      }));
    const announcement = await getActiveAnnouncement();

    res.type('html').send(renderAdminLicensesPage(licenses, announcement));
  } catch (error) {
    next(error);
  }
});

app.get('/admin/license', (req, res) => {
  res.redirect(302, '/admin/licenses');
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    ok: false,
    error: 'Internal server error'
  });
});

validateStartupConfig();

app.listen(port, () => {
  console.log(`${appName} listening on port ${port}`);
});
