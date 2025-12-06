# MCWI - Mission Control Web Interface

> **Segment:** MCWI  
> **Contract Version:** 1.0.0  
> **Status:** 🚧 In Development

## Sovereign Domain

Human oversight, visualization, and strategic input.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript |
| 3D Visualization | CesiumJS |
| State Management | Redux Toolkit |
| Backend | Go / Vercel Serverless |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |

## Authority

This segment **OWNS**:
- Fleet visualization
- Alert display and management
- User authentication
- Strategic objective input
- Historical data querying
- Explainability interface

This segment **DOES NOT OWN**:
- Flight control decisions
- Model training
- Real-time anomaly response

## Boundaries

**May Consume:**
- `shared-contracts/protobuf/*`
- `FleetStatus` (via WebSocket from GSC)
- `PredictionResult` (via API from GSC)
- `TelemetryPacket` (delayed, read-only)

**May NOT Consume:**
- OAS source code
- GSC training data
- Direct spacecraft telemetry

**May Produce:**
- `StrategicObjective` (queued for review)
- `HumanOverrideRequest` (requires confirmation)

**May NOT Produce:**
- Direct flight commands
- Training data modifications

## Setup

```bash
cd mcwi
npm install
npm run dev
```

## Project Structure

```
mcwi/
├── src/
│   ├── components/       # React components
│   ├── features/         # Redux slices
│   ├── hooks/            # Custom hooks
│   ├── services/         # API clients
│   ├── types/            # TypeScript types (from protobuf)
│   └── utils/            # Utilities
├── public/
└── package.json
```

## Features (from SPEC-KIT)

- [ ] F-001: Fleet Visualization Dashboard
- [ ] F-002: Time Slider Interface
- [ ] F-003: Anomaly Investigation Panel
- [ ] F-004: Alert & Notification System
