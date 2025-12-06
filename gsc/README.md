# GSC - Ground Simulation Computer

> **Segment:** GSC  
> **Contract Version:** 1.0.0  
> **Status:** 🚧 In Development

AI/ML Ground Station for the Autonomous Lunar Logistics System (ALLS).

## Sovereign Domain

AI training, physics simulation, and real-time telemetry.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Python 3.10+ |
| ML Framework | PyTorch |
| NLP | Hugging Face Transformers |
| Physics | NumPy/SciPy (Keplerian) |
| Database | Supabase (PostgreSQL) |
| Training | Google Colab / Kaggle |
| Model Hosting | Hugging Face Hub |

## Authority

This segment **OWNS**:
- Multi-ship physics simulation
- AI decision-making with explainability (F-003)
- Safety boundary enforcement (S-001 to S-008)
- Telemetry generation and database sync
- Model training and deployment

## Quick Start

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# or: .venv\Scripts\activate  # Windows

# Install dependencies
pip install -e ".[dev]"

# Run simulation (no Supabase)
python -m gsc.main --ships 8 --no-supabase

# Run with Supabase sync
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
python -m gsc.main --ships 8
```

## Architecture

```
gsc/
├── src/gsc/
│   ├── __init__.py       # Package exports
│   ├── main.py           # CLI entry point
│   ├── simulation.py     # Fleet physics simulation
│   ├── ai_engine.py      # AI decision engine
│   ├── safety.py         # Safety boundary checker
│   ├── telemetry.py      # Telemetry generation & sync
│   └── types.py          # Type definitions (matches protobuf)
├── tests/
│   └── test_gsc.py       # Unit tests
└── pyproject.toml        # Package configuration
```

## Safety Requirements

Per Project Constitution S-001 to S-008:

| Code | Requirement | Threshold |
|------|-------------|-----------|
| S-001 | Fuel reserves | ≥ 10% |
| S-002 | Comm blackout | ≤ 45 min |
| S-003 | Hull temperature | 150K - 450K |
| S-004 | Trajectory deviation | ≤ 100 km |
| S-005 | AI confidence | ≥ 50% |
| S-006 | Human override | Always available |
| S-007 | Collision avoidance | ≥ 10 km |
| S-008 | Abort authority | Always available |

## CLI Options

```
python -m gsc.main [OPTIONS]

Options:
  --ships N          Number of ships to simulate (default: 8)
  --time-scale X     Simulation time multiplier (default: 1.0)
  --tick-interval S  Seconds between ticks (default: 1.0)
  --no-supabase      Disable Supabase sync
```

## Running Tests

```bash
pytest tests/ -v
```

## Inter-Segment Communication

GSC communicates with:
- **MCWI**: Pushes telemetry/alerts to Supabase for dashboard display
- **OAS**: Would receive high-fidelity simulation data (future)

## License

MIT License - see root LICENSE file.
