/**
 * Supabase Client Configuration
 * Connects MCWI to Supabase for real-time telemetry and authentication
 * 
 * Per SPEC-KIT Section 13.2: Using Supabase Free Tier
 * - 500MB database storage
 * - 100 realtime connections
 * - PostgreSQL backend
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Environment variables for Supabase connection
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Singleton client instance
let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get or create the Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  // Return null if credentials not configured (allows mock data fallback)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase credentials not configured. Using mock data.');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10, // Rate limit for realtime updates
        },
      },
    });
  }

  return supabaseClient;
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Subscribe to fleet status updates
 */
export function subscribeToFleetUpdates(
  callback: (payload: any) => void
): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel('fleet-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ships',
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to telemetry for a specific ship
 */
export function subscribeToShipTelemetry(
  shipId: string,
  callback: (payload: any) => void
): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel(`ship-${shipId}-telemetry`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'telemetry',
        filter: `ship_id=eq.${shipId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to alerts
 */
export function subscribeToAlerts(
  callback: (payload: any) => void
): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel('alerts')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
      },
      callback
    )
    .subscribe();
}

/**
 * Unsubscribe from a realtime channel
 */
export async function unsubscribe(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe();
}

export { supabaseClient };
