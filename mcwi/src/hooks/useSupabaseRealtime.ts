/**
 * Real-time Supabase Hooks for ALLS MCWI
 * 
 * Provides React hooks for real-time subscriptions to fleet status,
 * alerts, and telemetry data from Supabase.
 * 
 * @module hooks/useSupabaseRealtime
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { 
  getSupabaseClient, 
  subscribeToFleetUpdates, 
  subscribeToAlerts as subscribeToAlertsChannel,
  isSupabaseConfigured,
  unsubscribe,
} from '../lib/supabase';
import type { Ship, AlertRow } from '../lib/database.types';

// ============================================================================
// Types
// ============================================================================

export interface UseFleetRealtimeOptions {
  /** Enable real-time subscription (default: true) */
  realtime?: boolean;
  /** Polling interval in ms when realtime is disabled (default: 5000) */
  pollInterval?: number;
}

export interface UseAlertsRealtimeOptions {
  /** Ship ID to filter alerts for (optional) */
  shipId?: string;
  /** Only show unacknowledged alerts (default: true) */
  unacknowledgedOnly?: boolean;
  /** Enable real-time subscription (default: true) */
  realtime?: boolean;
}

export interface FleetRealtimeState {
  ships: Ship[];
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  connected: boolean;
}

export interface AlertsRealtimeState {
  alerts: AlertRow[];
  loading: boolean;
  error: Error | null;
  unacknowledgedCount: number;
  connected: boolean;
}

// ============================================================================
// useFleetRealtime Hook
// ============================================================================

/**
 * Hook for real-time fleet status updates
 * 
 * @param options Configuration options
 * @returns Fleet state with ships, loading, error, and connection status
 */
export function useFleetRealtime(options: UseFleetRealtimeOptions = {}): FleetRealtimeState {
  const { realtime = true, pollInterval = 5000 } = options;
  
  const [state, setState] = useState<FleetRealtimeState>({
    ships: [],
    loading: true,
    error: null,
    lastUpdate: null,
    connected: false,
  });
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial fetch
  const fetchData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: new Error('Supabase not configured'),
      }));
      return;
    }

    try {
      const { data, error } = await client
        .from('ships')
        .select('*')
        .order('ship_name');
      
      if (error) throw error;

      setState(prev => ({
        ...prev,
        ships: data as Ship[],
        loading: false,
        error: null,
        lastUpdate: new Date(),
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch fleet status'),
      }));
    }
  }, []);

  // Handle real-time updates
  const handleShipChange = useCallback((payload: any) => {
    setState(prev => {
      let newShips = [...prev.ships];
      
      if (payload.eventType === 'INSERT') {
        newShips.push(payload.new as Ship);
      } else if (payload.eventType === 'UPDATE') {
        const index = newShips.findIndex(s => s.id === payload.new.id);
        if (index !== -1) {
          newShips[index] = payload.new as Ship;
        } else {
          newShips.push(payload.new as Ship);
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        newShips = newShips.filter(s => s.id !== payload.old?.id);
      }
      
      return {
        ...prev,
        ships: newShips,
        lastUpdate: new Date(),
      };
    });
  }, []);

  // Setup subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: new Error('Supabase not configured'),
      }));
      return;
    }

    // Initial fetch
    fetchData();

    if (realtime) {
      // Subscribe to real-time updates
      channelRef.current = subscribeToFleetUpdates(handleShipChange);
      
      if (channelRef.current) {
        setState(prev => ({ ...prev, connected: true }));
      }
    } else {
      // Fallback to polling
      pollTimerRef.current = setInterval(fetchData, pollInterval);
    }

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [realtime, pollInterval, fetchData, handleShipChange]);

  return state;
}

// ============================================================================
// useAlertsRealtime Hook
// ============================================================================

/**
 * Hook for real-time alerts updates
 * 
 * @param options Configuration options
 * @returns Alerts state with alerts, loading, error, and unacknowledged count
 */
export function useAlertsRealtime(options: UseAlertsRealtimeOptions = {}): AlertsRealtimeState {
  const { shipId, unacknowledgedOnly = true, realtime = true } = options;
  
  const [state, setState] = useState<AlertsRealtimeState>({
    alerts: [],
    loading: true,
    error: null,
    unacknowledgedCount: 0,
    connected: false,
  });
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch alerts
  const fetchData = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: new Error('Supabase not configured'),
      }));
      return;
    }

    try {
      let query = client
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (shipId) {
        query = query.eq('ship_id', shipId);
      }
      
      if (unacknowledgedOnly) {
        query = query.eq('acknowledged', false);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      const alerts = (data || []) as AlertRow[];
      const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
      
      setState(prev => ({
        ...prev,
        alerts,
        unacknowledgedCount,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch alerts'),
      }));
    }
  }, [shipId, unacknowledgedOnly]);

  // Handle real-time updates
  const handleAlertChange = useCallback((payload: any) => {
    setState(prev => {
      let newAlerts = [...prev.alerts];
      
      if (payload.eventType === 'INSERT') {
        // Filter by ship if needed
        if (shipId && payload.new.ship_id !== shipId) {
          return prev;
        }
        newAlerts.unshift(payload.new as AlertRow);
      } else if (payload.eventType === 'UPDATE') {
        const index = newAlerts.findIndex(a => a.id === payload.new.id);
        if (index !== -1) {
          // If we only want unacknowledged and this was acknowledged, remove it
          if (unacknowledgedOnly && payload.new.acknowledged) {
            newAlerts.splice(index, 1);
          } else {
            newAlerts[index] = payload.new as AlertRow;
          }
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        newAlerts = newAlerts.filter(a => a.id !== payload.old?.id);
      }
      
      const unacknowledgedCount = newAlerts.filter(a => !a.acknowledged).length;
      
      return {
        ...prev,
        alerts: newAlerts,
        unacknowledgedCount,
      };
    });
  }, [shipId, unacknowledgedOnly]);

  // Setup subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: new Error('Supabase not configured'),
      }));
      return;
    }

    fetchData();

    if (realtime) {
      channelRef.current = subscribeToAlertsChannel(handleAlertChange);
      
      if (channelRef.current) {
        setState(prev => ({ ...prev, connected: true }));
      }
    }

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [realtime, fetchData, handleAlertChange]);

  return state;
}

// ============================================================================
// useSupabaseConnection Hook
// ============================================================================

/**
 * Hook for monitoring Supabase connection status
 * 
 * @returns Connection status and latency
 */
export function useSupabaseConnection() {
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      const client = getSupabaseClient();
      if (!client) {
        setConnected(false);
        setLatency(null);
        return;
      }

      const start = Date.now();
      try {
        const { error } = await client.from('ships').select('id').limit(1);
        if (!error) {
          setConnected(true);
          setLatency(Date.now() - start);
        } else {
          setConnected(false);
          setLatency(null);
        }
      } catch {
        setConnected(false);
        setLatency(null);
      }
    };

    // Initial check
    checkConnection();

    // Periodic check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return { connected, latency };
}

// ============================================================================
// Export all hooks
// ============================================================================

export default {
  useFleetRealtime,
  useAlertsRealtime,
  useSupabaseConnection,
};
