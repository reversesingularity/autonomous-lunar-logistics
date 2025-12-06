import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Alert, AlertSeverity } from '../types';

interface AlertState {
  alerts: Alert[];
  unacknowledgedCount: number;
  filterSeverity: AlertSeverity | null;
  filterShipId: string | null;
}

const initialState: AlertState = {
  alerts: [],
  unacknowledgedCount: 0,
  filterSeverity: null,
  filterShipId: null,
};

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setAlerts(state, action: PayloadAction<Alert[]>) {
      state.alerts = action.payload;
      state.unacknowledgedCount = action.payload.filter(a => !a.acknowledged).length;
    },
    
    addAlert(state, action: PayloadAction<Alert>) {
      // Add at the beginning (most recent first)
      state.alerts.unshift(action.payload);
      if (!action.payload.acknowledged) {
        state.unacknowledgedCount++;
      }
      
      // Keep last 500 alerts
      if (state.alerts.length > 500) {
        const removed = state.alerts.pop();
        if (removed && !removed.acknowledged) {
          state.unacknowledgedCount--;
        }
      }
    },
    
    acknowledgeAlert(state, action: PayloadAction<string>) {
      const alert = state.alerts.find(a => a.alertId === action.payload);
      if (alert && !alert.acknowledged) {
        alert.acknowledged = true;
        state.unacknowledgedCount--;
      }
    },
    
    acknowledgeAllAlerts(state) {
      state.alerts.forEach(alert => {
        alert.acknowledged = true;
      });
      state.unacknowledgedCount = 0;
    },
    
    setFilterSeverity(state, action: PayloadAction<AlertSeverity | null>) {
      state.filterSeverity = action.payload;
    },
    
    setFilterShipId(state, action: PayloadAction<string | null>) {
      state.filterShipId = action.payload;
    },
    
    clearFilters(state) {
      state.filterSeverity = null;
      state.filterShipId = null;
    },
  },
});

export const {
  setAlerts,
  addAlert,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  setFilterSeverity,
  setFilterShipId,
  clearFilters,
} = alertSlice.actions;

export default alertSlice.reducer;
