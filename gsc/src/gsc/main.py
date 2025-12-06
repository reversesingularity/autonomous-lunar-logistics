#!/usr/bin/env python3
"""
GSC Main Entry Point
====================

Runs the Ground Simulation Computer for ALLS mission control.

Usage:
    python -m gsc.main --ships 8 --time-scale 10

Environment Variables:
    SUPABASE_URL: Supabase project URL
    SUPABASE_SERVICE_KEY: Supabase service role key
"""

import argparse
import asyncio
import os
import signal
import sys
import time
from typing import Optional

from dotenv import load_dotenv

from gsc.simulation import FleetSimulator, MissionPhase
from gsc.ai_engine import AIDecisionEngine, DecisionContext
from gsc.safety import SafetyBoundaryChecker
from gsc.telemetry import TelemetryGenerator

# Load environment variables
load_dotenv()


def create_demo_fleet(simulator: FleetSimulator, num_ships: int = 8) -> None:
    """Create a demonstration fleet with ships in various phases."""
    
    demo_configs = [
        ("artemis-1", "Artemis-1", MissionPhase.PHASE_TRANSIT),
        ("artemis-2", "Artemis-2", MissionPhase.PHASE_EARTH_ORBIT),
        ("artemis-3", "Artemis-3", MissionPhase.PHASE_TRANSIT),
        ("luna-cargo-1", "Luna Cargo-1", MissionPhase.PHASE_LUNAR_ORBIT),
        ("luna-cargo-2", "Luna Cargo-2", MissionPhase.PHASE_SURFACE),
        ("starship-7", "Starship-7", MissionPhase.PHASE_ASCENT),
        ("starship-8", "Starship-8", MissionPhase.PHASE_PRELAUNCH),
        ("pioneer-2", "Pioneer-2", MissionPhase.PHASE_TRANSIT),
        ("gateway-1", "Gateway-1", MissionPhase.PHASE_LUNAR_ORBIT),
        ("relay-1", "Relay-1", MissionPhase.PHASE_LUNAR_ORBIT),
        ("relay-2", "Relay-2", MissionPhase.PHASE_LUNAR_ORBIT),
        ("pioneer-1", "Pioneer-1", MissionPhase.PHASE_RETURN_TRANSIT),
    ]
    
    for i, (ship_id, name, phase) in enumerate(demo_configs[:num_ships]):
        simulator.add_ship(ship_id, name, phase)
        print(f"  + {name} ({phase.name})")


