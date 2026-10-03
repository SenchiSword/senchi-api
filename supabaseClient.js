const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

let client = null;

function getSupabaseClient() {
  if (client) {
    return client;
  }

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return client;
}

module.exports = {
  getSupabaseClient
};
