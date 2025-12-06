/**
 * Mock data generators for MCWI development.
 * This file provides realistic demo data until Supabase backend is connected.
 */

import type {
  FleetStatus,
  ShipStatus,
  Alert,
  MissionPhase,
  HealthStatus,
  AlertSeverity,
  Vector3D,
  Negotiation,
} from '../types';

// Ship name generator
const SHIP_PREFIXES = ['Artemis', 'Luna', 'Apollo', 'Selene', 'Diana', 'Cynthia', 'Phoebe', 'Hecate'];
const SHIP_SUFFIXES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function generateShipName(index: number): string {
  const prefix = SHIP_PREFIXES[index % SHIP_PREFIXES.length];
  const suffix = SHIP_SUFFIXES[Math.floor(index / SHIP_PREFIXES.length) % SHIP_SUFFIXES.length];
  return `${prefix} ${suffix}`;
}

// Position generators for different phases
function generatePosition(phase: MissionPhase): Vector3D {
  switch (phase) {
    case 1: // PRELAUNCH
      return { x: 0, y: 0, z: 6371 }; // Earth surface
    case 2: // ASCENT
      return { 
        x: Math.random() * 100, 
        y: Math.random() * 100, 
        z: 6371 + Math.random() * 200 
      };
    case 3: // EARTH_ORBIT
      return {
        x: Math.cos(Math.random() * Math.PI * 2) * 6771,
        y: Math.sin(Math.random() * Math.PI * 2) * 6771,
        z: (Math.random() - 0.5) * 1000,
      };
    case 4: // TRANSIT
      const transitProgress = Math.random();
      return {
        x: transitProgress * 384400,
        y: (Math.random() - 0.5) * 10000,
        z: (Math.random() - 0.5) * 10000,
      };
    case 5: // LUNAR_ORBIT
      return {
        x: 384400 + Math.cos(Math.random() * Math.PI * 2) * 1837,
        y: Math.sin(Math.random() * Math.PI * 2) * 1837,
        z: (Math.random() - 0.5) * 500,
      };
    case 6: // DESCENT
      return {
        x: 384400 + (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        z: 1737 + Math.random() * 100,
      };
    case 7: // SURFACE
      return {
        x: 384400 + (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 50,
        z: 1737,
      };
    default:
      return { x: 0, y: 0, z: 6371 };
  }
}

// Generate a single ship status
function generateShipStatus(index: number): ShipStatus {
  const shipId = `SHIP-${String(index + 1).padStart(3, '0')}`;
  const phase = (Math.floor(Math.random() * 7) + 1) as MissionPhase;
  
  // Mostly nominal, occasional warnings/critical
  let health: HealthStatus;
  const healthRoll = Math.random();
  if (healthRoll > 0.95) {
    health = 3; // CRITICAL
  } else if (healthRoll > 0.85) {
    health = 2; // DEGRADED
  } else {
    health = 1; // NOMINAL
  }

  const objectives = [
    'Maintain orbit stability',
    'Execute TLI burn sequence',
    'Perform LOI maneuver',
    'Prepare descent sequence',
    'Monitor cargo integrity',
    'Execute landing approach',
    'Deploy surface equipment',
    'Standby for launch window',
  ];

  return {
    shipId,
    shipName: generateShipName(index),
    phase,
    overallHealth: health,
    lastTelemetryMs: Date.now() - Math.random() * 60000, // Within last minute
    currentObjective: objectives[phase - 1] || objectives[0],
    aiConfidence: 0.85 + Math.random() * 0.14, // 85-99%
    position: generatePosition(phase),
    alerts: [],
  };
}

// Generate alerts
function generateAlerts(ships: ShipStatus[]): Alert[] {
  const alerts: Alert[] = [];
  const messages = {
    info: [
      'Telemetry packet received',
      'Orbit parameters nominal',
      'Communication link established',
      'Scheduled maintenance complete',
    ],
    warning: [
      'Solar panel efficiency degraded by 5%',
      'Battery discharge rate elevated',
      'Thermal margin reduced',
      'Propellant consumption above nominal',
    ],
    critical: [
      'Pressure drop detected in Tank 2',
      'Engine gimbal actuator fault',
      'Communication blackout imminent',
      'Collision avoidance maneuver required',
    ],
  };

  ships.forEach((ship) => {
    // Generate 0-3 alerts per ship
    const alertCount = Math.floor(Math.random() * 4);
    
    for (let i = 0; i < alertCount; i++) {
      let severity: AlertSeverity;
      let messagePool: string[];
      
      const severityRoll = Math.random();
      if (severityRoll > 0.95) {
        severity = 2; // CRITICAL
        messagePool = messages.critical;
      } else if (severityRoll > 0.7) {
        severity = 1; // WARNING
        messagePool = messages.warning;
      } else {
        severity = 0; // INFO
        messagePool = messages.info;
      }

      alerts.push({
        alertId: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        shipId: ship.shipId,
        severity,
        message: messagePool[Math.floor(Math.random() * messagePool.length)],
        timestampMs: Date.now() - Math.random() * 3600000, // Within last hour
        acknowledged: Math.random() > 0.3,
        subsystem: ['Propulsion', 'Thermal', 'Power', 'Comms', 'Navigation'][Math.floor(Math.random() * 5)],
      });
    }
  });

  // Sort by timestamp (most recent first)
  return alerts.sort((a, b) => b.timestampMs - a.timestampMs);
}

// Generate negotiations
function generateNegotiations(ships: ShipStatus[]): Negotiation[] {
  const negotiations: Negotiation[] = [];
  const types: Array<'RESOURCE' | 'BANDWIDTH' | 'TRAJECTORY'> = ['RESOURCE', 'BANDWIDTH', 'TRAJECTORY'];
  
  // Generate 0-3 active negotiations
  const count = Math.floor(Math.random() * 4);
  
  for (let i = 0; i < count; i++) {
    const participantCount = 2 + Math.floor(Math.random() * 3); // 2-4 participants
    const participants = ships
      .sort(() => Math.random() - 0.5)
      .slice(0, participantCount)
      .map(s => s.shipId);

    negotiations.push({
      negotiationId: `NEG-${Date.now()}-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      participants,
      status: ['PENDING', 'IN_PROGRESS', 'RESOLVED'][Math.floor(Math.random() * 3)] as 'PENDING' | 'IN_PROGRESS' | 'RESOLVED',
      resourceType: ['DSN Bandwidth', 'Power Sharing', 'Trajectory Slot'][Math.floor(Math.random() * 3)],
      startedMs: Date.now() - Math.random() * 300000, // Within last 5 min
    });
  }

  return negotiations;
}

// Main fleet status generator
export function generateMockFleetStatus(shipCount: number = 12): FleetStatus {
  const ships = Array.from({ length: shipCount }, (_, i) => generateShipStatus(i));
  const alerts = generateAlerts(ships);
  
  // Attach alerts to their ships
  alerts.forEach(alert => {
    const ship = ships.find(s => s.shipId === alert.shipId);
    if (ship) {
      ship.alerts.push(alert);
    }
  });

  // Count ships by phase
  const phaseBreakdown = {
    prelaunch: ships.filter(s => s.phase === 1).length,
    ascent: ships.filter(s => s.phase === 2).length,
    transit: ships.filter(s => s.phase === 4 || s.phase === 8).length,
    orbit: ships.filter(s => s.phase === 3 || s.phase === 5).length,
    descent: ships.filter(s => s.phase === 6).length,
    surface: ships.filter(s => s.phase === 7).length,
  };

  return {
    totalShips: ships.length,
    timestamp: new Date().toISOString(),
    ships,
    alerts,
    activeNegotiations: generateNegotiations(ships),
    phaseBreakdown,
  };
}

// Generate telemetry history for a single ship
export function generateTelemetryHistory(
  shipId: string,
  phase: MissionPhase,
  pointCount: number = 100
) {
  const basePosition = generatePosition(phase);
  const history = [];

  for (let i = 0; i < pointCount; i++) {
    const timeDelta = (pointCount - i) * 1000; // 1 second intervals
    
    history.push({
      shipId,
      timestampMs: Date.now() - timeDelta,
      missionElapsedTimeMs: 86400000 + Date.now() - timeDelta, // 1 day mission time
      referenceFrame: 'FRAME_EARTH' as const,
      position: {
        x: basePosition.x + (Math.random() - 0.5) * 10,
        y: basePosition.y + (Math.random() - 0.5) * 10,
        z: basePosition.z + (Math.random() - 0.5) * 10,
      },
      velocity: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
      },
      orientation: { w: 1, x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0.01 },
      propellantMassKg: 100000 - i * 10, // Decreasing fuel
      health: {
        propulsion: 1,
        thermal: 1,
        power: 1,
        navigation: 1,
        communication: 1,
      },
    });
  }

  return history;
}
