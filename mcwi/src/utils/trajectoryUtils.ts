/**
 * Trajectory utilities for visualizing ship paths
 * Generates trajectory data for past, present, and predicted positions
 */

import { Cartesian3 } from 'cesium';
import type { ShipStatus, TimeViewMode } from '../types';

// Earth-Moon constants
const EARTH_MOON_DISTANCE_KM = 384400;
const EARTH_RADIUS_KM = 6371;

/**
 * Generate trajectory points for a ship based on mission phase
 */
export function generateTrajectoryPoints(
  ship: ShipStatus,
  _timeMode: TimeViewMode,
  numPoints: number = 50
): Cartesian3[] {
  if (!ship.position) return [];

  const phase = ship.phase;

  switch (phase) {
    case 3: // Earth Orbit
      return generateEarthOrbitTrajectory(ship, numPoints);
    case 4: // Transit to Moon
      return generateTransitTrajectory(ship, numPoints, 'toMoon');
    case 5: // Lunar Orbit
      return generateLunarOrbitTrajectory(ship, numPoints);
    case 8: // Return Transit
      return generateTransitTrajectory(ship, numPoints, 'toEarth');
    default:
      // For other phases, just return current position
      return [positionToCartesian(ship.position)];
  }
}

/**
 * Generate Earth orbit trajectory (circular approximation)
 */
function generateEarthOrbitTrajectory(ship: ShipStatus, numPoints: number): Cartesian3[] {
  const points: Cartesian3[] = [];
  const pos = ship.position!;
  
  // Calculate orbital radius from current position
  const radius = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
  const altitudeKm = radius - EARTH_RADIUS_KM;
  const altitudeM = altitudeKm * 1000;
  
  // Generate circular orbit points
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const lat = Math.sin(angle) * 28.5; // Typical ISS-like inclination
    const lon = (angle * 180) / Math.PI;
    points.push(Cartesian3.fromDegrees(lon, lat, altitudeM));
  }
  
  return points;
}

/**
 * Generate lunar orbit trajectory
 */
function generateLunarOrbitTrajectory(ship: ShipStatus, numPoints: number): Cartesian3[] {
  const points: Cartesian3[] = [];
  const pos = ship.position!;
  
  // Calculate distance from Moon center
  const moonX = EARTH_MOON_DISTANCE_KM;
  const dx = pos.x - moonX;
  const dy = pos.y;
  const dz = pos.z;
  const radius = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
  
  // Moon's position in Earth-centered frame (simplified - along X axis)
  const moonCenterM = Cartesian3.fromDegrees(0, 0, EARTH_MOON_DISTANCE_KM * 1000);
  
  // Generate orbit around Moon
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const offset = new Cartesian3(
      Math.cos(angle) * radius * 1000,
      Math.sin(angle) * radius * 1000,
      Math.sin(angle * 0.5) * radius * 200 // Small Z variation for 3D effect
    );
    points.push(Cartesian3.add(moonCenterM, offset, new Cartesian3()));
  }
  
  return points;
}

/**
 * Generate transit trajectory between Earth and Moon
 */
function generateTransitTrajectory(
  _ship: ShipStatus,
  numPoints: number,
  direction: 'toMoon' | 'toEarth'
): Cartesian3[] {
  const points: Cartesian3[] = [];
  
  // Generate bezier-like curve for trans-lunar injection / return
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    
    // Different trajectory shape based on direction
    let x: number, y: number;
    
    if (direction === 'toMoon') {
      // Outbound trajectory - curve above orbital plane
      x = t * EARTH_MOON_DISTANCE_KM;
      y = Math.sin(t * Math.PI) * 50000; // Max Y deviation mid-transit
    } else {
      // Return trajectory - curve below orbital plane
      x = (1 - t) * EARTH_MOON_DISTANCE_KM;
      y = -Math.sin(t * Math.PI) * 50000;
    }
    
    // Convert to proper scale for visualization
    const lon = (x / EARTH_MOON_DISTANCE_KM) * 180 - 90;
    const lat = (y / 50000) * 15;
    const alt = EARTH_RADIUS_KM * 5 * 1000; // High altitude for visibility
    
    points.push(Cartesian3.fromDegrees(lon, lat, alt));
  }
  
  return points;
}

/**
 * Convert position to Cartesian3 (simplified for transit visualization)
 */
function positionToCartesian(position: { x: number; y: number; z: number }): Cartesian3 {
  const progress = position.x / EARTH_MOON_DISTANCE_KM;
  const lon = progress * 180 - 90;
  const lat = (position.y / 50000) * 15;
  const alt = EARTH_RADIUS_KM * 5 * 1000;
  return Cartesian3.fromDegrees(lon, lat, alt);
}

/**
 * Get uncertainty cone width based on time mode and confidence
 */
export function getUncertaintyConeWidth(
  timeMode: TimeViewMode,
  aiConfidence: number,
  distanceFromPresent: number // in hours
): number {
  // Base uncertainty in meters
  const baseUncertainty = 1000;
  
  // Time mode multipliers
  const modeMultiplier: Record<TimeViewMode, number> = {
    'LIVE_DELAYED': 0, // No uncertainty, it's real data
    'NOW_SIMULATED': 1, // Small uncertainty for current
    'FUTURE_PLANNED': 2, // Larger uncertainty for predictions
  };
  
  // Uncertainty grows with time from present
  const timeGrowth = Math.sqrt(Math.abs(distanceFromPresent));
  
  // AI confidence reduces uncertainty
  const confidenceFactor = 2 - aiConfidence; // 1.0 confidence = 1x, 0.5 confidence = 1.5x
  
  return baseUncertainty * modeMultiplier[timeMode] * timeGrowth * confidenceFactor;
}

/**
 * Color for trajectory based on time mode
 */
export function getTrajectoryColor(timeMode: TimeViewMode): string {
  switch (timeMode) {
    case 'LIVE_DELAYED': return '#22c55e'; // Green for past (verified)
    case 'NOW_SIMULATED': return '#3b82f6'; // Blue for present
    case 'FUTURE_PLANNED': return '#8b5cf6'; // Purple for future (predicted)
    default: return '#6b7280'; // Gray
  }
}

/**
 * Get trajectory style properties
 */
export function getTrajectoryStyle(timeMode: TimeViewMode) {
  return {
    color: getTrajectoryColor(timeMode),
    width: timeMode === 'FUTURE_PLANNED' ? 2 : 3, // Thinner for predictions
    dashPattern: timeMode === 'FUTURE_PLANNED' ? [10, 10] : undefined, // Dashed for predictions
    opacity: timeMode === 'LIVE_DELAYED' ? 0.6 : 1.0, // Faded for past
  };
}
