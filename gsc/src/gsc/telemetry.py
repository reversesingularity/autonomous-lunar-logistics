"""
Telemetry Generator
===================

Generates telemetry packets from simulation state for MCWI consumption.
Syncs to Supabase for real-time dashboard updates.
"""

import time
import uuid
from typing import Optional
import asyncio

from gsc.types import (
    TelemetryPacket,
    ReferenceFrame,
    Vector3D,
    Quaternion,
)
from gsc.simulation import ShipState


class TelemetryGenerator:
    """
    Generates and publishes telemetry packets.
    
    Supports both direct Supabase sync and gRPC streaming.
    """
    
    def __init__(
        self,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        publish_interval_ms: int = 1000,
    ):
        """
        Initialize telemetry generator.
        
        Args:
            supabase_url: Supabase project URL
            supabase_key: Supabase service key (not anon key)
            publish_interval_ms: How often to publish telemetry
        """
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.publish_interval_ms = publish_interval_ms
        self.supabase_client = None
        self.packet_count = 0
        
        if supabase_url and supabase_key:
            self._init_supabase()
            
    def _init_supabase(self) -> None:
        """Initialize Supabase client."""
        try:
            from supabase import create_client
            self.supabase_client = create_client(self.supabase_url, self.supabase_key)
            print(f"[GSC] Connected to Supabase")
        except ImportError:
            print("[GSC] Supabase client not installed, running in offline mode")
        except Exception as e:
            print(f"[GSC] Failed to connect to Supabase: {e}")
            
    def generate_packet(self, ship: ShipState) -> TelemetryPacket:
        """
        Generate a telemetry packet from ship state.
        
        Args:
            ship: Current ship state
            
        Returns:
            TelemetryPacket ready for transmission
        """
        timestamp_ms = int(time.time() * 1000)
        mission_elapsed_ms = int((ship.last_update - ship.mission_start_time) * 1000)
        
        packet = TelemetryPacket(
            ship_id=ship.ship_id,
            timestamp_ms=timestamp_ms,
            mission_elapsed_time_ms=mission_elapsed_ms,
            reference_frame=ReferenceFrame.FRAME_EARTH,
            position=ship.position,
            velocity=ship.velocity,
            orientation=ship.orientation,
            angular_velocity=ship.angular_velocity,
            propellant_mass_kg=ship.fuel_kg,
            propulsion_health=ship.propulsion_health,
            thermal_health=ship.thermal_health,
            power_health=ship.power_health,
            nav_health=ship.nav_health,
            comm_health=ship.comm_health,
        )
        
        self.packet_count += 1
        return packet
        
    async def publish_to_supabase(self, packet: TelemetryPacket) -> bool:
        """
        Publish telemetry packet to Supabase.
        
        Args:
            packet: Telemetry packet to publish
            
        Returns:
            True if successful
        """
        if not self.supabase_client:
            return False
            
        try:
            data = {
                "ship_id": packet.ship_id,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(packet.timestamp_ms / 1000)),
                "frame": "FRAME_EARTH",
                "position_x": packet.position.x,
                "position_y": packet.position.y,
                "position_z": packet.position.z,
                "velocity_x": packet.velocity.x,
                "velocity_y": packet.velocity.y,
                "velocity_z": packet.velocity.z,
                "orientation_w": packet.orientation.w,
                "orientation_x": packet.orientation.x,
                "orientation_y": packet.orientation.y,
                "orientation_z": packet.orientation.z,
                "propulsion_health": int(packet.propulsion_health),
                "thermal_health": int(packet.thermal_health),
                "power_health": int(packet.power_health),
                "nav_health": int(packet.nav_health),
                "comm_health": int(packet.comm_health),
                "fuel_percent": min(100, max(0, packet.propellant_mass_kg / 12000)),  # Normalized
                "battery_percent": 100.0,  # Placeholder
                "hull_temp_k": 293.0,  # Placeholder
            }
            
            self.supabase_client.table("telemetry").insert(data).execute()
            return True
            
        except Exception as e:
            print(f"[GSC] Failed to publish telemetry: {e}")
            return False
            
    async def update_ship_status(self, ship: ShipState) -> bool:
        """
        Update ship status in Supabase.
        
        Args:
            ship: Ship state to update
            
        Returns:
            True if successful
        """
        if not self.supabase_client:
            return False
            
        try:
            data = {
                "phase": int(ship.phase),
                "overall_health": int(ship.overall_health()),
                "last_telemetry_ms": int(ship.last_update * 1000),
                "current_objective": ship.current_objective,
                "ai_confidence": ship.ai_confidence,
                "position_x": ship.position.x,
                "position_y": ship.position.y,
                "position_z": ship.position.z,
            }
            
            # Upsert ship status
            self.supabase_client.table("ships").upsert({
                "id": ship.ship_id,
                "ship_name": ship.ship_name,
                **data
            }, on_conflict="id").execute()
            
            return True
            
        except Exception as e:
            print(f"[GSC] Failed to update ship status: {e}")
            return False
            
    def get_packet_count(self) -> int:
        """Get total packets generated."""
        return self.packet_count
