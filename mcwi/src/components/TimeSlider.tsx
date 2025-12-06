import { useState } from 'react';
import type { TimeViewMode } from '../types';
import './TimeSlider.css';

/**
 * Time Slider Component
 * Controls navigation between past (delayed), present (simulated), and future (planned)
 */
export function TimeSlider() {
  const [mode, setMode] = useState<TimeViewMode>('NOW_SIMULATED');
  const [sliderValue, setSliderValue] = useState(50);

  const handleModeChange = (newMode: TimeViewMode) => {
    setMode(newMode);
    // Reset slider based on mode
    switch (newMode) {
      case 'LIVE_DELAYED':
        setSliderValue(0);
        break;
      case 'NOW_SIMULATED':
        setSliderValue(50);
        break;
      case 'FUTURE_PLANNED':
        setSliderValue(100);
        break;
    }
  };

  return (
    <div className="time-slider">
      <div className="time-modes">
        <button
          className={`mode-btn ${mode === 'LIVE_DELAYED' ? 'active' : ''}`}
          onClick={() => handleModeChange('LIVE_DELAYED')}
          title="Verified telemetry from 20 minutes ago"
        >
          <span className="mode-icon">📡</span>
          <span className="mode-label">Live (T-20min)</span>
        </button>
        
        <button
          className={`mode-btn ${mode === 'NOW_SIMULATED' ? 'active' : ''}`}
          onClick={() => handleModeChange('NOW_SIMULATED')}
          title="Digital Twin simulation of current state"
        >
          <span className="mode-icon">🔮</span>
          <span className="mode-label">Now (Simulated)</span>
        </button>
        
        <button
          className={`mode-btn ${mode === 'FUTURE_PLANNED' ? 'active' : ''}`}
          onClick={() => handleModeChange('FUTURE_PLANNED')}
          title="AI projected future trajectory"
        >
          <span className="mode-icon">🎯</span>
          <span className="mode-label">Future (Planned)</span>
        </button>
      </div>

      <div className="slider-container">
        <span className="slider-label">T-20min</span>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="time-range"
        />
        <span className="slider-label">T+60min</span>
      </div>

      <div className="confidence-indicator">
        <span className="confidence-label">Confidence:</span>
        <div className="confidence-bar">
          <div 
            className="confidence-fill" 
            style={{ 
              width: `${100 - Math.abs(sliderValue - 50) * 1.5}%`,
              backgroundColor: sliderValue < 25 ? 'var(--color-status-nominal)' : 
                               sliderValue > 75 ? 'var(--color-status-warning)' : 
                               'var(--color-accent-cyan)'
            }}
          />
        </div>
        <span className="confidence-value">
          {Math.round(100 - Math.abs(sliderValue - 50) * 1.5)}%
        </span>
      </div>
    </div>
  );
}
