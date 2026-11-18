import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wtglmjmamlfcgevtfydp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('assetflow_supabase_anon_key') || 'sb_publishable_BZH8cvxT47bTGBPzrTO2KA_aBPbEy8b';

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const setSupabaseAnonKey = (key) => {
  if (key) {
    localStorage.setItem('assetflow_supabase_anon_key', key.trim());
  } else {
    localStorage.removeItem('assetflow_supabase_anon_key');
  }
};

export const getSupabaseAnonKey = () => SUPABASE_ANON_KEY;
