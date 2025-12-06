/**
 * @file vehicle_state.cpp
 * @brief Implementation of vehicle state management
 */

#include "oas/core/vehicle_state.hpp"
#include <chrono>

namespace oas::core {

VehicleState::VehicleState(std::string ship_id, std::string ship_name)
    : ship_id_(std::move(ship_id))
    , ship_name_(std::move(ship_name)) {
    
    // Set mission start time
    auto now = std::chrono::system_clock::now();
    mission_start_ms_ = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();
    last_update_ms_ = mission_start_ms_;
}

void VehicleState::set_phase(MissionPhase phase) {
    phase_ = phase;
    
    // Update objective based on phase
    switch (phase) {
        case MissionPhase::PHASE_PRELAUNCH:
            current_objective_ = "Pre-launch checks in progress";
            break;
        case MissionPhase::PHASE_ASCENT:
            current_objective_ = "Ascent profile nominal";
            break;
        case MissionPhase::PHASE_EARTH_ORBIT:
            current_objective_ = "Parking orbit established";
            break;
        case MissionPhase::PHASE_TRANSIT:
            current_objective_ = "Trans-lunar injection complete";
            break;
        case MissionPhase::PHASE_LUNAR_ORBIT:
            current_objective_ = "Lunar orbit insertion complete";
            break;
        case MissionPhase::PHASE_DESCENT:
            current_objective_ = "Powered descent initiated";
            break;
        case MissionPhase::PHASE_SURFACE:
            current_objective_ = "Surface operations nominal";
            break;
        case MissionPhase::PHASE_RETURN_TRANSIT:
            current_objective_ = "Return transit initiated";
            break;
        case MissionPhase::PHASE_COMPLETE:
            current_objective_ = "Mission complete";
            break;
        default:
            current_objective_ = "Status unknown";
            break;
    }
}

void VehicleState::update_kinematics(const VehicleKinematics& kinematics, int64_t timestamp_ms) {
    kinematics_ = kinematics;
    kinematics_.timestamp_ms = timestamp_ms;
    last_update_ms_ = timestamp_ms;
}

void VehicleState::update_resources(const VehicleResources& resources) {
    resources_ = resources;
}

void VehicleState::update_health(const SubsystemHealth& health) {
    health_ = health;
}

void VehicleState::set_ai_confidence(double confidence) {
    ai_confidence_ = std::clamp(confidence, 0.0, 1.0);
}

void VehicleState::set_objective(const std::string& objective) {
    current_objective_ = objective;
}

TelemetryPacket VehicleState::to_telemetry() const {
    TelemetryPacket packet;
    packet.ship_id = ship_id_;
    packet.timestamp_ms = last_update_ms_;
    packet.mission_elapsed_ms = last_update_ms_ - mission_start_ms_;
    packet.kinematics = kinematics_;
    packet.resources = resources_;
    packet.health = health_;
    return packet;
}

}  // namespace oas::core