async def simulation_loop(
    simulator: FleetSimulator,
    ai_engine: AIDecisionEngine,
    safety_checker: SafetyBoundaryChecker,
    telemetry_gen: TelemetryGenerator,
    tick_interval: float = 1.0,
) -> None:
    """
    Main simulation loop.
    
    Runs continuously, updating simulation and publishing telemetry.
    """
    print("\n[GSC] Starting simulation loop...")
    print(f"      Tick interval: {tick_interval}s")
    print(f"      Ships: {len(simulator.ships)}")
    print(f"      Press Ctrl+C to stop\n")
    
    tick = 0
    
    while True:
        try:
            # Advance simulation
            simulator.step()
            tick += 1
            
            # Process each ship
            for ship in simulator.get_all_states():
                # Generate telemetry
                packet = telemetry_gen.generate_packet(ship)
                
                # AI evaluation
                context = DecisionContext(
                    ship_id=ship.ship_id,
                    ship_name=ship.ship_name,
                    phase=ship.phase,
                    health_status=ship.overall_health(),
                    ai_confidence=ship.ai_confidence,
                    fuel_percent=(ship.fuel_kg / 1200000) * 100,
                    battery_percent=ship.battery_percent,
                    hull_temp_k=ship.hull_temp_k,
                    distance_to_target_km=ship.position.magnitude(),
                )
                
                decisions, alerts = ai_engine.evaluate(context)
                
                # Safety checks
                safety_results, all_safe = safety_checker.check_all(
                    fuel_percent=(ship.fuel_kg / 1200000) * 100,
                    comm_blackout_minutes=0,  # Not simulated yet
                    hull_temp_k=ship.hull_temp_k,
                    trajectory_deviation_km=0,  # Not simulated yet
                    ai_confidence=ship.ai_confidence,
                    nearest_object_km=1000,  # Not simulated yet
                )
                
                # Publish to Supabase (if configured)
                await telemetry_gen.update_ship_status(ship)
                
                if tick % 10 == 0:  # Only publish telemetry every 10 ticks
                    await telemetry_gen.publish_to_supabase(packet)
                
                # Log any decisions or alerts
                for decision in decisions:
                    print(f"[AI] {ship.ship_name}: {decision.action}")
                    
                for alert in alerts:
                    severity = ["INFO", "WARN", "CRIT"][alert.severity]
                    print(f"[{severity}] {ship.ship_name}: {alert.message}")
                    
                if not all_safe:
                    violations = [c for c in safety_results if not c.within_bounds]
                    for v in violations:
                        print(f"[SAFETY] {ship.ship_name}: {v.name} violation ({v.current_value:.1f} {v.unit})")
            
            # Status output every 10 ticks
            if tick % 10 == 0:
                print(f"\r[GSC] Tick {tick} | Ships: {len(simulator.ships)} | Packets: {telemetry_gen.get_packet_count()} | Violations: {safety_checker.get_violation_count()}", end="")
                
            await asyncio.sleep(tick_interval)
            
        except KeyboardInterrupt:
            print("\n\n[GSC] Shutdown requested...")
            break
        except Exception as e:
            print(f"\n[GSC] Error in simulation loop: {e}")
            await asyncio.sleep(1)


def main() -> None:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="GSC - Ground Simulation Computer for ALLS"
    )
    parser.add_argument(
        "--ships", type=int, default=8,
        help="Number of ships to simulate (default: 8)"
    )
    parser.add_argument(
        "--time-scale", type=float, default=1.0,
        help="Simulation time multiplier (default: 1.0)"
    )
    parser.add_argument(
        "--tick-interval", type=float, default=1.0,
        help="Seconds between simulation ticks (default: 1.0)"
    )
    parser.add_argument(
        "--no-supabase", action="store_true",
        help="Disable Supabase sync"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("ALLS Ground Simulation Computer (GSC)")
    print("=" * 60)
    print(f"Version: 0.1.0")
    print(f"Time scale: {args.time_scale}x")
    print()
    
    # Initialize components
    print("[GSC] Initializing simulation...")
    simulator = FleetSimulator(time_scale=args.time_scale)
    create_demo_fleet(simulator, args.ships)
    
    print("\n[GSC] Initializing AI engine...")
    ai_engine = AIDecisionEngine(use_ml_model=False)
    
    print("[GSC] Initializing safety checker...")
    safety_checker = SafetyBoundaryChecker()
    
    print("[GSC] Initializing telemetry generator...")
    supabase_url = None if args.no_supabase else os.getenv("SUPABASE_URL")
    supabase_key = None if args.no_supabase else os.getenv("SUPABASE_SERVICE_KEY")
    telemetry_gen = TelemetryGenerator(
        supabase_url=supabase_url,
        supabase_key=supabase_key,
    )
    
    # Run simulation
    try:
        asyncio.run(simulation_loop(
            simulator,
            ai_engine,
            safety_checker,
            telemetry_gen,
            tick_interval=args.tick_interval,
        ))
    except KeyboardInterrupt:
        pass
        
    print("\n[GSC] Simulation complete.")
    print(f"      Total packets: {telemetry_gen.get_packet_count()}")
    print(f"      Safety violations: {safety_checker.get_violation_count()}")
    print(f"      AI decisions: {len(ai_engine.get_decision_history())}")


if __name__ == "__main__":
    main()
