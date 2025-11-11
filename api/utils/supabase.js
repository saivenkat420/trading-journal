// Supabase client utility
// This provides a Supabase client for features like auth, storage, realtime, etc.
import { createClient } from '@supabase/supabase-js';

// Try config/config.js first, fallback to config.js
let config;
try {
  config = (await import('../config/config.js')).default;
} catch (e) {
  config = (await import('../config.js')).default;
}

const supabaseUrl = process.env.SUPABASE_URL || config.supabase?.url || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_ANON_KEY || 
                    config.supabase?.serviceRoleKey || 
                    config.supabase?.anonKey || 
                    config.supabase?.key || '';

// Create Supabase client (using service role key for server-side operations)
// For client-side operations, use the anon key
let supabaseClient = null;

if (supabaseUrl && supabaseKey) {
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('Supabase client initialized');
} else {
  console.warn('Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.');
}

export default supabaseClient;

// Helper function to get Supabase client (returns null if not configured)
export function getSupabaseClient() {
  return supabaseClient;
}

// Helper function to check if Supabase is configured
export function isSupabaseConfigured() {
  return supabaseClient !== null;
}


