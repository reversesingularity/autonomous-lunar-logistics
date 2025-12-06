"""
GSC Unit Tests
==============

Tests for simulation, AI engine, and safety checker.
"""

import pytest

from gsc.types import MissionPhase, HealthStatus, AlertSeverity
from gsc.simulation import FleetSimulator, ShipState
from gsc.ai_engine import AIDecisionEngine, DecisionContext
from gsc.safety import SafetyBoundaryChecker


class TestSimulation:
    """Tests for fleet simulation."""
    
    def test_add_ship(self):
        """Test adding a ship to simulation."""
        sim = FleetSimulator()
        ship = sim.add_ship("test-1", "Test Ship", MissionPhase.PHASE_PRELAUNCH)
        
        assert ship.ship_id == "test-1"
        assert ship.ship_name == "Test Ship"
        assert ship.phase == MissionPhase.PHASE_PRELAUNCH
        
    def test_simulation_step(self):
        """Test simulation time step."""
        sim = FleetSimulator()
        sim.add_ship("test-1", "Test Ship", MissionPhase.PHASE_EARTH_ORBIT)
        
        initial_time = sim.simulation_time
        sim.step(dt=1.0)
        
        assert sim.simulation_time == initial_time + 1.0
        
    def test_ship_position_updates(self):
        """Test that ship position changes over time."""
        sim = FleetSimulator()
        ship = sim.add_ship("test-1", "Test Ship", MissionPhase.PHASE_EARTH_ORBIT)
        
        initial_x = ship.position.x
        sim.step(dt=10.0)
        
        # Position should have changed
        assert ship.position.x != initial_x or ship.position.y != 0


class TestAIEngine:
    """Tests for AI decision engine."""
    
    def test_nominal_context(self):
        """Test that nominal context generates no alerts."""
        engine = AIDecisionEngine()
        
        context = DecisionContext(
            ship_id="test-1",
            ship_name="Test Ship",
            phase=MissionPhase.PHASE_EARTH_ORBIT,
            health_status=HealthStatus.HEALTH_NOMINAL,
            ai_confidence=0.95,
            fuel_percent=80.0,
            battery_percent=90.0,
            hull_temp_k=293.0,
            distance_to_target_km=1000.0,
        )
        
        decisions, alerts = engine.evaluate(context)
        
        assert len(decisions) == 0
        assert len(alerts) == 0
        
    def test_low_fuel_alert(self):
        """Test that low fuel triggers alert."""
        engine = AIDecisionEngine()
        
        context = DecisionContext(
            ship_id="test-1",
            ship_name="Test Ship",
            phase=MissionPhase.PHASE_TRANSIT,
            health_status=HealthStatus.HEALTH_NOMINAL,
            ai_confidence=0.95,
            fuel_percent=5.0,  # Critical!
            battery_percent=90.0,
            hull_temp_k=293.0,
            distance_to_target_km=1000.0,
        )
        
        decisions, alerts = engine.evaluate(context)
        
        assert len(alerts) > 0
        assert any(a.severity == AlertSeverity.SEVERITY_CRITICAL for a in alerts)
        
    def test_low_confidence_triggers_override(self):
        """Test F-001: Low AI confidence requests human override."""
        engine = AIDecisionEngine()
        
        context = DecisionContext(
            ship_id="test-1",
            ship_name="Test Ship",
            phase=MissionPhase.PHASE_TRANSIT,
            health_status=HealthStatus.HEALTH_NOMINAL,
            ai_confidence=0.3,  # Below threshold
            fuel_percent=80.0,
            battery_percent=90.0,
            hull_temp_k=293.0,
            distance_to_target_km=1000.0,
        )
        
        decisions, alerts = engine.evaluate(context)
        
        assert len(decisions) > 0
        assert any("OVERRIDE" in d.action for d in decisions)


class TestSafety:
    """Tests for safety boundary checker."""
    
    def test_all_safe(self):
        """Test all boundaries within limits."""
        checker = SafetyBoundaryChecker()
        
        checks, all_safe = checker.check_all(
            fuel_percent=50.0,
            comm_blackout_minutes=10.0,
            hull_temp_k=293.0,
            trajectory_deviation_km=5.0,
            ai_confidence=0.9,
            nearest_object_km=100.0,
        )
        
        assert all_safe
        assert all(c.within_bounds for c in checks)
        
    def test_fuel_violation(self):
        """Test S-001: Fuel violation detected."""
        checker = SafetyBoundaryChecker()
        
        checks, all_safe = checker.check_all(
            fuel_percent=5.0,  # Below 10% minimum
            comm_blackout_minutes=10.0,
            hull_temp_k=293.0,
            trajectory_deviation_km=5.0,
            ai_confidence=0.9,
            nearest_object_km=100.0,
        )
        
        assert not all_safe
        fuel_check = next(c for c in checks if "Fuel" in c.name)
        assert not fuel_check.within_bounds
        
    def test_thermal_violation(self):
        """Test S-003: Thermal violation detected."""
        checker = SafetyBoundaryChecker()
        
        checks, all_safe = checker.check_all(
            fuel_percent=50.0,
            comm_blackout_minutes=10.0,
            hull_temp_k=500.0,  # Above 450K maximum
            trajectory_deviation_km=5.0,
            ai_confidence=0.9,
            nearest_object_km=100.0,
        )
        
        assert not all_safe
        thermal_check = next(c for c in checks if "Thermal Max" in c.name)
        assert not thermal_check.within_bounds
        
    def test_abort_always_available(self):
        """Test S-008: Human abort is always available."""
        checker = SafetyBoundaryChecker()
        
        assert checker.can_abort()
        
        # Even after violations
        checker.check_all(
            fuel_percent=0.0,
            comm_blackout_minutes=100.0,
            hull_temp_k=600.0,
            trajectory_deviation_km=500.0,
            ai_confidence=0.1,
            nearest_object_km=0.1,
        )
        
        assert checker.can_abort()  # Still True
