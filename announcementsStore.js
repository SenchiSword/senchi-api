const fs = require('fs');
const path = require('path');
const { getSupabaseClient } = require('./supabaseClient');

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'announcements.json');

const defaultState = {
  activeAnnouncement: null
};

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

async function getAnnouncementFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return sanitizeAnnouncement(data);
}

async function saveAnnouncementToSupabase(announcement) {
  const sanitized = sanitizeAnnouncement(announcement);
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('announcements')
    .upsert(sanitized, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return sanitizeAnnouncement(data || sanitized);
}

async function clearAnnouncementFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const { error } = await supabase
    .from('announcements')
    .update({ active: false })
    .eq('active', true);

  if (error) {
    throw error;
  }

  return null;
}

async function withFallback(work, fallback) {
  try {
    return await work();
  } catch (error) {
    console.warn('Supabase unavailable for announcements, falling back to local JSON store:', error.message);
    return fallback();
  }
}

async function getActiveAnnouncement() {
  return withFallback(
    () => getAnnouncementFromSupabase(),
    () => readLocalState().activeAnnouncement
  );
}

async function saveActiveAnnouncement(announcement) {
  return withFallback(
    () => saveAnnouncementToSupabase(announcement),
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
    () => clearAnnouncementFromSupabase(),
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
