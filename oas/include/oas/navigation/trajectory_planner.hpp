/**
 * @file trajectory_planner.hpp
 * @brief Trajectory planning for lunar missions
 * 
 * Implements Hohmann transfers, lunar orbit insertion, and powered descent planning.
 * Per Project Constitution Article III: "No AI shall alter a planned trajectory 
 * without explicit human authorization"
 */

#pragma once

#include "oas/types.hpp"
#include <vector>
#include <optional>
#include <cmath>
#include <chrono>

namespace oas::navigation {

/**
 * @brief Represents a single trajectory maneuver
 */
struct Maneuver {
    std::string maneuver_id;
    std::string description;
    int64_t scheduled_time_ms{0};
    Vector3D delta_v{0.0, 0.0, 0.0};      // Required velocity change
    double duration_s{0.0};                // Burn duration in seconds
    double propellant_kg{0.0};             // Estimated propellant consumption
    bool requires_human_authorization{true};
    bool is_executed{false};
    bool is_aborted{false};
};

/**
 * @brief Represents a complete trajectory plan
 */
struct TrajectoryPlan {
    std::string plan_id;
    std::string ship_id;
    int64_t created_ms{0};
    int64_t valid_until_ms{0};
    std::vector<Maneuver> maneuvers;
    double total_delta_v{0.0};
    double total_propellant_kg{0.0};
    int64_t total_duration_ms{0};
    bool is_human_approved{false};
    std::string approval_signature;
};

/**
 * @brief Waypoint along a trajectory
 */
struct Waypoint {
    int64_t timestamp_ms{0};
    Vector3D position{0.0, 0.0, 0.0};
    Vector3D velocity{0.0, 0.0, 0.0};
    MissionPhase expected_phase{MissionPhase::PHASE_UNKNOWN};
};

/**
 * @brief Trajectory corridor bounds
 */
struct TrajectoryCorridor {
    std::vector<Waypoint> nominal_path;
    double max_deviation_km{100.0};  // Maximum allowed deviation from nominal
    
    /**
     * @brief Check if position is within corridor bounds
     */
    bool is_within_bounds(const Vector3D& position, int64_t timestamp_ms) const {
        // Find nearest waypoint by time
        const Waypoint* nearest = nullptr;
        int64_t min_time_diff = std::numeric_limits<int64_t>::max();
        
        for (const auto& wp : nominal_path) {
            int64_t diff = std::abs(wp.timestamp_ms - timestamp_ms);
            if (diff < min_time_diff) {
                min_time_diff = diff;
                nearest = &wp;
            }
        }
        
        if (!nearest) return true;  // No waypoints defined
        
        // Calculate 3D distance
        double dx = position.x - nearest->position.x;
        double dy = position.y - nearest->position.y;
        double dz = position.z - nearest->position.z;
        double distance = std::sqrt(dx*dx + dy*dy + dz*dz);
        
        return distance <= max_deviation_km;
    }
};

/**
 * @brief Physical constants for trajectory calculations
 */
struct OrbitalConstants {
    static constexpr double G = 6.67430e-11;              // Gravitational constant (m³/kg/s²)
    static constexpr double EARTH_MASS = 5.972e24;        // kg
    static constexpr double MOON_MASS = 7.342e22;         // kg
    static constexpr double EARTH_RADIUS = 6371.0;        // km
    static constexpr double MOON_RADIUS = 1737.4;         // km
    static constexpr double EARTH_MOON_DISTANCE = 384400.0; // km (average)
    static constexpr double MU_EARTH = 398600.4418;       // km³/s² (standard gravitational parameter)
    static constexpr double MU_MOON = 4902.8;             // km³/s²
};

/**
 * @brief Trajectory planner for lunar missions
 * 
 * Computes orbital mechanics for:
 * - Hohmann transfer from LEO to lunar transfer orbit
 * - Lunar orbit insertion (LOI)
 * - Powered descent planning
 * 
 * All trajectory modifications require human authorization per Constitution Article III.
 */
class TrajectoryPlanner {
public:
    TrajectoryPlanner() = default;
    
