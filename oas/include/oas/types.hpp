/**
 * @file types.hpp
 * @brief Core type definitions for OAS
 * 
 * These types match shared-contracts/protobuf schemas.
 * Per Article III: Contract Supremacy - types MUST NOT deviate.
 */

#pragma once

#include <Eigen/Core>
#include <Eigen/Geometry>
#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace oas {

// =============================================================================
// Constants
// =============================================================================

constexpr double EARTH_RADIUS_KM = 6371.0;
constexpr double MOON_RADIUS_KM = 1737.4;
constexpr double EARTH_MOON_DISTANCE_KM = 384400.0;
constexpr double EARTH_MU = 398600.4418;  // km³/s²
constexpr double MOON_MU = 4902.8;        // km³/s²
constexpr double C_LIGHT = 299792.458;    // km/s

// =============================================================================
// Vector Types (using Eigen)
// =============================================================================

using Vector3d = Eigen::Vector3d;
using Quaterniond = Eigen::Quaterniond;
using Matrix3d = Eigen::Matrix3d;

// =============================================================================
// Enumerations (match protobuf)
// =============================================================================

/**
 * @brief Mission phase enumeration
 */
enum class MissionPhase : uint8_t {
    PHASE_UNKNOWN = 0,
    PHASE_PRELAUNCH = 1,
    PHASE_ASCENT = 2,
    PHASE_EARTH_ORBIT = 3,
    PHASE_TRANSIT = 4,
    PHASE_LUNAR_ORBIT = 5,
    PHASE_DESCENT = 6,
    PHASE_SURFACE = 7,
    PHASE_RETURN_TRANSIT = 8,
    PHASE_COMPLETE = 9,
};

/**
 * @brief Subsystem health status
 */
enum class HealthStatus : uint8_t {
    HEALTH_UNKNOWN = 0,
    HEALTH_NOMINAL = 1,
    HEALTH_DEGRADED = 2,
    HEALTH_CRITICAL = 3,
    HEALTH_OFFLINE = 4,
};

/**
 * @brief Coordinate reference frame
 */
enum class ReferenceFrame : uint8_t {
    FRAME_HELIOCENTRIC = 0,
    FRAME_EARTH = 1,
    FRAME_LUNAR = 2,
};

/**
 * @brief Alert severity level
 */
enum class AlertSeverity : uint8_t {
    SEVERITY_INFO = 0,
    SEVERITY_WARNING = 1,
    SEVERITY_CRITICAL = 2,
};

// =============================================================================
// Data Structures
// =============================================================================

/**
 * @brief Vehicle kinematic state
 */
struct VehicleKinematics {
    Vector3d position{0, 0, 0};        // km
    Vector3d velocity{0, 0, 0};        // km/s
    Quaterniond orientation{1, 0, 0, 0};
    Vector3d angular_velocity{0, 0, 0}; // rad/s
    ReferenceFrame frame = ReferenceFrame::FRAME_EARTH;
    int64_t timestamp_ms = 0;
};

/**
 * @brief Subsystem health snapshot
 */
struct SubsystemHealth {
    HealthStatus propulsion = HealthStatus::HEALTH_NOMINAL;
    HealthStatus thermal = HealthStatus::HEALTH_NOMINAL;
    HealthStatus power = HealthStatus::HEALTH_NOMINAL;
    HealthStatus navigation = HealthStatus::HEALTH_NOMINAL;
    HealthStatus communication = HealthStatus::HEALTH_NOMINAL;
    
    /**
     * @brief Get overall health (worst of all subsystems)
     */
    HealthStatus overall() const {
        auto worst = static_cast<uint8_t>(HealthStatus::HEALTH_NOMINAL);
        worst = std::max(worst, static_cast<uint8_t>(propulsion));
        worst = std::max(worst, static_cast<uint8_t>(thermal));
        worst = std::max(worst, static_cast<uint8_t>(power));
        worst = std::max(worst, static_cast<uint8_t>(navigation));
        worst = std::max(worst, static_cast<uint8_t>(communication));
        return static_cast<HealthStatus>(worst);
    }
};

/**
 * @brief Vehicle resources state
 */
struct VehicleResources {
    double fuel_kg = 0.0;
    double fuel_capacity_kg = 1200000.0;  // Starship capacity
    double battery_wh = 0.0;
    double battery_capacity_wh = 100000.0;
    double hull_temp_k = 293.0;
    
    double fuel_percent() const {
        return (fuel_capacity_kg > 0) ? (fuel_kg / fuel_capacity_kg * 100.0) : 0.0;
    }
    
    double battery_percent() const {
        return (battery_capacity_wh > 0) ? (battery_wh / battery_capacity_wh * 100.0) : 0.0;
    }
};

/**
 * @brief Safety boundary check result
 */
struct SafetyBoundary {
    std::string name;
    double current_value;
    double limit_value;
    std::string unit;
    bool within_bounds;
    double margin_percent;
};

/**
 * @brief AI decision log entry (per F-003)
 */
struct AIDecision {
    std::string event_id;
    int64_t timestamp_ms;
    std::string ship_id;
    std::string trigger;
    std::string action;
    std::vector<std::string> alternatives;
    double confidence;
    std::string impact;  // NOMINAL, DEGRADED, CRITICAL
};

/**
 * @brief Telemetry packet for transmission
 */
struct TelemetryPacket {
    std::string ship_id;
    int64_t timestamp_ms;
    int64_t mission_elapsed_ms;
    VehicleKinematics kinematics;
    VehicleResources resources;
    SubsystemHealth health;
};

}  // namespace oas
