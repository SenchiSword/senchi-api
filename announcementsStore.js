const fs = require('fs');
const path = require('path');
const { Firestore } = require('@google-cloud/firestore');

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'announcements.json');
const collectionName = process.env.FIRESTORE_ANNOUNCEMENTS_COLLECTION || 'app_announcements';
const activeDocId = 'active';

const defaultState = {
  activeAnnouncement: null
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
    return {
      activeAnnouncement: parsed?.activeAnnouncement || null
    };
  } catch (error) {
    console.error('Unable to read local announcement store, using empty state.', error);
    return { ...defaultState };
  }
}

function writeLocalState(state) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function sanitizeAnnouncement(input = {}) {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const title = String(input.title || '').trim();
  const message = String(input.message || '').trim();
  const targetType = String(input.target_type || 'all').trim().toLowerCase();
  const targetValue = String(input.target_value || '').trim();
  const active = Boolean(input.active);
  const id = String(input.id || '').trim() || `announcement-${Date.now()}`;

  return {
    id,
    title,
    message,
    active,
    target_type: ['all', 'license_key', 'customer_email'].includes(targetType) ? targetType : 'all',
    target_value: targetValue || null,
    updated_at: input.updated_at || new Date().toISOString()
  };
}

async function getAnnouncementFromFirestore() {
  const db = getFirestore();
  const doc = await db.collection(collectionName).doc(activeDocId).get();
  if (!doc.exists) {
    return null;
  }

  return sanitizeAnnouncement(doc.data());
}

async function saveAnnouncementToFirestore(announcement) {
  const sanitized = sanitizeAnnouncement(announcement);
  const db = getFirestore();
  await db.collection(collectionName).doc(activeDocId).set(sanitized, { merge: true });
  return sanitized;
}

async function clearAnnouncementFromFirestore() {
  const db = getFirestore();
  await db.collection(collectionName).doc(activeDocId).delete();
  return null;
}

async function withFallback(work, fallback) {
  try {
    return await work();
  } catch (error) {
    console.warn('Firestore unavailable for announcements, falling back to local JSON store.', error.message);
    return fallback();
  }
}

async function getActiveAnnouncement() {
  return withFallback(
    () => getAnnouncementFromFirestore(),
    () => readLocalState().activeAnnouncement
  );
}

async function saveActiveAnnouncement(announcement) {
  return withFallback(
    () => saveAnnouncementToFirestore(announcement),
    () => {
      const state = readLocalState();
      const sanitized = sanitizeAnnouncement(announcement);
      state.activeAnnouncement = sanitized;
      writeLocalState(state);
      return sanitized;
    }
  );
}

async function clearActiveAnnouncement() {
  return withFallback(
    () => clearAnnouncementFromFirestore(),
    () => {
      const state = readLocalState();
      state.activeAnnouncement = null;
      writeLocalState(state);
      return null;
    }
  );
}

module.exports = {
  sanitizeAnnouncement,
  getActiveAnnouncement,
  saveActiveAnnouncement,
  clearActiveAnnouncement
};
