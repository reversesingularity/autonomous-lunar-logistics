/**
 * @file vehicle_state.hpp
 * @brief Vehicle state management for OAS
 * 
 * Manages complete state of a spacecraft including:
 * - Kinematic state (position, velocity, orientation)
 * - Resource state (fuel, power, thermal)
 * - Health status across all subsystems
 */

#pragma once

#include "oas/types.hpp"
#include <memory>
#include <string>
#include <optional>

namespace oas::core {

/**
 * @brief Complete vehicle state container
 * 
 * Maintains authoritative state for onboard autonomy decisions.
 * State updates are atomic and timestamped.
 */
class VehicleState {
public:
    /**
     * @brief Construct vehicle state with ID
     * @param ship_id Unique spacecraft identifier
     * @param ship_name Human-readable name
     */
    VehicleState(std::string ship_id, std::string ship_name);
    
    ~VehicleState() = default;
    
    // Non-copyable, movable
    VehicleState(const VehicleState&) = delete;
    VehicleState& operator=(const VehicleState&) = delete;
    VehicleState(VehicleState&&) = default;
    VehicleState& operator=(VehicleState&&) = default;
    
    // ==========================================================================
    // Accessors
    // ==========================================================================
    
    const std::string& ship_id() const { return ship_id_; }
    const std::string& ship_name() const { return ship_name_; }
    
    MissionPhase phase() const { return phase_; }
    const VehicleKinematics& kinematics() const { return kinematics_; }
    const VehicleResources& resources() const { return resources_; }
    const SubsystemHealth& health() const { return health_; }
    
    double ai_confidence() const { return ai_confidence_; }
    const std::string& current_objective() const { return current_objective_; }
    
    int64_t last_update_ms() const { return last_update_ms_; }
    int64_t mission_start_ms() const { return mission_start_ms_; }
    
    // ==========================================================================
    // Mutators
    // ==========================================================================
    
    /**
     * @brief Set mission phase
     */
    void set_phase(MissionPhase phase);
    
    /**
     * @brief Update kinematic state
     * @param kinematics New kinematic state
     * @param timestamp_ms Update timestamp
     */
    void update_kinematics(const VehicleKinematics& kinematics, int64_t timestamp_ms);
    
    /**
     * @brief Update resources
     */
    void update_resources(const VehicleResources& resources);
    
    /**
     * @brief Update subsystem health
     */
    void update_health(const SubsystemHealth& health);
    
    /**
     * @brief Update AI confidence level
     */
    void set_ai_confidence(double confidence);
    
    /**
     * @brief Set current mission objective
     */
    void set_objective(const std::string& objective);
    
    // ==========================================================================
    // Telemetry
    // ==========================================================================
    
    /**
     * @brief Generate telemetry packet from current state
     */
    TelemetryPacket to_telemetry() const;
    
    /**
     * @brief Get overall health status
     */
    HealthStatus overall_health() const { return health_.overall(); }
    
private:
    std::string ship_id_;
    std::string ship_name_;
    
    MissionPhase phase_ = MissionPhase::PHASE_UNKNOWN;
    VehicleKinematics kinematics_;
    VehicleResources resources_;
    SubsystemHealth health_;
    
    double ai_confidence_ = 0.95;
    std::string current_objective_ = "Awaiting mission assignment";
    
    int64_t last_update_ms_ = 0;
    int64_t mission_start_ms_ = 0;
};

}  // namespace oas::core
