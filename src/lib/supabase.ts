/**
 * FloZ ECA — Supabase Client & Configuration Singleton
 * Initializes the Supabase client using environment variables.
 * Provides graceful fallback when running in local/offline development.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          layers: number;
          parts_count: number;
          nets_count: number;
          data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          layers?: number;
          parts_count?: number;
          nets_count?: number;
          data: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          layers?: number;
          parts_count?: number;
          nets_count?: number;
          data?: any;
          updated_at?: string;
        };
      };
    };
  };
}

// Retrieve configuration from Vite environment variables
const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

export const SUPABASE_URL: string = String(envUrl).trim();
export const SUPABASE_ANON_KEY: string = String(envKey).trim();

/**
 * Checks whether Supabase has been configured with valid credentials.
 */
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY.includes('your-supabase-anon-key')) {
    return false;
  }
  try {
    const url = new URL(SUPABASE_URL);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns diagnostic details about Supabase connectivity.
 */
export function getSupabaseStatus(): {
  configured: boolean;
  url: string;
  hasKey: boolean;
} {
  return {
    configured: isSupabaseConfigured(),
    url: SUPABASE_URL ? `${SUPABASE_URL.replace(/(\/\/[^/]{4})[^/]+/, '$1***')}` : '',
    hasKey: Boolean(SUPABASE_ANON_KEY),
  };
}

let clientInstance: SupabaseClient<Database> | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

/**
 * Global Supabase client instance.
 * If Supabase is not configured, this will be null.
 */
export const supabase: SupabaseClient<Database> | null = clientInstance;