    /**
     * @brief Plan a complete Earth-to-Moon trajectory
     * @param ship_id Identifier for the spacecraft
     * @param initial_altitude_km Starting altitude above Earth (LEO)
     * @param target_lunar_altitude_km Target lunar orbit altitude
     * @param departure_time_ms Scheduled departure time
     * @return Complete trajectory plan requiring human approval
     */
    TrajectoryPlan plan_earth_to_moon(
        const std::string& ship_id,
        double initial_altitude_km,
        double target_lunar_altitude_km,
        int64_t departure_time_ms
    ) const {
        TrajectoryPlan plan;
        plan.plan_id = generate_plan_id();
        plan.ship_id = ship_id;
        plan.created_ms = get_timestamp_ms();
        plan.is_human_approved = false;  // Per Constitution Article III
        
        // Calculate orbital radii
        double r_leo = OrbitalConstants::EARTH_RADIUS + initial_altitude_km;
        double r_lunar = OrbitalConstants::EARTH_MOON_DISTANCE;
        
        // Hohmann transfer parameters
        double v_leo = std::sqrt(OrbitalConstants::MU_EARTH / r_leo);
        double a_transfer = (r_leo + r_lunar) / 2.0;
        double v_departure = std::sqrt(OrbitalConstants::MU_EARTH * (2.0/r_leo - 1.0/a_transfer));
        
        // Trans-Lunar Injection (TLI) maneuver
        Maneuver tli;
        tli.maneuver_id = "TLI-001";
        tli.description = "Trans-Lunar Injection burn";
        tli.scheduled_time_ms = departure_time_ms;
        tli.delta_v = {v_departure - v_leo, 0.0, 0.0};  // Prograde burn
        tli.duration_s = estimate_burn_duration(magnitude(tli.delta_v));
        tli.propellant_kg = estimate_propellant(magnitude(tli.delta_v));
        tli.requires_human_authorization = true;
        plan.maneuvers.push_back(tli);
        
        // Transfer time (half ellipse period)
        double transfer_period_s = M_PI * std::sqrt(
            std::pow(a_transfer, 3) / OrbitalConstants::MU_EARTH
        );
        int64_t arrival_time_ms = departure_time_ms + 
            static_cast<int64_t>(transfer_period_s * 1000);
        
        // Lunar Orbit Insertion (LOI)
        double r_lunar_orbit = OrbitalConstants::MOON_RADIUS + target_lunar_altitude_km;
        double v_arrival = std::sqrt(OrbitalConstants::MU_EARTH * (2.0/r_lunar - 1.0/a_transfer));
        double v_lunar_orbit = std::sqrt(OrbitalConstants::MU_MOON / r_lunar_orbit);
        
        Maneuver loi;
        loi.maneuver_id = "LOI-001";
        loi.description = "Lunar Orbit Insertion burn";
        loi.scheduled_time_ms = arrival_time_ms;
        loi.delta_v = {-(v_arrival - v_lunar_orbit), 0.0, 0.0};  // Retrograde burn
        loi.duration_s = estimate_burn_duration(magnitude(loi.delta_v));
        loi.propellant_kg = estimate_propellant(magnitude(loi.delta_v));
        loi.requires_human_authorization = true;
        plan.maneuvers.push_back(loi);
        
        // Calculate totals
        for (const auto& m : plan.maneuvers) {
            plan.total_delta_v += magnitude(m.delta_v);
            plan.total_propellant_kg += m.propellant_kg;
        }
        
        plan.total_duration_ms = arrival_time_ms - departure_time_ms + 
            static_cast<int64_t>(loi.duration_s * 1000);
        plan.valid_until_ms = departure_time_ms;  // Must execute by scheduled time
        
        return plan;
    }
    
