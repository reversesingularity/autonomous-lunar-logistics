"""
Fleet Simulator
===============

Multi-ship physics simulation for Earth-Moon transfer trajectories.

Uses simplified Keplerian mechanics with Hohmann transfer approximations.
Full n-body simulation would be implemented in OAS segment.
"""

import math
import time
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Optional

import numpy as np

from gsc.types import Vector3D, Quaternion, MissionPhase, HealthStatus


# Physical constants
EARTH_RADIUS_KM = 6371.0
MOON_RADIUS_KM = 1737.4
EARTH_MOON_DISTANCE_KM = 384400.0
EARTH_MU = 398600.4418  # km³/s² - gravitational parameter
MOON_MU = 4902.8  # km³/s²

# Orbital parameters
LEO_ALTITUDE_KM = 400.0
LUNAR_ORBIT_ALTITUDE_KM = 100.0


@dataclass
class ShipState:
    """Current state of a simulated ship."""
    
    ship_id: str
    ship_name: str
    phase: MissionPhase = MissionPhase.PHASE_PRELAUNCH
    
    # Position in Earth-centered frame (km)
    position: Vector3D = field(default_factory=lambda: Vector3D(EARTH_RADIUS_KM, 0, 0))
    velocity: Vector3D = field(default_factory=lambda: Vector3D(0, 0, 0))
    
    # Orientation
    orientation: Quaternion = field(default_factory=lambda: Quaternion(1, 0, 0, 0))
    angular_velocity: Vector3D = field(default_factory=lambda: Vector3D(0, 0, 0))
    
    # Resources
    fuel_kg: float = 1200000.0  # Starship propellant capacity
    battery_percent: float = 100.0
    hull_temp_k: float = 293.0  # Room temperature
    
    # Health
    propulsion_health: HealthStatus = HealthStatus.HEALTH_NOMINAL
    thermal_health: HealthStatus = HealthStatus.HEALTH_NOMINAL
    power_health: HealthStatus = HealthStatus.HEALTH_NOMINAL
    nav_health: HealthStatus = HealthStatus.HEALTH_NOMINAL
    comm_health: HealthStatus = HealthStatus.HEALTH_NOMINAL
    
    # AI state
    ai_confidence: float = 0.95
    current_objective: str = "Awaiting mission assignment"
    
    # Timing
    mission_start_time: float = 0.0
    last_update: float = 0.0
    
    def overall_health(self) -> HealthStatus:
        """Return worst health status across all subsystems."""
        return max(
            self.propulsion_health,
            self.thermal_health,
            self.power_health,
            self.nav_health,
            self.comm_health,
        )


