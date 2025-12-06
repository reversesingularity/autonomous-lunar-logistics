# MCWI - Mission Control Web Interface

**Autonomous Lunar Logistics System**

> The strategic oversight dashboard for autonomous Starship fleet operations

## Overview

MCWI provides real-time visualization and monitoring of the autonomous lunar logistics fleet through:

- **3D Fleet Visualization** - CesiumJS-powered globe showing all active ships
- **Real-time Telemetry** - Live updates via Supabase Realtime
- **Safety Dashboard** - S-001 through S-008 boundary monitoring
- **AI Decision Transparency** - Explainable AI decision logs

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript 5 |
| Build Tool | Vite 5.4 |
| State Management | Redux Toolkit |
| 3D Visualization | CesiumJS 1.124 |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |
| Styling | CSS Modules |

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- [Cesium Ion Token](https://cesium.com/ion/tokens) (free)
- [Supabase Project](https://supabase.com) (free tier)

### Installation

```bash
# Clone the repository
git clone https://github.com/reversesingularity/autonomous-lunar-logistics.git
cd autonomous-lunar-logistics/mcwi

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your tokens
# VITE_CESIUM_ION_TOKEN=your_token
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Deployment to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/reversesingularity/autonomous-lunar-logistics&project-name=lunar-mission-control&root-directory=mcwi)

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from mcwi directory
cd mcwi
vercel

# Follow prompts to:
# 1. Link to your Vercel account
# 2. Set environment variables
# 3. Deploy
```

### Environment Variables in Vercel

Set these in your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `VITE_CESIUM_ION_TOKEN` | Your Cesium Ion access token |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Project Structure

```
mcwi/
├── src/
│   ├── components/       # React components
│   │   ├── CesiumViewer.tsx    # 3D globe
│   │   ├── FleetDashboard.tsx  # Main dashboard
│   │   ├── Header.tsx          # Navigation header
│   │   ├── ShipList.tsx        # Ship listing
│   │   └── TelemetryPanel.tsx  # Telemetry display
│   ├── hooks/            # Custom React hooks
│   │   └── useFleetData.ts     # Supabase data hook
│   ├── services/         # External service clients
│   │   └── supabase.ts         # Supabase client
│   ├── store/            # Redux store
│   │   ├── index.ts            # Store configuration
│   │   └── fleetSlice.ts       # Fleet state slice
│   ├── types/            # TypeScript types
│   │   └── supabase.ts         # Database types
│   ├── App.tsx           # Root component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── vercel.json           # Vercel configuration
├── vite.config.ts        # Vite configuration
└── package.json
```

## Safety Boundaries Monitored

| ID | Name | Threshold |
|----|------|-----------|
| S-001 | Delta-V Budget | Within planned limits |
| S-002 | Communication | <24hr without contact |
| S-003 | Fuel Reserves | >10% remaining |
| S-004 | Thermal | 200-350K operational |
| S-005 | Radiation | <0.5 Sv cumulative |
| S-006 | Collision | Safe trajectory corridor |
| S-007 | Power | >20% battery reserve |
| S-008 | Latency | <500ms decision time |

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the root directory.

## License

MIT License - See [LICENSE](../LICENSE) for details.

---

**Autonomous Lunar Logistics** - *Ensuring AI Safety in Space*
