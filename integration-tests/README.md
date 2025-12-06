# Integration Tests

**Autonomous Lunar Logistics - Phase 4**

> **Purpose:** Validate all three segments (OAS/GSC/MCWI) work together  
> **Authority:** Final arbiter of system compatibility

## Test Categories

### Contract Validation (`contract-validation/`)
- **validate_contracts.py** - Validates protobuf schema compatibility across segments
- **test_telemetry_flow.py** - Tests OAS → GSC → MCWI data flow
- **test_safety_boundaries.py** - Validates S-001 through S-008 enforcement
- **test_scenarios.py** - Executes YAML-defined test scenarios
- **scenario_loader.py** - Loads and parses test scenarios

### Test Scenarios (`scenarios/`)
Test scenarios are defined in YAML files that describe complete mission situations.

#### Nominal Scenarios (`scenarios/nominal/`)
- **single_ship_transit.yaml** - Basic Earth-Moon transit
- **multi_ship_fleet.yaml** - Fleet coordination operations
- **surface_operations.yaml** - Lunar surface activity

#### Anomaly Scenarios (`scenarios/anomaly/`)
- **communication_loss.yaml** - Comm blackout recovery
- **propulsion_failure.yaml** - Engine failure response
- **fuel_depletion.yaml** - Resource emergency handling
- **cascade_failure.yaml** - Multi-system failure response

## Safety Boundaries Tested

| ID | Name | Description |
|----|------|-------------|
| S-001 | Delta-V Budget | Trajectory change limits |
| S-002 | Communication | Max 24hr without contact |
| S-003 | Fuel Reserves | Minimum 10% reserves |
| S-004 | Thermal | 200-350K operational range |
| S-005 | Radiation | Crew dose limits |
| S-006 | Collision | Trajectory corridor maintenance |
| S-007 | Power | Battery reserve requirements |
| S-008 | Latency | Decision response time |

## Running Tests

### Local Execution

```bash
# Install dependencies
pip install -r requirements.txt

# Run all tests
python -m pytest contract-validation/ -v

# Run specific test category
python -m pytest contract-validation/test_safety_boundaries.py -v

# Run with coverage
python -m pytest contract-validation/ --cov=. --cov-report=html

# Run marked tests only
python -m pytest -m "critical" -v
python -m pytest -m "safety" -v
```

### Docker Execution

```bash
# Run integration tests with Docker Compose
docker-compose --profile testing up integration-tests

# Run specific tests
docker-compose run integration-tests pytest contract-validation/test_scenarios.py -v
```

### Master Test Runner

```bash
# Run all integration tests with full reporting
cd contract-validation
python run_all.py

# Results will be in:
# - results/integration_test_results.json
# - results/integration_test_report.md
```

## Synchronization Gates

| Gate | Trigger | Check |
|------|---------|-------|
| **Gate 1** | Any commit | Contract version match |
| **Gate 2** | PR created | Unit tests pass |
| **Gate 3** | PR merged | Smoke tests pass |
| **Gate 4** | Weekly | Full integration pass |
| **Gate 5** | Release tag | Full suite + safety audit |

## Scenarios

### Nominal
- `single_ship_transit.yaml` — Basic Earth-Moon transit
- `fleet_coordination_100_ships.yaml` — Full fleet test
- `lunar_landing_sequence.yaml` — Complete landing

### Anomaly
- `engine_underperformance.yaml` — Thrust degradation
- `communication_blackout.yaml` — 4-hour gap handling
- `landing_site_obstruction.yaml` — Abort and replan
- `collision_avoidance.yaml` — DCOP conflict resolution

### Stress
- `max_fleet_size.yaml` — 100+ ships
- `telemetry_flood.yaml` — 10K packets/sec
- `concurrent_anomalies.yaml` — Multiple failures
