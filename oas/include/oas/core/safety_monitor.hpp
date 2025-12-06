/**
 * @file safety_monitor.hpp
 * @brief Safety boundary monitoring per Project Constitution
 * 
 * Implements S-001 through S-008 safety requirements.
 * All checks are deterministic and verifiable.
 */

#pragma once

#include "oas/types.hpp"
#include <vector>
#include <functional>

namespace oas::core {

/**
 * @brief Safety monitor enforcing Project Constitution requirements
 * 
 * Safety Requirements:
 * - S-001: Fuel reserves (minimum 10%)
 * - S-002: Communication blackout limits (45 min max)
 * - S-003: Thermal limits (150K - 450K)
 * - S-004: Trajectory deviation (100 km max)
 * - S-005: AI confidence minimum (50%)
 * - S-006: Human override capability (always available)
 * - S-007: Collision avoidance (10 km minimum)
 * - S-008: Abort authority (always available)
 */
class SafetyMonitor {
public:
    // Safety thresholds (MUST match SPEC-KIT values)
    static constexpr double FUEL_MIN_PERCENT = 10.0;
    static constexpr double COMM_BLACKOUT_MAX_MINUTES = 45.0;
    static constexpr double TEMP_MIN_K = 150.0;
    static constexpr double TEMP_MAX_K = 450.0;
    static constexpr double TRAJECTORY_DEVIATION_MAX_KM = 100.0;
    static constexpr double AI_CONFIDENCE_MIN = 0.50;
    static constexpr double COLLISION_DISTANCE_MIN_KM = 10.0;
    
    SafetyMonitor() = default;
    ~SafetyMonitor() = default;
    
    /**
     * @brief Check all safety boundaries
     * @param fuel_percent Current fuel percentage
     * @param comm_blackout_minutes Current comm blackout duration
     * @param hull_temp_k Current hull temperature
     * @param trajectory_deviation_km Deviation from planned trajectory
     * @param ai_confidence Current AI confidence level
     * @param nearest_object_km Distance to nearest object
     * @return Pair of (boundary checks, all_safe flag)
     */
    std::pair<std::vector<SafetyBoundary>, bool> check_all(
        double fuel_percent,
        double comm_blackout_minutes,
        double hull_temp_k,
        double trajectory_deviation_km,
        double ai_confidence,
        double nearest_object_km
    );
    
    /**
     * @brief S-001: Check fuel reserves
     */
    SafetyBoundary check_fuel(double fuel_percent) const;
    
    /**
     * @brief S-002: Check communication blackout
     */
    SafetyBoundary check_comm_blackout(double minutes) const;
    
    /**
     * @brief S-003: Check thermal limits (minimum)
     */
    SafetyBoundary check_thermal_min(double temp_k) const;
    
    /**
     * @brief S-003: Check thermal limits (maximum)
     */
    SafetyBoundary check_thermal_max(double temp_k) const;
    
    /**
     * @brief S-004: Check trajectory deviation
     */
    SafetyBoundary check_trajectory(double deviation_km) const;
    
    /**
     * @brief S-005: Check AI confidence
     */
    SafetyBoundary check_ai_confidence(double confidence) const;
    
    /**
     * @brief S-007: Check collision avoidance
     */
    SafetyBoundary check_collision(double distance_km) const;
    
    /**
     * @brief S-006/S-008: Human override/abort always available
     */
    bool can_abort() const { return true; }
    
    /**
     * @brief Get total violation count
     */
    uint32_t violation_count() const { return violation_count_; }
    
    /**
     * @brief Register callback for safety violations
     */
    using ViolationCallback = std::function<void(const SafetyBoundary&)>;
    void on_violation(ViolationCallback callback) { violation_callback_ = callback; }
    
private:
    uint32_t violation_count_ = 0;
    ViolationCallback violation_callback_;
    
    void notify_violation(const SafetyBoundary& boundary);
};

}  // namespace oas::core
