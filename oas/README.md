# OAS - Onboard Autonomy Segment

> **Segment:** OAS  
> **Contract Version:** 1.0.0  
> **Status:** ✅ Phase 3 Complete

**Autonomous Lunar Logistics - Spacecraft Autonomy Module**

## Overview

The Onboard Autonomy System (OAS) is a C++20 implementation of bounded spacecraft autonomy for lunar mission operations. It operates under strict constitutional constraints that ensure human oversight remains paramount.

## Project Constitution Compliance

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| **II** | AI authority bounded by operational envelopes | `AutonomyLevel` enum with 5 levels (Level 5 prohibited) |
| **III** | No trajectory changes without human authorization | `TrajectoryPlanner` returns suggestions, never executes |
| **IV** | Explainable decisions | `AutonomyDecision.reasoning` vector |
| **V** | Deterministic safety checks | `SafetyMonitor` with S-001 through S-008 |
| **VI** | Human override always possible | `human_override()` method |

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

- [x] F-007: DRL Flight Controller (AutonomyController)
- [x] F-008: Constraint Satisfaction Solver (SafetyMonitor)
- [ ] F-009: Anomaly Detection (Autoencoder) - Future
- [ ] F-010: DCOP Coordination - Future
- [x] F-011: Collision Avoidance System (TrajectoryPlanner)

## Architecture

```text
oas/
├── include/oas/
│   ├── types.hpp                    # Core type definitions
│   ├── core/
│   │   ├── vehicle_state.hpp        # Vehicle state management
│   │   └── safety_monitor.hpp       # Safety boundary checking
│   ├── navigation/
│   │   └── trajectory_planner.hpp   # Trajectory planning
│   └── autonomy/
│       └── controller.hpp           # Main autonomy controller
└── src/
    ├── main.cpp                     # Entry point
    └── core/
        ├── vehicle_state.cpp        # Vehicle state implementation
        └── safety_monitor.cpp       # Safety monitor implementation
```

## Building

### Prerequisites

- C++20 compatible compiler (GCC 11+, Clang 13+, MSVC 2022+)
- CMake 3.20+
- Optional: CUDA 12.x for GPU acceleration
- Optional: Protobuf 3.x and gRPC for inter-segment communication
- Optional: Eigen 3.x for linear algebra

### Build Commands

```bash
# Configure
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build . --parallel

# Run
./oas_main SHIP-001
```

### CMake Options

| Option | Default | Description |
|--------|---------|-------------|
| `OAS_BUILD_TESTS` | ON | Build unit tests |
| `OAS_BUILD_CUDA` | OFF | Enable CUDA support |
| `OAS_USE_PROTOBUF` | OFF | Enable Protobuf/gRPC |

## Usage Example

```cpp
#include "oas/autonomy/controller.hpp"

// Create controller at Level 1 (Assisted)
oas::autonomy::AutonomyController controller(
    "SHIP-001",
    oas::autonomy::AutonomyLevel::LEVEL_1_ASSISTED
);

// Set up notification callback
controller.set_notification_callback([](
    const std::string& type,
    const std::string& message,
    oas::AlertSeverity severity
) {
    // Handle notifications to human operators
    std::cout << "[" << type << "] " << message << std::endl;
});

// Initialize
controller.initialize();

// Main loop
while (running) {
    controller.update(delta_time_ms);
    
    // Check safety
    if (!controller.is_safe()) {
        // System auto-enters safe mode on critical failures
    }
    
    // Process commands
    auto decision = controller.process_next_command();
}

// Human override is ALWAYS possible
controller.human_override(oas::autonomy::AutonomyLevel::LEVEL_0_MANUAL);
```

## Integration with GSC and MCWI

The OAS communicates with other segments via Protobuf messages:

- **GSC (Ground Simulation Center)**: Receives trajectory updates, sends telemetry
- **MCWI (Mission Control Web Interface)**: Receives human commands, sends status updates

Message types are defined in `proto/messages.proto` in the root project.

## Author

Christopher Modina  
ORCID: 0009-0004-9525-0631

## DOI

This project is archived at: **10.5281/zenodo.17837420**
