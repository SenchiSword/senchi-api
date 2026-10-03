if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

const { createClient } = require('@supabase/supabase-js');

let client = null;
let lastClientKey = '';
let lastDiag = {
  lastError: null,
  lastCheck: null
};

function getSupabaseClient() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    lastDiag.lastError = `Variables manquantes: URL=${Boolean(supabaseUrl)}, KEY=${Boolean(supabaseKey)}`;
    return null;
  }

  const clientKey = `${supabaseUrl}::${supabaseKey}`;
  if (client && lastClientKey === clientKey) {
    return client;
  }

  try {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    lastClientKey = clientKey;
    lastDiag.lastError = null;
    return client;
  } catch (error) {
    lastDiag.lastError = error.message;
    console.error('[Supabase] Erreur initialisation client:', error.message);
    return null;
  }
}

async function testSupabaseConnection() {
  const sb = getSupabaseClient();
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  ).trim();

  const keyHint = supabaseKey
    ? `${supabaseKey.slice(0, 12)}...${supabaseKey.slice(-4)}`
    : 'NON_DEFINIE';

  if (!sb) {
    return {
      connected: false,
      url: supabaseUrl || 'NON_DEFINIE',
      keyHint,
      error: lastDiag.lastError || 'Client Supabase non initialisable'
    };
  }

  try {
    const { data, error } = await sb.from('licenses').select('license_key').limit(5);
    if (error) {
      return {
        connected: false,
        url: supabaseUrl,
        keyHint,
        error: error.message,
        details: error
      };
    }

    return {
      connected: true,
      url: supabaseUrl,
      keyHint,
      rowCount: (data || []).length,
      sampleKeys: (data || []).map((x) => x.license_key)
    };
  } catch (err) {
    return {
      connected: false,
      url: supabaseUrl,
      keyHint,
      error: err.message
    };
  }
}

module.exports = {
  getSupabaseClient,
  testSupabaseConnection
};
