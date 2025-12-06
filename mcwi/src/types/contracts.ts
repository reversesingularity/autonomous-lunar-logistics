/**
 * TypeScript types generated from shared-contracts/protobuf schemas
 * Contract Version: 1.0.0
 * 
 * IMPORTANT: These types must match the protobuf definitions exactly.
 * Any changes require an RFC through the Constitutional Amendment Process.
 */

// ============================================================================
// Vector & Quaternion Types (from telemetry.proto)
// ============================================================================

export interface Vector3D {
  x: number;  // km or km/s depending on context
  y: number;
  z: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

// ============================================================================
// Health Status (from telemetry.proto)
// ============================================================================

export enum HealthStatus {
  HEALTH_UNKNOWN = 0,
  HEALTH_NOMINAL = 1,
  HEALTH_DEGRADED = 2,
  HEALTH_CRITICAL = 3,
  HEALTH_OFFLINE = 4,
}

export interface SystemHealth {
  propulsion: HealthStatus;
  thermal: HealthStatus;
  power: HealthStatus;
  navigation: HealthStatus;
  communication: HealthStatus;
}

// ============================================================================
// Telemetry Packet (from telemetry.proto)
// ============================================================================

export type ReferenceFrame = 'FRAME_HELIOCENTRIC' | 'FRAME_LUNAR' | 'FRAME_EARTH';

export interface TelemetryPacket {
  shipId: string;
  timestampMs: number;  // Unix timestamp in milliseconds
  missionElapsedTimeMs: number;
  referenceFrame: ReferenceFrame;
  position: Vector3D;
  velocity: Vector3D;
  orientation: Quaternion;
  angularVelocity: Vector3D;
  propellantMassKg: number;
  health: SystemHealth;
}

// ============================================================================
// Mission Phase (from fleet_status.proto)
// ============================================================================

export enum MissionPhase {
  PHASE_UNKNOWN = 0,
  PHASE_PRELAUNCH = 1,
  PHASE_ASCENT = 2,
  PHASE_EARTH_ORBIT = 3,
  PHASE_TRANSIT = 4,
  PHASE_LUNAR_ORBIT = 5,
  PHASE_DESCENT = 6,
  PHASE_SURFACE = 7,
  PHASE_RETURN_TRANSIT = 8,
  PHASE_COMPLETE = 9,
}

// ============================================================================
// Ship Status (from fleet_status.proto)
// ============================================================================

export interface ShipStatus {
  shipId: string;
  shipName: string;
  phase: MissionPhase;
  overallHealth: HealthStatus;
  lastTelemetryMs: number;
  currentObjective: string;
  aiConfidence: number;  // 0.0 - 1.0
  position?: Vector3D;   // Current position for visualization
  alerts: Alert[];
}

// ============================================================================
// Fleet Status (from fleet_status.proto)
// ============================================================================

export interface FleetStatus {
  totalShips: number;
  timestamp: string;  // ISO8601
  ships: ShipStatus[];
  alerts: Alert[];
  activeNegotiations: Negotiation[];
  phaseBreakdown: {
    prelaunch: number;
    ascent: number;
    transit: number;
    orbit: number;
    descent: number;
    surface: number;
  };
}

// ============================================================================
// Alert Types (from fleet_status.proto)
// ============================================================================

export enum AlertSeverity {
  SEVERITY_INFO = 0,
  SEVERITY_WARNING = 1,
  SEVERITY_CRITICAL = 2,
}

export interface Alert {
  alertId: string;
  shipId: string;
  severity: AlertSeverity;
  message: string;
  timestampMs: number;
  acknowledged: boolean;
  subsystem?: string;
}

// ============================================================================
// Negotiation Types (from fleet_status.proto)
// ============================================================================

export type NegotiationType = 'RESOURCE' | 'BANDWIDTH' | 'TRAJECTORY';

export interface Negotiation {
  negotiationId: string;
  type: NegotiationType;
  participants: string[];  // Ship IDs
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  resourceType?: string;
  startedMs: number;
}

// ============================================================================
// AI Decision Types (from ai_decision.proto)
// ============================================================================

export enum DecisionType {
  DECISION_UNKNOWN = 0,
  DECISION_TRAJECTORY_ADJUSTMENT = 1,
  DECISION_THROTTLE_CHANGE = 2,
  DECISION_ANOMALY_RESPONSE = 3,
  DECISION_RESOURCE_ALLOCATION = 4,
  DECISION_SAFE_MODE_ACTIVATION = 5,
}

export interface SafetyBoundaryCheck {
  boundaryName: string;
  currentValue: number;
  limitValue: number;
  unit: string;
  withinBounds: boolean;
}

export interface AIDecisionLog {
  eventId: string;
  timestampMs: number;
  shipId: string;
  decisionType: DecisionType;
  trigger: string;
  action: string;
  alternatives: string[];
  confidence: number;
  safetyChecks: SafetyBoundaryCheck[];
  impactAssessment: string;
}

// ============================================================================
// Command Types (from commands.proto)
// ============================================================================

export enum CommandPriority {
  PRIORITY_LOW = 0,
  PRIORITY_NORMAL = 1,
  PRIORITY_HIGH = 2,
  PRIORITY_CRITICAL = 3,
}

export enum CommandType {
  CMD_UNKNOWN = 0,
  CMD_STRATEGIC_OBJECTIVE = 1,
  CMD_HUMAN_OVERRIDE = 2,
  CMD_PARAMETER_UPDATE = 3,
  CMD_ABORT = 4,
}

export interface Command {
  commandId: string;
  timestampMs: number;
  targetShipId: string;
  commandType: CommandType;
  priority: CommandPriority;
  payload: string;  // JSON payload
  requiresConfirmation: boolean;
  issuedBy: string;
}

// ============================================================================
// Time View Types (MCWI-specific)
// ============================================================================

export type TimeViewMode = 'LIVE_DELAYED' | 'NOW_SIMULATED' | 'FUTURE_PLANNED';

export interface TimeState {
  mode: TimeViewMode;
  currentTimeMs: number;
  delayMs: number;        // 20-minute delay for live
  confidenceCone: boolean; // Show uncertainty visualization
}
