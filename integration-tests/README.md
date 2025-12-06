# Integration Tests

> **Purpose:** Validate all three segments work together  
> **Authority:** Final arbiter of system compatibility

## Structure

```
integration-tests/
├── docker-compose.yml        # Local integration environment
├── scenarios/                # Test scenarios
│   ├── nominal/              # Happy path tests
│   ├── anomaly/              # Failure mode tests
│   └── stress/               # Performance tests
├── contract-validation/      # Schema compatibility
└── performance/              # Latency and throughput
```

## Running Integration Tests

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for MCWI)
- Python 3.11+ (for GSC)

### Quick Start

```bash
# Start all services
docker-compose up -d

# Run contract validation
python contract-validation/run_all.py

# Run scenario tests
python -m pytest scenarios/ -v

# Generate report
python generate_report.py
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
