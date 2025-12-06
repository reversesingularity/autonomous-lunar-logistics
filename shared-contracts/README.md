# Shared Contracts

This directory contains the **Constitutional Treaty** — the source of truth for all data schemas and safety boundaries shared across the three segments.

## Structure

```
shared-contracts/
├── VERSION                    # Current contract version (semver)
├── CHANGELOG.md               # All changes documented
├── protobuf/                  # Schema definitions
│   ├── telemetry.proto        # TelemetryPacket
│   ├── fleet_status.proto     # FleetStatus, Alerts, Negotiations
│   ├── ai_decision.proto      # AIDecisionLog, AnomalyDetection
│   ├── commands.proto         # StrategicObjective, HumanOverride
│   └── constraints.proto      # Constraint definitions
├── safety-boundaries/         # Inviolable limits (YAML)
│   ├── thermal_limits.yaml
│   ├── power_limits.yaml
│   ├── structural_limits.yaml
│   └── operational_limits.yaml
└── generated/                 # Auto-generated code (gitignored)
    ├── cpp/
    ├── python/
    ├── typescript/
    └── go/
```

## Usage

### Generating Code from Protobuf

```bash
# TypeScript (for MCWI)
protoc --ts_out=generated/typescript protobuf/*.proto

# Python (for GSC)
protoc --python_out=generated/python protobuf/*.proto

# Go (for MCWI backend)
protoc --go_out=generated/go protobuf/*.proto

# C++ (for OAS)
protoc --cpp_out=generated/cpp protobuf/*.proto
```

## Amendment Process

Changes to these contracts require:

1. **RFC Proposal** — Document the change
2. **Impact Analysis** — All segments assess impact
3. **Safety Review** — If safety-related
4. **Unanimous Consent** — All segment leads approve
5. **Version Bump** — Breaking = MAJOR, Additive = MINOR
6. **Synchronized Release** — All segments update within 5 days

See [SPEC-KIT.md Section 12.3](../SPEC-KIT.md#123-the-shared-contracts-repository--constitutional-treaty) for full process.

## Safety Boundaries

The YAML files in `safety-boundaries/` define **constitutionally inviolable limits**:

| File | Key Limits |
|------|------------|
| `thermal_limits.yaml` | Hull temp < 400K, Engine < 3500K |
| `power_limits.yaml` | Battery > 20%, Discharge < 500kW |
| `structural_limits.yaml` | Acceleration < 6g, Dynamic pressure < 35kPa |
| `operational_limits.yaml` | Comm gap < 4hr, Fuel reserve > 5% |

**These limits CANNOT be bypassed** — they are enforced in all three segments.
