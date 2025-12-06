"""
Integration Tests - Contract Validation
Autonomous Lunar Logistics

This package contains tests for validating:
- Protobuf schema compatibility across segments
- Telemetry data flow (OAS → GSC → MCWI)
- Safety boundary enforcement (S-001 through S-008)
- YAML test scenario execution
"""

from .scenario_loader import (
    ScenarioLoader,
    ScenarioValidator,
    TestScenario,
    ScenarioCategory,
    Severity,
    load_scenarios
)

__all__ = [
    'ScenarioLoader',
    'ScenarioValidator', 
    'TestScenario',
    'ScenarioCategory',
    'Severity',
    'load_scenarios'
]
