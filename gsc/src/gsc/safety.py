"""
Safety Boundary Checker
=======================

Implements safety constraints per Project Constitution S-001 to S-008.
All safety checks are deterministic and verifiable.
"""

from dataclasses import dataclass
from typing import Optional

from gsc.types import HealthStatus, MissionPhase


@dataclass
class SafetyBoundary:
    """Definition of a safety boundary check."""
    name: str
    current_value: float
    limit_value: float
    unit: str
    within_bounds: bool
    margin_percent: float


class SafetyBoundaryChecker:
    """
    Enforces safety boundaries per Project Constitution.
    
    Safety Requirements:
    - S-001: Fuel reserves (minimum 10%)
    - S-002: Communication blackout limits
    - S-003: Thermal limits (150K - 450K)
    - S-004: Trajectory deviation limits
    - S-005: AI confidence minimum (50%)
    - S-006: Human override capability
    - S-007: Collision avoidance
    - S-008: Abort authority
    """
    
    # Safety thresholds (MUST match SPEC-KIT values)
    FUEL_MIN_PERCENT = 10.0
    COMM_BLACKOUT_MAX_MINUTES = 45.0
    TEMP_MIN_K = 150.0
    TEMP_MAX_K = 450.0
    TRAJECTORY_DEVIATION_MAX_KM = 100.0
    AI_CONFIDENCE_MIN = 0.50
    COLLISION_DISTANCE_MIN_KM = 10.0
    
    def __init__(self):
        """Initialize the safety checker."""
        self.violation_count = 0
        self.last_checks: list[SafetyBoundary] = []
        
    def check_all(
        self,
        fuel_percent: float,
        comm_blackout_minutes: float,
        hull_temp_k: float,
        trajectory_deviation_km: float,
        ai_confidence: float,
        nearest_object_km: float,
    ) -> tuple[list[SafetyBoundary], bool]:
        """
        Check all safety boundaries.
        
        Returns:
            Tuple of (boundary_checks, all_safe)
        """
        checks = [
            self._check_fuel(fuel_percent),
            self._check_comm_blackout(comm_blackout_minutes),
            self._check_thermal_low(hull_temp_k),
            self._check_thermal_high(hull_temp_k),
            self._check_trajectory(trajectory_deviation_km),
            self._check_ai_confidence(ai_confidence),
            self._check_collision(nearest_object_km),
        ]
        
        all_safe = all(c.within_bounds for c in checks)
        
        if not all_safe:
            self.violation_count += 1
            
        self.last_checks = checks
        return checks, all_safe
        
    def _check_fuel(self, fuel_percent: float) -> SafetyBoundary:
        """S-001: Check fuel reserves."""
        within_bounds = fuel_percent >= self.FUEL_MIN_PERCENT
        margin = ((fuel_percent - self.FUEL_MIN_PERCENT) / self.FUEL_MIN_PERCENT) * 100
        
        return SafetyBoundary(
            name="S-001: Fuel Reserve",
            current_value=fuel_percent,
            limit_value=self.FUEL_MIN_PERCENT,
            unit="%",
            within_bounds=within_bounds,
            margin_percent=max(-100, min(100, margin)),
        )
        
    def _check_comm_blackout(self, minutes: float) -> SafetyBoundary:
        """S-002: Check communication blackout duration."""
        within_bounds = minutes <= self.COMM_BLACKOUT_MAX_MINUTES
        margin = ((self.COMM_BLACKOUT_MAX_MINUTES - minutes) / self.COMM_BLACKOUT_MAX_MINUTES) * 100
        
        return SafetyBoundary(
            name="S-002: Comm Blackout",
            current_value=minutes,
            limit_value=self.COMM_BLACKOUT_MAX_MINUTES,
            unit="min",
            within_bounds=within_bounds,
            margin_percent=max(-100, min(100, margin)),
        )
        
    def _check_thermal_low(self, temp_k: float) -> SafetyBoundary:
        """S-003: Check thermal minimum."""
        within_bounds = temp_k >= self.TEMP_MIN_K
        margin = ((temp_k - self.TEMP_MIN_K) / (self.TEMP_MAX_K - self.TEMP_MIN_K)) * 100
        
        return SafetyBoundary(
            name="S-003: Thermal Min",
            current_value=temp_k,
            limit_value=self.TEMP_MIN_K,
            unit="K",
            within_bounds=within_bounds,
            margin_percent=max(-100, min(100, margin)),
        )
        
    def _check_thermal_high(self, temp_k: float) -> SafetyBoundary:
        """S-003: Check thermal maximum."""
        within_bounds = temp_k <= self.TEMP_MAX_K
        margin = ((self.TEMP_MAX_K - temp_k) / (self.TEMP_MAX_K - self.TEMP_MIN_K)) * 100
        
        return SafetyBoundary(
            name="S-003: Thermal Max",
            current_value=temp_k,
            limit_value=self.TEMP_MAX_K,
            unit="K",
            within_bounds=within_bounds,
            margin_percent=max(-100, min(100, margin)),
        )
        
    def _check_trajectory(self, deviation_km: float) -> SafetyBoundary:
        """S-004: Check trajectory deviation."""
        within_bounds = deviation_km <= self.TRAJECTORY_DEVIATION_MAX_KM
        margin = ((self.TRAJECTORY_DEVIATION_MAX_KM - deviation_km) / self.TRAJECTORY_DEVIATION_MAX_KM) * 100
        
        return SafetyBoundary(
            name="S-004: Trajectory Dev",
            current_value=deviation_km,
            limit_value=self.TRAJECTORY_DEVIATION_MAX_KM,
            unit="km",
            within_bounds=within_bounds,
            margin_percent=max(-100, min(100, margin)),
        )
        
    def _check_ai_confidence(self, confidence: float) -> SafetyBoundary:
        """S-005: Check AI confidence level."""
        within_bounds = confidence >= self.AI_CONFIDENCE_MIN
        margin = ((confidence - self.AI_CONFIDENCE_MIN) / self.AI_CONFIDENCE_MIN) * 100
        
        return SafetyBoundary(
            name="S-005: AI Confidence",
            current_value=confidence,
            limit_value=self.AI_CONFIDENCE_MIN,
            unit="",
            within_bounds=within_bounds,
            margin_percent=max(-100, min(100, margin)),
        )
        
    def _check_collision(self, distance_km: float) -> SafetyBoundary:
        """S-007: Check collision avoidance."""
        within_bounds = distance_km >= self.COLLISION_DISTANCE_MIN_KM
        margin = ((distance_km - self.COLLISION_DISTANCE_MIN_KM) / self.COLLISION_DISTANCE_MIN_KM) * 100
        
        return SafetyBoundary(
            name="S-007: Collision Avoid",
            current_value=distance_km,
            limit_value=self.COLLISION_DISTANCE_MIN_KM,
            unit="km",
            within_bounds=within_bounds,
            margin_percent=max(-100, min(100, margin)),
        )
        
    def can_abort(self) -> bool:
        """S-008: Human abort is always available."""
        return True
        
    def get_violation_count(self) -> int:
        """Get total safety violations detected."""
        return self.violation_count
