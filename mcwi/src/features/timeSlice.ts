import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TimeViewMode, TimeState } from '../types';

const EARTH_MOON_DELAY_MS = 20 * 60 * 1000; // 20 minutes in ms

const initialState: TimeState = {
  mode: 'LIVE_DELAYED',
  currentTimeMs: Date.now() - EARTH_MOON_DELAY_MS,
  delayMs: EARTH_MOON_DELAY_MS,
  confidenceCone: true,
};

const timeSlice = createSlice({
  name: 'time',
  initialState,
  reducers: {
    setTimeMode(state, action: PayloadAction<TimeViewMode>) {
      state.mode = action.payload;
      
      switch (action.payload) {
        case 'LIVE_DELAYED':
          state.currentTimeMs = Date.now() - state.delayMs;
          break;
        case 'NOW_SIMULATED':
          state.currentTimeMs = Date.now();
          break;
        case 'FUTURE_PLANNED':
          // Keep current time, allow scrubbing
          break;
      }
    },
    
    setCurrentTime(state, action: PayloadAction<number>) {
      state.currentTimeMs = action.payload;
    },
    
    scrubToTime(state, action: PayloadAction<number>) {
      state.currentTimeMs = action.payload;
      // If scrubbing to past, switch to appropriate mode
      const now = Date.now();
      if (action.payload < now - state.delayMs) {
        state.mode = 'LIVE_DELAYED';
      } else if (action.payload > now) {
        state.mode = 'FUTURE_PLANNED';
      } else {
        state.mode = 'NOW_SIMULATED';
      }
    },
    
    toggleConfidenceCone(state) {
      state.confidenceCone = !state.confidenceCone;
    },
    
    tick(state) {
      // Called by a timer to advance time in LIVE mode
      if (state.mode === 'LIVE_DELAYED') {
        state.currentTimeMs = Date.now() - state.delayMs;
      } else if (state.mode === 'NOW_SIMULATED') {
        state.currentTimeMs = Date.now();
      }
    },
  },
});

export const {
  setTimeMode,
  setCurrentTime,
  scrubToTime,
  toggleConfidenceCone,
  tick,
} = timeSlice.actions;

export default timeSlice.reducer;
