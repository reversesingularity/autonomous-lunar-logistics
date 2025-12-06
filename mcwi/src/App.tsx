import { useState } from 'react';
import { FleetViewer } from './components/FleetViewer';
import { TimeSlider } from './components/TimeSlider';
import { AlertPanel } from './components/AlertPanel';
import { ShipDetailPanel } from './components/ShipDetailPanel';
import { Header } from './components/Header';
import { useFleetStatus } from './hooks/useFleetStatus';
import './App.css';

function App() {
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const { fleetStatus, isLoading } = useFleetStatus();

  return (
    <div className="app">
      <Header fleetStatus={fleetStatus} />
      
      <main className="main-content">
        {/* Left Panel - Fleet Visualization */}
        <section className="fleet-viewer-section">
          <FleetViewer
            ships={fleetStatus?.ships || []}
            selectedShipId={selectedShipId}
            onShipSelect={setSelectedShipId}
            isLoading={isLoading}
          />
          <TimeSlider />
        </section>

        {/* Right Panel - Details & Alerts */}
        <aside className="side-panel">
          {selectedShipId ? (
            <ShipDetailPanel
              shipId={selectedShipId}
              onClose={() => setSelectedShipId(null)}
            />
          ) : (
            <div className="panel-placeholder">
              <p>Select a ship to view details</p>
            </div>
          )}
          
          <AlertPanel alerts={fleetStatus?.alerts || []} />
        </aside>
      </main>
    </div>
  );
}

export default App;