    /**
     * @brief Plan powered descent to lunar surface
     * @param ship_id Spacecraft identifier
     * @param current_altitude_km Current altitude above lunar surface
     * @param landing_site Target landing coordinates
     * @param descent_start_ms Scheduled descent initiation time
     * @return Descent trajectory plan
     */
    TrajectoryPlan plan_powered_descent(
        const std::string& ship_id,
        double current_altitude_km,
        const Vector3D& landing_site,
        int64_t descent_start_ms
    ) const {
        TrajectoryPlan plan;
        plan.plan_id = generate_plan_id();
        plan.ship_id = ship_id;
        plan.created_ms = get_timestamp_ms();
        plan.is_human_approved = false;
        
        // Descent phases: deorbit, braking, approach, terminal
        
        // Deorbit burn
        Maneuver deorbit;
        deorbit.maneuver_id = "PDI-001";
        deorbit.description = "Powered Descent Initiation";
        deorbit.scheduled_time_ms = descent_start_ms;
        deorbit.delta_v = {-0.02, 0.0, 0.0};  // Small retrograde burn (km/s)
        deorbit.duration_s = 30.0;
        deorbit.propellant_kg = estimate_propellant(magnitude(deorbit.delta_v));
        deorbit.requires_human_authorization = true;
        plan.maneuvers.push_back(deorbit);
        
        // Braking phase
        Maneuver braking;
        braking.maneuver_id = "BRK-001";
        braking.description = "Braking phase - primary deceleration";
        braking.scheduled_time_ms = descent_start_ms + 300000;  // +5 minutes
        braking.delta_v = {-1.5, 0.0, 0.0};  // Major deceleration
        braking.duration_s = 360.0;  // 6 minute burn
        braking.propellant_kg = estimate_propellant(magnitude(braking.delta_v));
        braking.requires_human_authorization = true;
        plan.maneuvers.push_back(braking);
        
        // Approach phase
        Maneuver approach;
        approach.maneuver_id = "APP-001";
        approach.description = "Approach phase - fine deceleration";
        approach.scheduled_time_ms = descent_start_ms + 720000;  // +12 minutes
        approach.delta_v = {-0.3, 0.0, -0.1};  // Decel + vertical component
        approach.duration_s = 120.0;
        approach.propellant_kg = estimate_propellant(magnitude(approach.delta_v));
        approach.requires_human_authorization = true;
        plan.maneuvers.push_back(approach);
        
        // Terminal descent
        Maneuver terminal;
        terminal.maneuver_id = "TRM-001";
        terminal.description = "Terminal descent - hover and touchdown";
        terminal.scheduled_time_ms = descent_start_ms + 900000;  // +15 minutes
        terminal.delta_v = {0.0, 0.0, -0.05};  // Vertical descent
        terminal.duration_s = 60.0;
        terminal.propellant_kg = estimate_propellant(magnitude(terminal.delta_v) * 1.5);  // Extra margin
        terminal.requires_human_authorization = true;
        plan.maneuvers.push_back(terminal);
        
        // Calculate totals
        for (const auto& m : plan.maneuvers) {
            plan.total_delta_v += magnitude(m.delta_v);
            plan.total_propellant_kg += m.propellant_kg;
        }
        
        plan.total_duration_ms = 960000;  // ~16 minutes
        plan.valid_until_ms = descent_start_ms;
        
        return plan;
    }
    
