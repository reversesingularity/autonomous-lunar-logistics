-- Supabase Database Schema for ALLS MCWI
-- Version: 1.0.0
-- Compatible with shared-contracts/protobuf schemas
--
-- Run this in the Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Ships Table
-- Stores current state of each ship in the fleet
-- ============================================================================
CREATE TABLE IF NOT EXISTS ships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ship_name VARCHAR(100) NOT NULL UNIQUE,
    phase INTEGER NOT NULL DEFAULT 1 CHECK (phase >= 0 AND phase <= 9),
    overall_health INTEGER NOT NULL DEFAULT 1 CHECK (overall_health >= 0 AND overall_health <= 4),
    last_telemetry_ms BIGINT NOT NULL DEFAULT 0,
    current_objective TEXT NOT NULL DEFAULT 'Awaiting mission assignment',
    ai_confidence DECIMAL(5,4) NOT NULL DEFAULT 0.95 CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
    position_x DECIMAL(20,6),
    position_y DECIMAL(20,6),
    position_z DECIMAL(20,6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_ships_phase ON ships(phase);
CREATE INDEX idx_ships_health ON ships(overall_health);

-- ============================================================================
-- Telemetry Table (Time-Series)
-- Stores historical telemetry packets from ships
-- ============================================================================
CREATE TABLE IF NOT EXISTS telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ship_id UUID NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    frame VARCHAR(20) NOT NULL DEFAULT 'FRAME_EARTH',
    
    -- Position (km)
    position_x DECIMAL(20,6) NOT NULL,
    position_y DECIMAL(20,6) NOT NULL,
    position_z DECIMAL(20,6) NOT NULL,
    
    -- Velocity (km/s)
    velocity_x DECIMAL(15,6) NOT NULL DEFAULT 0,
    velocity_y DECIMAL(15,6) NOT NULL DEFAULT 0,
    velocity_z DECIMAL(15,6) NOT NULL DEFAULT 0,
    
    -- Orientation (quaternion)
    orientation_w DECIMAL(10,9) NOT NULL DEFAULT 1,
    orientation_x DECIMAL(10,9) NOT NULL DEFAULT 0,
    orientation_y DECIMAL(10,9) NOT NULL DEFAULT 0,
    orientation_z DECIMAL(10,9) NOT NULL DEFAULT 0,
    
    -- Subsystem Health (0=unknown, 1=nominal, 2=degraded, 3=critical, 4=offline)
    propulsion_health INTEGER NOT NULL DEFAULT 1,
    thermal_health INTEGER NOT NULL DEFAULT 1,
    power_health INTEGER NOT NULL DEFAULT 1,
    nav_health INTEGER NOT NULL DEFAULT 1,
    comm_health INTEGER NOT NULL DEFAULT 1,
    
    -- Additional telemetry
    battery_percent DECIMAL(5,2) NOT NULL DEFAULT 100 CHECK (battery_percent >= 0 AND battery_percent <= 100),
    fuel_percent DECIMAL(5,2) NOT NULL DEFAULT 100 CHECK (fuel_percent >= 0 AND fuel_percent <= 100),
    hull_temp_k DECIMAL(8,2) NOT NULL DEFAULT 293 CHECK (hull_temp_k > 0),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX idx_telemetry_ship_time ON telemetry(ship_id, timestamp DESC);
CREATE INDEX idx_telemetry_timestamp ON telemetry(timestamp DESC);

-- ============================================================================
-- Alerts Table
-- Stores system alerts and anomalies
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ship_id UUID NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
    severity INTEGER NOT NULL DEFAULT 2 CHECK (severity >= 1 AND severity <= 3),
    category VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

-- Indexes for alert queries
CREATE INDEX idx_alerts_ship ON alerts(ship_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_unacked ON alerts(acknowledged) WHERE NOT acknowledged;

-- ============================================================================
-- AI Decisions Table
-- Logs AI decision-making for explainability (F-003)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ship_id UUID NOT NULL REFERENCES ships(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    alternatives TEXT[] NOT NULL DEFAULT '{}',
    confidence DECIMAL(5,4) NOT NULL DEFAULT 0.95 CHECK (confidence >= 0 AND confidence <= 1),
    impact VARCHAR(20) NOT NULL DEFAULT 'NOMINAL' CHECK (impact IN ('NOMINAL', 'DEGRADED', 'CRITICAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for decision log queries
CREATE INDEX idx_ai_decisions_ship_time ON ai_decisions(ship_id, timestamp DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE ships ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_decisions ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (educational demo - no auth required)
CREATE POLICY "Allow public read access to ships"
    ON ships FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to telemetry"
    ON telemetry FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to alerts"
    ON alerts FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to ai_decisions"
    ON ai_decisions FOR SELECT
    USING (true);

-- Allow authenticated users to insert (for simulation)
CREATE POLICY "Allow authenticated insert to ships"
    ON ships FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to telemetry"
    ON telemetry FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to alerts"
    ON alerts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert to ai_decisions"
    ON ai_decisions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update alerts (acknowledge)
CREATE POLICY "Allow authenticated update to alerts"
    ON alerts FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update ship position when telemetry is inserted
CREATE OR REPLACE FUNCTION update_ship_position()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ships
    SET 
        position_x = NEW.position_x,
        position_y = NEW.position_y,
        position_z = NEW.position_z,
        last_telemetry_ms = EXTRACT(EPOCH FROM NEW.timestamp) * 1000,
        updated_at = NOW()
    WHERE id = NEW.ship_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update ship position
CREATE TRIGGER trigger_update_ship_position
    AFTER INSERT ON telemetry
    FOR EACH ROW
    EXECUTE FUNCTION update_ship_position();

-- Function to update ship health based on subsystem health
CREATE OR REPLACE FUNCTION calculate_overall_health()
RETURNS TRIGGER AS $$
DECLARE
    max_health INTEGER;
BEGIN
    -- Overall health is the worst of all subsystems
    SELECT GREATEST(
        NEW.propulsion_health,
        NEW.thermal_health,
        NEW.power_health,
        NEW.nav_health,
        NEW.comm_health
    ) INTO max_health;
    
    -- Update ship if health has degraded
    UPDATE ships
    SET 
        overall_health = max_health,
        updated_at = NOW()
    WHERE id = NEW.ship_id AND overall_health < max_health;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update ship health
CREATE TRIGGER trigger_calculate_health
    AFTER INSERT ON telemetry
    FOR EACH ROW
    EXECUTE FUNCTION calculate_overall_health();

-- ============================================================================
-- Enable Realtime
-- ============================================================================

-- Enable realtime for ships table (fleet status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE ships;

-- Enable realtime for alerts (new alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;

-- Note: Don't add telemetry to realtime - too high volume
-- Use polling or batch queries for telemetry history

-- ============================================================================
-- Sample Data (for demo purposes)
-- ============================================================================

-- Insert sample ships
INSERT INTO ships (ship_name, phase, overall_health, current_objective, ai_confidence, position_x, position_y, position_z) VALUES
    ('Artemis-1', 4, 1, 'Trans-lunar injection burn complete', 0.96, 192200, 5000, 2000),
    ('Artemis-2', 3, 1, 'Parking orbit established', 0.98, 6771, 500, 100),
    ('Artemis-3', 4, 2, 'Trajectory correction maneuver scheduled', 0.89, 280000, -8000, 3000),
    ('Luna Cargo-1', 5, 1, 'Lunar orbit insertion complete', 0.94, 384400, 1837, 500),
    ('Luna Cargo-2', 7, 1, 'Surface operations nominal', 0.97, 384500, 0, 0),
    ('Starship-7', 2, 1, 'Ascent profile nominal', 0.99, 6400, 100, 50),
    ('Starship-8', 1, 1, 'Pre-launch checks in progress', 0.95, 6371, 0, 0),
    ('Relay-1', 5, 1, 'Communication relay active', 0.92, 384400, 50000, 10000),
    ('Relay-2', 5, 1, 'Communication relay active', 0.91, 384400, -50000, -10000),
    ('Pioneer-1', 8, 1, 'Return transit initiated', 0.88, 300000, 10000, -5000),
    ('Pioneer-2', 4, 3, 'Engine anomaly detected - investigating', 0.72, 150000, -3000, 1500),
    ('Gateway-1', 5, 1, 'Station keeping maneuvers complete', 0.93, 384400, 60000, 0)
ON CONFLICT (ship_name) DO NOTHING;

-- Insert sample alerts
INSERT INTO alerts (ship_id, severity, category, title, description)
SELECT id, 3, 'propulsion', 'Engine Underperformance', 'Raptor engine 2 showing 8% thrust deficit'
FROM ships WHERE ship_name = 'Pioneer-2'
ON CONFLICT DO NOTHING;

INSERT INTO alerts (ship_id, severity, category, title, description)
SELECT id, 2, 'navigation', 'Trajectory Deviation', 'Current trajectory 0.5km off nominal - correction planned'
FROM ships WHERE ship_name = 'Artemis-3'
ON CONFLICT DO NOTHING;

INSERT INTO alerts (ship_id, severity, category, title, description, acknowledged, acknowledged_at)
SELECT id, 1, 'communication', 'Signal Latency Warning', 'Earth uplink latency increased to 22 minutes', true, NOW()
FROM ships WHERE ship_name = 'Luna Cargo-1'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE ships IS 'Fleet ship status - current state of each spacecraft';
COMMENT ON TABLE telemetry IS 'Time-series telemetry data from all ships';
COMMENT ON TABLE alerts IS 'System alerts and anomalies requiring attention';
COMMENT ON TABLE ai_decisions IS 'AI decision log for explainability and audit';
