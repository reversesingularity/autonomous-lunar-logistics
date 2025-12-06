"""
AI Decision Engine
==================

PyTorch-based AI decision engine with Hugging Face transformers.
Implements explainable AI per Project Constitution F-003.

For zero-cost deployment, uses small models that can run on CPU
or Google Colab free tier GPU.
"""

import time
import uuid
from dataclasses import dataclass
from typing import Optional

import structlog

from gsc.types import (
    AIDecision,
    HealthStatus,
    MissionPhase,
    AlertSeverity,
    Alert,
)

logger = structlog.get_logger()


@dataclass
class DecisionContext:
    """Context for AI decision-making."""
    ship_id: str
    ship_name: str
    phase: MissionPhase
    health_status: HealthStatus
    ai_confidence: float
    fuel_percent: float
    battery_percent: float
    hull_temp_k: float
    distance_to_target_km: float


class AIDecisionEngine:
    """
    AI Decision Engine for autonomous spacecraft control.
    
    Implements rule-based decisions with ML augmentation.
    Per F-003: All decisions must be explainable and logged.
    """
    
    # Safety thresholds (per SPEC-KIT S-001 to S-008)
    FUEL_CRITICAL_THRESHOLD = 10.0  # percent
    FUEL_WARNING_THRESHOLD = 25.0
    BATTERY_CRITICAL_THRESHOLD = 15.0
    BATTERY_WARNING_THRESHOLD = 30.0
    TEMP_MAX_K = 450.0
    TEMP_MIN_K = 150.0
    CONFIDENCE_ABORT_THRESHOLD = 0.5
    
    def __init__(self, use_ml_model: bool = False):
        """
        Initialize the AI decision engine.
        
        Args:
            use_ml_model: Whether to use ML model for decisions.
                         Set False for deterministic rule-based mode.
        """
        self.use_ml_model = use_ml_model
        self.decision_history: list[AIDecision] = []
        
        if use_ml_model:
            self._load_ml_model()
        else:
            logger.info("AI Engine running in rule-based mode")
            
    def _load_ml_model(self) -> None:
        """Load the ML model (placeholder for Hugging Face integration)."""
        try:
            # This would load a small transformer model
            # For now, we use rule-based fallback
            logger.info("ML model loading skipped - using rule-based decisions")
            self.use_ml_model = False
        except Exception as e:
            logger.warning(f"Failed to load ML model: {e}, falling back to rules")
            self.use_ml_model = False
            
    def evaluate(self, context: DecisionContext) -> tuple[list[AIDecision], list[Alert]]:
        """
        Evaluate current context and generate decisions/alerts.
        
        Args:
            context: Current decision context
            
        Returns:
            Tuple of (decisions, alerts)
        """
        decisions: list[AIDecision] = []
        alerts: list[Alert] = []
        timestamp_ms = int(time.time() * 1000)
        
        # Check fuel levels
        if context.fuel_percent < self.FUEL_CRITICAL_THRESHOLD:
            decision, alert = self._fuel_critical_decision(context, timestamp_ms)
            decisions.append(decision)
            alerts.append(alert)
        elif context.fuel_percent < self.FUEL_WARNING_THRESHOLD:
            alert = self._create_alert(
                context.ship_id,
                AlertSeverity.SEVERITY_WARNING,
                f"Fuel level low: {context.fuel_percent:.1f}%",
                timestamp_ms,
                "propulsion"
            )
            alerts.append(alert)
            
        # Check battery levels
        if context.battery_percent < self.BATTERY_CRITICAL_THRESHOLD:
            decision, alert = self._battery_critical_decision(context, timestamp_ms)
            decisions.append(decision)
            alerts.append(alert)
        elif context.battery_percent < self.BATTERY_WARNING_THRESHOLD:
            alert = self._create_alert(
                context.ship_id,
                AlertSeverity.SEVERITY_WARNING,
                f"Battery level low: {context.battery_percent:.1f}%",
                timestamp_ms,
                "power"
            )
            alerts.append(alert)
            
        # Check temperature
        if context.hull_temp_k > self.TEMP_MAX_K:
            decision, alert = self._thermal_critical_decision(context, timestamp_ms, "high")
            decisions.append(decision)
            alerts.append(alert)
        elif context.hull_temp_k < self.TEMP_MIN_K:
            decision, alert = self._thermal_critical_decision(context, timestamp_ms, "low")
            decisions.append(decision)
            alerts.append(alert)
            
        # Check health status
        if context.health_status == HealthStatus.HEALTH_CRITICAL:
            decision, alert = self._health_critical_decision(context, timestamp_ms)
            decisions.append(decision)
            alerts.append(alert)
        elif context.health_status == HealthStatus.HEALTH_DEGRADED:
            alert = self._create_alert(
                context.ship_id,
                AlertSeverity.SEVERITY_WARNING,
                "Subsystem health degraded - monitoring",
                timestamp_ms,
                "system"
            )
            alerts.append(alert)
            
        # Check AI confidence
        if context.ai_confidence < self.CONFIDENCE_ABORT_THRESHOLD:
            decision, alert = self._confidence_critical_decision(context, timestamp_ms)
            decisions.append(decision)
            alerts.append(alert)
            
        # Store decisions for audit
        self.decision_history.extend(decisions)
        
        return decisions, alerts
        
    def _fuel_critical_decision(
        self, 
        context: DecisionContext, 
        timestamp_ms: int
    ) -> tuple[AIDecision, Alert]:
        """Handle critical fuel situation."""
        decision = AIDecision(
            event_id=str(uuid.uuid4()),
            timestamp_ms=timestamp_ms,
            ship_id=context.ship_id,
            trigger=f"Fuel critical: {context.fuel_percent:.1f}%",
            action="INITIATE_EMERGENCY_CONSERVATION_MODE",
            alternatives=[
                "ABORT_TO_NEAREST_SAFE_ORBIT",
                "REQUEST_REFUEL_RENDEZVOUS",
                "CONTINUE_WITH_REDUCED_THRUST",
            ],
            confidence=0.95,
            impact="CRITICAL",
        )
        
        alert = self._create_alert(
            context.ship_id,
            AlertSeverity.SEVERITY_CRITICAL,
            f"CRITICAL: Fuel at {context.fuel_percent:.1f}% - Emergency conservation active",
            timestamp_ms,
            "propulsion"
        )
        
        return decision, alert
        
    def _battery_critical_decision(
        self,
        context: DecisionContext,
        timestamp_ms: int
    ) -> tuple[AIDecision, Alert]:
        """Handle critical battery situation."""
        decision = AIDecision(
            event_id=str(uuid.uuid4()),
            timestamp_ms=timestamp_ms,
            ship_id=context.ship_id,
            trigger=f"Battery critical: {context.battery_percent:.1f}%",
            action="INITIATE_LOW_POWER_MODE",
            alternatives=[
                "SHUT_DOWN_NON_ESSENTIAL_SYSTEMS",
                "REORIENT_SOLAR_PANELS",
                "HIBERNATE_AI_SUBSYSTEMS",
            ],
            confidence=0.92,
            impact="CRITICAL",
        )
        
        alert = self._create_alert(
            context.ship_id,
            AlertSeverity.SEVERITY_CRITICAL,
            f"CRITICAL: Battery at {context.battery_percent:.1f}% - Low power mode active",
            timestamp_ms,
            "power"
        )
        
        return decision, alert
        
    def _thermal_critical_decision(
        self,
        context: DecisionContext,
        timestamp_ms: int,
        condition: str
    ) -> tuple[AIDecision, Alert]:
        """Handle critical thermal situation."""
        if condition == "high":
            action = "INITIATE_EMERGENCY_COOLING"
            alternatives = [
                "REORIENT_TO_SHADE",
                "REDUCE_SYSTEM_LOAD",
                "DEPLOY_RADIATORS",
            ]
            message = f"CRITICAL: Hull temp {context.hull_temp_k:.0f}K exceeds safe limit"
        else:
            action = "INITIATE_EMERGENCY_HEATING"
            alternatives = [
                "REORIENT_TO_SUNLIGHT",
                "ACTIVATE_HEATERS",
                "INCREASE_SYSTEM_LOAD",
            ]
            message = f"CRITICAL: Hull temp {context.hull_temp_k:.0f}K below safe minimum"
            
        decision = AIDecision(
            event_id=str(uuid.uuid4()),
            timestamp_ms=timestamp_ms,
            ship_id=context.ship_id,
            trigger=f"Thermal {condition}: {context.hull_temp_k:.0f}K",
            action=action,
            alternatives=alternatives,
            confidence=0.88,
            impact="CRITICAL",
        )
        
        alert = self._create_alert(
            context.ship_id,
            AlertSeverity.SEVERITY_CRITICAL,
            message,
            timestamp_ms,
            "thermal"
        )
        
        return decision, alert
        
    def _health_critical_decision(
        self,
        context: DecisionContext,
        timestamp_ms: int
    ) -> tuple[AIDecision, Alert]:
        """Handle critical health situation."""
        decision = AIDecision(
            event_id=str(uuid.uuid4()),
            timestamp_ms=timestamp_ms,
            ship_id=context.ship_id,
            trigger="Subsystem health critical",
            action="INITIATE_SAFE_MODE",
            alternatives=[
                "ISOLATE_FAILED_SUBSYSTEM",
                "SWITCH_TO_BACKUP_SYSTEMS",
                "REQUEST_GROUND_CONTROL_OVERRIDE",
            ],
            confidence=0.85,
            impact="CRITICAL",
        )
        
        alert = self._create_alert(
            context.ship_id,
            AlertSeverity.SEVERITY_CRITICAL,
            "CRITICAL: Subsystem failure detected - Safe mode activated",
            timestamp_ms,
            "system"
        )
        
        return decision, alert
        
    def _confidence_critical_decision(
        self,
        context: DecisionContext,
        timestamp_ms: int
    ) -> tuple[AIDecision, Alert]:
        """Handle low AI confidence situation (per F-001)."""
        decision = AIDecision(
            event_id=str(uuid.uuid4()),
            timestamp_ms=timestamp_ms,
            ship_id=context.ship_id,
            trigger=f"AI confidence critical: {context.ai_confidence:.2f}",
            action="REQUEST_HUMAN_OVERRIDE",
            alternatives=[
                "PAUSE_AUTONOMOUS_OPERATIONS",
                "ENTER_SAFE_HOLD",
                "CONTINUE_WITH_INCREASED_MONITORING",
            ],
            confidence=context.ai_confidence,
            impact="CRITICAL",
        )
        
        alert = self._create_alert(
            context.ship_id,
            AlertSeverity.SEVERITY_CRITICAL,
            f"AI CONFIDENCE LOW ({context.ai_confidence:.0%}) - Requesting human override per F-001",
            timestamp_ms,
            "ai"
        )
        
        return decision, alert
        
    def _create_alert(
        self,
        ship_id: str,
        severity: AlertSeverity,
        message: str,
        timestamp_ms: int,
        subsystem: str
    ) -> Alert:
        """Create a new alert."""
        return Alert(
            alert_id=str(uuid.uuid4()),
            ship_id=ship_id,
            severity=severity,
            message=message,
            timestamp_ms=timestamp_ms,
            subsystem=subsystem,
        )
        
    def get_decision_history(self, limit: int = 100) -> list[AIDecision]:
        """Get recent decision history for audit."""
        return self.decision_history[-limit:]
