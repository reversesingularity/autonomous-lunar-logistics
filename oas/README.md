# OAS - Onboard Autonomy Segment

> **Segment:** OAS  
> **Contract Version:** 1.0.0  
> **Status:** 🚧 In Development

## Sovereign Domain

Real-time flight control and safety systems.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | C++17/20 |
| Build Target | WebAssembly (educational) |
| RTOS | FreeRTOS (simulation) |
| Testing | Google Test |
| Compiler | Emscripten (for WASM) |

## Authority

This segment **OWNS**:
- Flight dynamics control
- Engine gimbal control
- Propellant management
- Real-time anomaly response
- Safety constraint enforcement

This segment **DOES NOT OWN**:
- Model training
- User interface
- Historical data storage
- Predictive modeling

## Boundaries

**May Consume:**
- `shared-contracts/protobuf/*`
- `shared-contracts/safety-boundaries/*`

**May NOT Consume:**
- Any GSC code or services
- Any MCWI code or services
- External APIs requiring network

**May Produce:**
- `TelemetryPacket`
- `AIDecisionLog`

**May NOT Produce:**
- Direct database writes
- User-facing content

## Latency Requirements

**INVIOLABLE: All operations must complete in <10ms**

This is a constitutional requirement. The OAS must be able to make safety-critical decisions without waiting for ground systems.

## Setup

```bash
cd oas

# For WebAssembly build (educational demo)
emcmake cmake -B build
cmake --build build

# For native testing
cmake -B build-native
cmake --build build-native
ctest --test-dir build-native
```

## Project Structure

```
oas/
├── src/
│   ├── flight_controller/    # DRL flight control
│   ├── constraint_solver/    # CSP manager
│   ├── anomaly_detection/    # Autoencoder
│   └── telemetry/            # Packet generation
├── include/
├── tests/
├── wasm/                     # WebAssembly entry points
└── CMakeLists.txt
```

## Features (from SPEC-KIT)

- [ ] F-007: DRL Flight Controller
- [ ] F-008: Constraint Satisfaction Solver
- [ ] F-009: Anomaly Detection (Autoencoder)
- [ ] F-010: DCOP Coordination
- [ ] F-011: Collision Avoidance System