class FleetSimulator:
    """
    Multi-ship fleet simulation engine.
    
    Simulates ships through mission phases from launch to lunar landing.
    """
    
    def __init__(self, time_scale: float = 1.0):
        """
        Initialize the fleet simulator.
        
        Args:
            time_scale: Simulation time multiplier (1.0 = real-time)
        """
        self.time_scale = time_scale
        self.ships: dict[str, ShipState] = {}
        self.simulation_time: float = 0.0
        self.last_real_time: float = time.time()
        
    def add_ship(
        self,
        ship_id: str,
        ship_name: str,
        phase: MissionPhase = MissionPhase.PHASE_PRELAUNCH,
    ) -> ShipState:
        """
        Add a new ship to the simulation.
        
        Args:
            ship_id: Unique identifier
            ship_name: Human-readable name
            phase: Initial mission phase
            
        Returns:
            The created ship state
        """
        ship = ShipState(
            ship_id=ship_id,
            ship_name=ship_name,
            phase=phase,
            mission_start_time=self.simulation_time,
            last_update=self.simulation_time,
        )
        
        # Set initial position based on phase
        self._initialize_position(ship)
        
        self.ships[ship_id] = ship
        return ship
        
    def _initialize_position(self, ship: ShipState) -> None:
        """Set initial position based on mission phase."""
        phase = ship.phase
        
        if phase == MissionPhase.PHASE_PRELAUNCH:
            # On Earth surface
            ship.position = Vector3D(EARTH_RADIUS_KM, 0, 0)
            ship.velocity = Vector3D(0, 0, 0)
            ship.current_objective = "Pre-launch checks in progress"
            
        elif phase == MissionPhase.PHASE_ASCENT:
            # Rising from Earth
            alt = np.random.uniform(50, 200)
            ship.position = Vector3D(EARTH_RADIUS_KM + alt, 0, 0)
            ship.velocity = Vector3D(0.5, 7.0, 0)  # Roughly orbital velocity
            ship.current_objective = "Ascent profile nominal"
            
        elif phase == MissionPhase.PHASE_EARTH_ORBIT:
            # LEO parking orbit
            r = EARTH_RADIUS_KM + LEO_ALTITUDE_KM
            v = math.sqrt(EARTH_MU / r)  # Circular orbit velocity
            angle = np.random.uniform(0, 2 * math.pi)
            ship.position = Vector3D(r * math.cos(angle), r * math.sin(angle), 0)
            ship.velocity = Vector3D(-v * math.sin(angle), v * math.cos(angle), 0)
            ship.current_objective = "Parking orbit established"
            
        elif phase == MissionPhase.PHASE_TRANSIT:
            # Trans-lunar injection - somewhere between Earth and Moon
            progress = np.random.uniform(0.2, 0.8)
            r = EARTH_RADIUS_KM + progress * (EARTH_MOON_DISTANCE_KM - EARTH_RADIUS_KM - MOON_RADIUS_KM)
            ship.position = Vector3D(r, np.random.uniform(-10000, 10000), 0)
            ship.velocity = Vector3D(0.8, 0.1, 0)  # Roughly TLI velocity
            ship.current_objective = "Trans-lunar injection complete"
            
        elif phase == MissionPhase.PHASE_LUNAR_ORBIT:
            # Lunar orbit
            r_from_moon = MOON_RADIUS_KM + LUNAR_ORBIT_ALTITUDE_KM
            angle = np.random.uniform(0, 2 * math.pi)
            # Position relative to Moon (at Earth-Moon distance)
            moon_x = EARTH_MOON_DISTANCE_KM
            ship.position = Vector3D(
                moon_x + r_from_moon * math.cos(angle),
                r_from_moon * math.sin(angle),
                0
            )
            v = math.sqrt(MOON_MU / r_from_moon)
            ship.velocity = Vector3D(-v * math.sin(angle), v * math.cos(angle), 0)
            ship.current_objective = "Lunar orbit insertion complete"
            
        elif phase == MissionPhase.PHASE_DESCENT:
            # Descending to lunar surface
            alt = np.random.uniform(10, 50)
            ship.position = Vector3D(
                EARTH_MOON_DISTANCE_KM,
                MOON_RADIUS_KM + alt,
                0
            )
            ship.velocity = Vector3D(0, -0.1, 0)
            ship.current_objective = "Powered descent initiated"
            
        elif phase == MissionPhase.PHASE_SURFACE:
            # On lunar surface
            ship.position = Vector3D(
                EARTH_MOON_DISTANCE_KM + MOON_RADIUS_KM,
                0,
                0
            )
            ship.velocity = Vector3D(0, 0, 0)
            ship.current_objective = "Surface operations nominal"
            
        elif phase == MissionPhase.PHASE_RETURN_TRANSIT:
            # Returning to Earth
            progress = np.random.uniform(0.2, 0.8)
            r = EARTH_MOON_DISTANCE_KM - progress * (EARTH_MOON_DISTANCE_KM - EARTH_RADIUS_KM * 2)
            ship.position = Vector3D(r, np.random.uniform(-5000, 5000), 0)
            ship.velocity = Vector3D(-0.9, 0, 0)
            ship.current_objective = "Return transit initiated"
            
    def step(self, dt: Optional[float] = None) -> None:
        """
        Advance the simulation by one time step.
        
        Args:
            dt: Time step in seconds. If None, uses real elapsed time.
        """
        current_time = time.time()
        
        if dt is None:
            dt = (current_time - self.last_real_time) * self.time_scale
            
        self.last_real_time = current_time
        self.simulation_time += dt
        
        for ship in self.ships.values():
            self._update_ship(ship, dt)
            
    def _update_ship(self, ship: ShipState, dt: float) -> None:
        """Update a single ship's state."""
        # Simple Euler integration for position
        ship.position.x += ship.velocity.x * dt
        ship.position.y += ship.velocity.y * dt
        ship.position.z += ship.velocity.z * dt
        
        # Calculate distance from Earth center
        r = math.sqrt(
            ship.position.x ** 2 + 
            ship.position.y ** 2 + 
            ship.position.z ** 2
        )
        
        # Simple gravity (Earth only for now)
        if r > 0:
            g = -EARTH_MU / (r ** 2)
            ship.velocity.x += g * (ship.position.x / r) * dt
            ship.velocity.y += g * (ship.position.y / r) * dt
            ship.velocity.z += g * (ship.position.z / r) * dt
        
        # Update fuel consumption (simplified)
        if ship.phase in [MissionPhase.PHASE_ASCENT, MissionPhase.PHASE_DESCENT]:
            ship.fuel_kg = max(0, ship.fuel_kg - 1000 * dt)  # High burn rate
        elif ship.phase == MissionPhase.PHASE_TRANSIT:
            ship.fuel_kg = max(0, ship.fuel_kg - 10 * dt)  # Station keeping
            
        # Update battery (solar charging simplified)
        if ship.phase != MissionPhase.PHASE_PRELAUNCH:
            ship.battery_percent = min(100, ship.battery_percent + 0.1 * dt)
            
        # Thermal (very simplified)
        if ship.phase == MissionPhase.PHASE_ASCENT:
            ship.hull_temp_k = min(500, ship.hull_temp_k + 10 * dt)
        else:
            ship.hull_temp_k = max(200, min(350, ship.hull_temp_k + np.random.uniform(-1, 1) * dt))
            
        # AI confidence fluctuation
        ship.ai_confidence = max(0.5, min(1.0, 
            ship.ai_confidence + np.random.uniform(-0.01, 0.01)
        ))
        
        ship.last_update = self.simulation_time
        
    def get_all_states(self) -> list[ShipState]:
        """Get current state of all ships."""
        return list(self.ships.values())
        
    def get_ship(self, ship_id: str) -> Optional[ShipState]:
        """Get state of a specific ship."""
        return self.ships.get(ship_id)
