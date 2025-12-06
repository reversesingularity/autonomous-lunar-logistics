"""
GSC - Ground Simulation Computer
================================

AI/ML Ground Station for the Autonomous Lunar Logistics System (ALLS).

This module provides:
- Multi-ship physics simulation
- AI decision engine (PyTorch + Hugging Face)
- Real-time telemetry generation
- Safety boundary enforcement
- Supabase sync for MCWI dashboard

Per SPEC-KIT Article IV: GSC is the AI ground truth provider.
"""

__version__ = "0.1.0"
__author__ = "Christopher Modina"

from gsc.simulation import FleetSimulator
from gsc.ai_engine import AIDecisionEngine
from gsc.safety import SafetyBoundaryChecker
from gsc.telemetry import TelemetryGenerator

__all__ = [
    "FleetSimulator",
    "AIDecisionEngine", 
    "SafetyBoundaryChecker",
    "TelemetryGenerator",
]
