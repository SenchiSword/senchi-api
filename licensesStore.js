const fs = require('fs');
const path = require('path');
const { Firestore } = require('@google-cloud/firestore');

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'licenses.json');
const collectionName = process.env.FIRESTORE_LICENSES_COLLECTION || 'licenses';

const defaultState = {
  licenses: []
};

let firestoreInstance = null;

function getFirestore() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  firestoreInstance = new Firestore();
  return firestoreInstance;
}

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify(defaultState, null, 2)}\n`, 'utf8');
  }
}

function readLocalState() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.licenses)) {
      return { ...defaultState };
    }
    return parsed;
  } catch (error) {
    console.error('Unable to read local license store, using empty state.', error);
    return { ...defaultState };
  }
}

function writeLocalState(state) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function normalizeLicense(input = {}) {
  const machineIds = Array.isArray(input.machine_ids)
    ? input.machine_ids.filter(Boolean)
    : input.machine_id
      ? [input.machine_id]
      : [];

  return {
    license_key: String(input.license_key || '').trim(),
    customer_name: String(input.customer_name || '').trim(),
    customer_email: String(input.customer_email || '').trim(),
    status: String(input.status || 'active').trim().toLowerCase(),
    expires_at: input.expires_at || null,
    machine_id: machineIds[0] || null,
    machine_ids: machineIds,
    max_devices: Number.isFinite(Number(input.max_devices)) ? Math.max(1, Number(input.max_devices)) : 1,
    last_seen_at: input.last_seen_at || null,
    activated_at: input.activated_at || null,
    last_app_version: input.last_app_version || null,
    notes: String(input.notes || '').trim()
  };
}

function sanitizeLicense(license) {
  const normalized = normalizeLicense(license);
  return {
    license_key: normalized.license_key,
    customer_name: normalized.customer_name,
    customer_email: normalized.customer_email,
    status: normalized.status,
    expires_at: normalized.expires_at,
    machine_id: normalized.machine_id,
    machine_ids: normalized.machine_ids,
    max_devices: normalized.max_devices,
    last_seen_at: normalized.last_seen_at,
    activated_at: normalized.activated_at,
    last_app_version: normalized.last_app_version,
    notes: normalized.notes
  };
}

async function getLicensesFromFirestore() {
  const db = getFirestore();
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs.map((doc) => sanitizeLicense(doc.data()));
}

async function findLicenseByKeyFromFirestore(licenseKey) {
  if (!licenseKey) {
    return null;
  }

  const key = String(licenseKey).trim();
  const db = getFirestore();
  const snapshot = await db
    .collection(collectionName)
    .where('license_key', '==', key)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return sanitizeLicense(snapshot.docs[0].data());
}

async function saveLicenseToFirestore(license) {
  const next = sanitizeLicense(license);
  const db = getFirestore();
  await db.collection(collectionName).doc(next.license_key).set(next, { merge: true });
  return next;
}

async function withFallback(work, fallback) {
  try {
    return await work();
  } catch (error) {
    console.warn('Firestore unavailable, falling back to local JSON store.', error.message);
    return fallback();
  }
}

async function getLicenses() {
  return withFallback(
    () => getLicensesFromFirestore(),
    () => readLocalState().licenses.map(sanitizeLicense)
  );
}

async function findLicenseByKey(licenseKey) {
  return withFallback(
    () => findLicenseByKeyFromFirestore(licenseKey),
    () => {
      if (!licenseKey) {
        return null;
      }

      const key = String(licenseKey).trim();
      return readLocalState().licenses.map(sanitizeLicense).find((license) => license.license_key === key) || null;
    }
  );
}

async function saveLicense(license) {
  return withFallback(
    () => saveLicenseToFirestore(license),
    () => {
      const state = readLocalState();
      const next = sanitizeLicense(license);
      const existingIndex = state.licenses.findIndex((item) => item.license_key === next.license_key);

      if (existingIndex >= 0) {
        state.licenses[existingIndex] = next;
      } else {
        state.licenses.push(next);
      }

      writeLocalState(state);
      return next;
    }
  );
}

module.exports = {
  getLicenses,
  findLicenseByKey,
  saveLicense,
  sanitizeLicense
};
