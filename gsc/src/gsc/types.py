"""
Type Definitions for GSC
========================

Python equivalents of shared-contracts/protobuf types.
These must stay synchronized with the protobuf schemas.
"""

from dataclasses import dataclass
from enum import IntEnum


class MissionPhase(IntEnum):
    """Mission phase enumeration (matches fleet_status.proto)."""
    PHASE_UNKNOWN = 0
    PHASE_PRELAUNCH = 1
    PHASE_ASCENT = 2
    PHASE_EARTH_ORBIT = 3
    PHASE_TRANSIT = 4
    PHASE_LUNAR_ORBIT = 5
    PHASE_DESCENT = 6
    PHASE_SURFACE = 7
    PHASE_RETURN_TRANSIT = 8
    PHASE_COMPLETE = 9


class HealthStatus(IntEnum):
    """Subsystem health status (matches telemetry.proto)."""
    HEALTH_UNKNOWN = 0
    HEALTH_NOMINAL = 1
    HEALTH_DEGRADED = 2
    HEALTH_CRITICAL = 3
    HEALTH_OFFLINE = 4


class AlertSeverity(IntEnum):
    """Alert severity levels (matches fleet_status.proto)."""
    SEVERITY_INFO = 0
    SEVERITY_WARNING = 1
    SEVERITY_CRITICAL = 2


class ReferenceFrame(IntEnum):
    """Coordinate reference frame (matches telemetry.proto)."""
    FRAME_HELIOCENTRIC = 0
    FRAME_EARTH = 1
    FRAME_LUNAR = 2


@dataclass
class Vector3D:
    """3D vector for position, velocity, etc."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    
    def magnitude(self) -> float:
        """Calculate vector magnitude."""
        import math
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {"x": self.x, "y": self.y, "z": self.z}


@dataclass
class Quaternion:
    """Quaternion for orientation."""
    w: float = 1.0
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {"w": self.w, "x": self.x, "y": self.y, "z": self.z}


@dataclass
class TelemetryPacket:
    """Telemetry data packet (matches telemetry.proto)."""
    ship_id: str
    timestamp_ms: int
    mission_elapsed_time_ms: int
    reference_frame: ReferenceFrame
    position: Vector3D
    velocity: Vector3D
    orientation: Quaternion
    angular_velocity: Vector3D
    propellant_mass_kg: float
    propulsion_health: HealthStatus
    thermal_health: HealthStatus
    power_health: HealthStatus
    nav_health: HealthStatus
    comm_health: HealthStatus


@dataclass
class Alert:
    """System alert (matches fleet_status.proto)."""
    alert_id: str
    ship_id: str
    severity: AlertSeverity
    message: str
    timestamp_ms: int
    acknowledged: bool = False
    subsystem: str = ""


@dataclass
class AIDecision:
    """AI decision log entry (matches ai_decision.proto)."""
    event_id: str
    timestamp_ms: int
    ship_id: str
    trigger: str
    action: str
    alternatives: list[str]
    confidence: float
    impact: str = "NOMINAL"
