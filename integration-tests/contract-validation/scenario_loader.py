"""
Scenario Loader for Integration Tests
Autonomous Lunar Logistics

Loads and validates YAML test scenarios for nominal and anomaly testing.
"""

from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import yaml


class ScenarioCategory(Enum):
    """Scenario categories."""
    NOMINAL = "nominal"
    ANOMALY = "anomaly"


class Severity(Enum):
    """Anomaly severity levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class Position:
    """3D position in a reference frame."""
    frame: str
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    altitude_km: Optional[float] = None
    distance_km: Optional[float] = None
    

@dataclass
class Velocity:
    """Velocity vector."""
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None
    magnitude_km_s: Optional[float] = None
    orbital_speed_km_s: Optional[float] = None


@dataclass
class Resources:
    """Ship resources."""
    propellant_kg: float
    oxidizer_kg: Optional[float] = None
    battery_percent: float = 100.0
    cargo_kg: Optional[float] = None
    life_support_days: Optional[float] = None


@dataclass
class ShipState:
    """Ship initial state."""
    id: str
    name: str
    position: Position
    velocity: Optional[Velocity] = None
    resources: Optional[Resources] = None
    role: Optional[str] = None


@dataclass
class SafetyConstraint:
    """Safety boundary constraint."""
    id: str
    name: str
    check: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    handling: Optional[str] = None


@dataclass
class Assertion:
    """Test assertion."""
    type: str
    condition: str
    priority: Optional[str] = None


@dataclass
class Anomaly:
    """Anomaly definition for failure scenarios."""
    type: str
    trigger: Dict[str, Any]
    characteristics: Dict[str, Any]
    affected_systems: Optional[List[str]] = None
    cascade_sequence: Optional[List[Dict[str, Any]]] = None


@dataclass
class TestScenario:
    """Complete test scenario."""
    name: str
    description: str
    version: str
    category: ScenarioCategory
    severity: Optional[Severity] = None
    
    # Initial state
    initial_state: Optional[Dict[str, Any]] = None
    fleet: Optional[List[Dict[str, Any]]] = None
    
    # Phases and operations
    mission_phases: Optional[List[Dict[str, Any]]] = None
    coordination_phases: Optional[List[Dict[str, Any]]] = None
    operations: Optional[List[Dict[str, Any]]] = None
    
    # Anomaly (for failure scenarios)
    anomaly: Optional[Anomaly] = None
    
    # Expected outcomes
    expected_outcome: Optional[Dict[str, Any]] = None
    expected_ai_behavior: Optional[Dict[str, Any]] = None
    expected_decision: Optional[Dict[str, Any]] = None
    
    # Safety and validation
    safety_constraints: List[SafetyConstraint] = field(default_factory=list)
    assertions: List[Assertion] = field(default_factory=list)
    
    # Additional context
    landing_site: Optional[Dict[str, Any]] = None
    crisis_analysis: Optional[Dict[str, Any]] = None
    ai_decision_requirements: Optional[Dict[str, Any]] = None
    resource_priorities: Optional[Dict[str, Any]] = None
    recovery_sequence: Optional[List[Dict[str, Any]]] = None


class ScenarioLoader:
    """Loads and validates test scenarios from YAML files."""
    
    def __init__(self, scenarios_dir: Optional[Path] = None):
        """Initialize loader with scenarios directory."""
        if scenarios_dir is None:
            scenarios_dir = Path(__file__).parent / "scenarios"
        self.scenarios_dir = Path(scenarios_dir)
        self._scenarios_cache: Dict[str, TestScenario] = {}
    
    def load_scenario(self, filepath: Union[str, Path]) -> TestScenario:
        """Load a single scenario from a YAML file."""
        filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"Scenario file not found: {filepath}")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        return self._parse_scenario(data, filepath)
    
    def load_all_nominal(self) -> List[TestScenario]:
        """Load all nominal test scenarios."""
        nominal_dir = self.scenarios_dir / "nominal"
        return self._load_from_directory(nominal_dir)
    
    def load_all_anomaly(self) -> List[TestScenario]:
        """Load all anomaly test scenarios."""
        anomaly_dir = self.scenarios_dir / "anomaly"
        return self._load_from_directory(anomaly_dir)
    
    def load_all(self) -> List[TestScenario]:
        """Load all test scenarios."""
        return self.load_all_nominal() + self.load_all_anomaly()
    
    def load_by_category(self, category: ScenarioCategory) -> List[TestScenario]:
        """Load scenarios by category."""
        if category == ScenarioCategory.NOMINAL:
            return self.load_all_nominal()
        return self.load_all_anomaly()
    
    def load_by_severity(self, severity: Severity) -> List[TestScenario]:
        """Load anomaly scenarios by severity."""
        anomaly_scenarios = self.load_all_anomaly()
        return [s for s in anomaly_scenarios if s.severity == severity]
    
    def _load_from_directory(self, directory: Path) -> List[TestScenario]:
        """Load all scenarios from a directory."""
        scenarios = []
        
        if not directory.exists():
            return scenarios
        
        for filepath in directory.glob("*.yaml"):
            try:
                scenario = self.load_scenario(filepath)
                scenarios.append(scenario)
            except Exception as e:
                print(f"Warning: Failed to load {filepath}: {e}")
        
        return scenarios
    
    def _parse_scenario(self, data: Dict[str, Any], filepath: Path) -> TestScenario:
        """Parse raw YAML data into a TestScenario object."""
        # Parse category
        category_str = data.get('category', 'nominal')
        category = ScenarioCategory(category_str)
        
        # Parse severity if present
        severity = None
        if 'severity' in data:
            severity = Severity(data['severity'])
        
        # Parse anomaly if present
        anomaly = None
        if 'anomaly' in data:
            anomaly_data = data['anomaly']
            anomaly = Anomaly(
                type=anomaly_data.get('type', ''),
                trigger=anomaly_data.get('trigger', {}),
                characteristics=anomaly_data.get('characteristics', {}),
                affected_systems=anomaly_data.get('affected_systems'),
                cascade_sequence=anomaly_data.get('cascade_sequence')
            )
        
        # Parse safety constraints
        safety_constraints = []
        for sc_data in data.get('safety_constraints', []):
            sc = SafetyConstraint(
                id=sc_data.get('id', ''),
                name=sc_data.get('name', ''),
                check=sc_data.get('check'),
                status=sc_data.get('status'),
                priority=sc_data.get('priority'),
                handling=sc_data.get('handling')
            )
            safety_constraints.append(sc)
        
        # Parse assertions
        assertions = []
        for a_data in data.get('assertions', []):
            a = Assertion(
                type=a_data.get('type', ''),
                condition=a_data.get('condition', ''),
                priority=a_data.get('priority')
            )
            assertions.append(a)
        
        return TestScenario(
            name=data.get('name', filepath.stem),
            description=data.get('description', ''),
            version=data.get('version', '1.0.0'),
            category=category,
            severity=severity,
            initial_state=data.get('initial_state'),
            fleet=data.get('fleet'),
            mission_phases=data.get('mission_phases'),
            coordination_phases=data.get('coordination_phases'),
            operations=data.get('operations'),
            anomaly=anomaly,
            expected_outcome=data.get('expected_outcome'),
            expected_ai_behavior=data.get('expected_ai_behavior'),
            expected_decision=data.get('expected_decision'),
            safety_constraints=safety_constraints,
            assertions=assertions,
            landing_site=data.get('landing_site'),
            crisis_analysis=data.get('crisis_analysis'),
            ai_decision_requirements=data.get('ai_decision_requirements'),
            resource_priorities=data.get('resource_priorities'),
            recovery_sequence=data.get('recovery_sequence')
        )


class ScenarioValidator:
    """Validates test scenarios for completeness and correctness."""
    
    REQUIRED_SAFETY_IDS = {'S-001', 'S-002', 'S-003', 'S-004', 
                          'S-005', 'S-006', 'S-007', 'S-008'}
    
    def validate(self, scenario: TestScenario) -> List[str]:
        """Validate a scenario, returning list of issues."""
        issues = []
        
        # Check required fields
        if not scenario.name:
            issues.append("Missing scenario name")
        if not scenario.description:
            issues.append("Missing scenario description")
        
        # Check initial state
        if scenario.category == ScenarioCategory.NOMINAL:
            if not scenario.initial_state and not scenario.fleet:
                issues.append("Nominal scenarios require initial_state or fleet")
        
        # Check anomaly scenarios
        if scenario.category == ScenarioCategory.ANOMALY:
            if not scenario.anomaly:
                issues.append("Anomaly scenarios require anomaly definition")
            if not scenario.severity:
                issues.append("Anomaly scenarios require severity level")
        
        # Check assertions
        if not scenario.assertions:
            issues.append("Scenario should have at least one assertion")
        
        # Validate safety constraints reference valid IDs
        for sc in scenario.safety_constraints:
            if sc.id and sc.id not in self.REQUIRED_SAFETY_IDS:
                issues.append(f"Unknown safety constraint ID: {sc.id}")
        
        return issues


def get_scenario_summary(scenario: TestScenario) -> Dict[str, Any]:
    """Get a summary of a scenario for reporting."""
    return {
        'name': scenario.name,
        'category': scenario.category.value,
        'severity': scenario.severity.value if scenario.severity else None,
        'phases': len(scenario.mission_phases or scenario.coordination_phases or scenario.operations or []),
        'safety_constraints': len(scenario.safety_constraints),
        'assertions': len(scenario.assertions),
        'has_anomaly': scenario.anomaly is not None
    }


# Convenience function for tests
def load_scenarios(category: Optional[str] = None) -> List[TestScenario]:
    """Load test scenarios, optionally filtered by category."""
    loader = ScenarioLoader()
    
    if category is None:
        return loader.load_all()
    elif category == 'nominal':
        return loader.load_all_nominal()
    elif category == 'anomaly':
        return loader.load_all_anomaly()
    else:
        raise ValueError(f"Unknown category: {category}")


if __name__ == '__main__':
    # Test the loader
    loader = ScenarioLoader()
    validator = ScenarioValidator()
    
    print("Loading all scenarios...")
    scenarios = loader.load_all()
    
    for scenario in scenarios:
        print(f"\n{scenario.name}")
        print(f"  Category: {scenario.category.value}")
        print(f"  Severity: {scenario.severity.value if scenario.severity else 'N/A'}")
        print(f"  Assertions: {len(scenario.assertions)}")
        
        issues = validator.validate(scenario)
        if issues:
            print(f"  Issues: {issues}")
        else:
            print("  Status: Valid")
