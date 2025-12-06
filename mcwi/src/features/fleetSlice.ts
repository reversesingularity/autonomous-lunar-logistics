import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FleetStatus, ShipStatus, TelemetryPacket } from '../types';

interface FleetState {
  status: FleetStatus | null;
  ships: Record<string, ShipStatus>;
  telemetry: Record<string, TelemetryPacket[]>;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
}

const initialState: FleetState = {
  status: null,
  ships: {},
  telemetry: {},
  isLoading: false,
  error: null,
  lastUpdate: null,
};

const fleetSlice = createSlice({
  name: 'fleet',
  initialState,
  reducers: {
    setFleetStatus(state, action: PayloadAction<FleetStatus>) {
      state.status = action.payload;
      state.lastUpdate = Date.now();
      
      // Index ships by ID for quick lookup
      state.ships = {};
      action.payload.ships.forEach((ship) => {
        state.ships[ship.shipId] = ship;
      });
    },
    
    updateShipStatus(state, action: PayloadAction<ShipStatus>) {
      const ship = action.payload;
      state.ships[ship.shipId] = ship;
      
      // Update in fleet status array if exists
      if (state.status) {
        const index = state.status.ships.findIndex(s => s.shipId === ship.shipId);
        if (index >= 0) {
          state.status.ships[index] = ship;
        }
      }
    },
    
    addTelemetry(state, action: PayloadAction<TelemetryPacket>) {
      const packet = action.payload;
      if (!state.telemetry[packet.shipId]) {
        state.telemetry[packet.shipId] = [];
      }
      
      // Keep last 1000 packets per ship
      state.telemetry[packet.shipId].push(packet);
      if (state.telemetry[packet.shipId].length > 1000) {
        state.telemetry[packet.shipId].shift();
      }
    },
    
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    
    clearTelemetryHistory(state, action: PayloadAction<string>) {
      delete state.telemetry[action.payload];
    },
  },
});

export const {
  setFleetStatus,
  updateShipStatus,
  addTelemetry,
  setLoading,
  setError,
  clearTelemetryHistory,
} = fleetSlice.actions;

export default fleetSlice.reducer;
