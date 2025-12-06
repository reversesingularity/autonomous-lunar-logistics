import { useEffect, useState } from 'react';
import type { FleetStatus } from '../types';
import { generateMockFleetStatus } from '../utils/mockData';

/**
 * Hook to fetch and subscribe to fleet status updates.
 * Currently uses mock data - will connect to Supabase in production.
 */
export function useFleetStatus() {
  const [fleetStatus, setFleetStatus] = useState<FleetStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load with mock data
    setIsLoading(true);
    
    try {
      const mockStatus = generateMockFleetStatus();
      setFleetStatus(mockStatus);
      setError(null);
    } catch (err) {
      setError('Failed to load fleet status');
      console.error('Fleet status error:', err);
    } finally {
      setIsLoading(false);
    }

    // Set up periodic updates (simulating real-time)
    const interval = setInterval(() => {
      try {
        const updatedStatus = generateMockFleetStatus();
        setFleetStatus(updatedStatus);
      } catch (err) {
        console.error('Fleet update error:', err);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return { fleetStatus, isLoading, error };
}
