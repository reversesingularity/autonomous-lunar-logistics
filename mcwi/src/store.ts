import { configureStore } from '@reduxjs/toolkit';
import fleetReducer from './features/fleetSlice';
import timeReducer from './features/timeSlice';
import alertReducer from './features/alertSlice';

export const store = configureStore({
  reducer: {
    fleet: fleetReducer,
    time: timeReducer,
    alerts: alertReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state for serialization checks
        ignoredPaths: ['fleet.lastUpdate'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