    /**
     * @brief Calculate correction maneuver to return to planned trajectory
     * @param current_position Current spacecraft position
     * @param current_velocity Current spacecraft velocity
     * @param target_waypoint Target waypoint to reach
     * @return Correction maneuver (requires human approval)
     */
    std::optional<Maneuver> calculate_correction(
        const Vector3D& current_position,
        const Vector3D& current_velocity,
        const Waypoint& target_waypoint,
        int64_t current_time_ms
    ) const {
        // Calculate required velocity change
        double dt_s = (target_waypoint.timestamp_ms - current_time_ms) / 1000.0;
        if (dt_s <= 0) return std::nullopt;  // Target in the past
        
        // Simple linear approximation (real system would use full orbital mechanics)
        Vector3D required_velocity;
        required_velocity.x = (target_waypoint.position.x - current_position.x) / dt_s;
        required_velocity.y = (target_waypoint.position.y - current_position.y) / dt_s;
        required_velocity.z = (target_waypoint.position.z - current_position.z) / dt_s;
        
        Vector3D delta_v;
        delta_v.x = required_velocity.x - current_velocity.x;
        delta_v.y = required_velocity.y - current_velocity.y;
        delta_v.z = required_velocity.z - current_velocity.z;
        
        double delta_v_magnitude = magnitude(delta_v);
        
        // Only suggest correction if deviation is significant
        if (delta_v_magnitude < 0.001) return std::nullopt;  // < 1 m/s
        
        Maneuver correction;
        correction.maneuver_id = "MCC-" + std::to_string(current_time_ms % 1000);
        correction.description = "Mid-course correction";
        correction.scheduled_time_ms = current_time_ms + 60000;  // +1 minute
        correction.delta_v = delta_v;
        correction.duration_s = estimate_burn_duration(delta_v_magnitude);
        correction.propellant_kg = estimate_propellant(delta_v_magnitude);
        correction.requires_human_authorization = true;  // Per Constitution Article III
        
        return correction;
    }
    
    /**
     * @brief Generate trajectory corridor for monitoring
     * @param plan Approved trajectory plan
     * @param resolution_ms Time resolution for waypoints
     * @return Trajectory corridor with nominal path
     */
    TrajectoryCorridor generate_corridor(
        const TrajectoryPlan& plan,
        int64_t resolution_ms = 300000  // 5 minute default
    ) const {
        TrajectoryCorridor corridor;
        corridor.max_deviation_km = 100.0;  // 100 km corridor
        
        // Generate waypoints between maneuvers
        if (plan.maneuvers.empty()) return corridor;
        
        int64_t start_time = plan.maneuvers.front().scheduled_time_ms;
        int64_t end_time = plan.maneuvers.back().scheduled_time_ms + 
            static_cast<int64_t>(plan.maneuvers.back().duration_s * 1000);
        
        for (int64_t t = start_time; t <= end_time; t += resolution_ms) {
            Waypoint wp;
            wp.timestamp_ms = t;
            // Position/velocity would be computed from orbital propagation
            // Placeholder for demonstration
            corridor.nominal_path.push_back(wp);
        }
        
        return corridor;
    }

private:
    /**
     * @brief Calculate vector magnitude
     */
    static double magnitude(const Vector3D& v) {
        return std::sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    }
    
    /**
     * @brief Estimate burn duration based on delta-v
     * Assumes ~0.1 km/s per 60 seconds for typical chemical propulsion
     */
    static double estimate_burn_duration(double delta_v_km_s) {
        return delta_v_km_s * 600.0;  // seconds
    }
    
    /**
     * @brief Estimate propellant consumption
     * Uses simplified Tsiolkovsky equation with typical values
     * Assumes Isp ~450s, dry mass ~10000 kg
     */
    static double estimate_propellant(double delta_v_km_s) {
        constexpr double ISP = 450.0;  // seconds (typical for cryogenic)
        constexpr double G0 = 0.00981;  // km/s²
        constexpr double DRY_MASS = 10000.0;  // kg
        
        double mass_ratio = std::exp(delta_v_km_s / (ISP * G0));
        double wet_mass = DRY_MASS * mass_ratio;
        return wet_mass - DRY_MASS;
    }
    
    /**
     * @brief Generate unique plan ID
     */
    static std::string generate_plan_id() {
        auto now = std::chrono::system_clock::now();
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()
        ).count();
        return "PLAN-" + std::to_string(ms);
    }
    
    /**
     * @brief Get current timestamp in milliseconds
     */
    static int64_t get_timestamp_ms() {
        auto now = std::chrono::system_clock::now();
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()
        ).count();
    }
};

}  // namespace oas::navigation
