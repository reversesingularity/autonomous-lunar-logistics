/**
 * @file safety_monitor.cpp
 * @brief Implementation of safety boundary monitoring (S-001 through S-008)
 * 
 * Per Project Constitution Article V:
 * "All safety boundary checks shall be deterministic and verifiable"
 */

#include "oas/core/safety_monitor.hpp"
#include <algorithm>
#include <cmath>
#include <sstream>

namespace oas::core {

SafetyMonitor::SafetyMonitor(const SafetyConfig& config) : config_(config) {}

void SafetyMonitor::update_config(const SafetyConfig& config) {
    config_ = config;
}

SafetyCheckResult SafetyMonitor::check_delta_v_budget(
    double current_delta_v,
    double required_delta_v,
    double margin_factor
) const {
    SafetyCheckResult result;
    result.check_id = "S-001";
    result.check_name = "Delta-V Budget";
    result.timestamp_ms = get_timestamp_ms();
    
    const double required_with_margin = required_delta_v * margin_factor;
    result.passed = current_delta_v >= required_with_margin;
    result.severity = result.passed ? AlertSeverity::INFO : AlertSeverity::CRITICAL;
    
    std::ostringstream oss;
    oss << "Delta-V: " << current_delta_v << " m/s available, "
        << required_with_margin << " m/s required (including "
        << ((margin_factor - 1.0) * 100) << "% margin)";
    result.message = oss.str();
    
    result.measured_value = current_delta_v;
    result.threshold_value = required_with_margin;
    
    return result;
}

SafetyCheckResult SafetyMonitor::check_communication_delay(
    double current_delay_ms,
    double max_delay_ms
) const {
    SafetyCheckResult result;
    result.check_id = "S-002";
    result.check_name = "Communication Delay";
    result.timestamp_ms = get_timestamp_ms();
    
    result.passed = current_delay_ms <= max_delay_ms;
    
    // Graduated severity based on delay
    if (result.passed) {
        result.severity = AlertSeverity::INFO;
    } else if (current_delay_ms <= max_delay_ms * 1.5) {
        result.severity = AlertSeverity::WARNING;
    } else {
        result.severity = AlertSeverity::CRITICAL;
    }
    
    std::ostringstream oss;
    oss << "Communication delay: " << current_delay_ms << " ms (max: " << max_delay_ms << " ms)";
    result.message = oss.str();
    
    result.measured_value = current_delay_ms;
    result.threshold_value = max_delay_ms;
    
    return result;
}

SafetyCheckResult SafetyMonitor::check_fuel_reserves(
    double current_fuel_kg,
    double abort_fuel_kg
) const {
    SafetyCheckResult result;
    result.check_id = "S-003";
    result.check_name = "Fuel Reserves";
    result.timestamp_ms = get_timestamp_ms();
    
    result.passed = current_fuel_kg >= abort_fuel_kg;
    result.severity = result.passed ? AlertSeverity::INFO : AlertSeverity::CRITICAL;
    
    const double fuel_percentage = (current_fuel_kg / abort_fuel_kg) * 100.0;
    
    std::ostringstream oss;
    oss << "Fuel: " << current_fuel_kg << " kg (" << fuel_percentage 
        << "% of abort minimum " << abort_fuel_kg << " kg)";
    result.message = oss.str();
    
    result.measured_value = current_fuel_kg;
    result.threshold_value = abort_fuel_kg;
    
    return result;
}

SafetyCheckResult SafetyMonitor::check_thermal_limits(
    double current_temp_k,
    double min_temp_k,
    double max_temp_k
) const {
    SafetyCheckResult result;
    result.check_id = "S-004";
    result.check_name = "Thermal Limits";
    result.timestamp_ms = get_timestamp_ms();
    
    result.passed = (current_temp_k >= min_temp_k) && (current_temp_k <= max_temp_k);
    
    // Graduated severity based on how far out of range
    if (result.passed) {
        result.severity = AlertSeverity::INFO;
    } else {
        const double deviation = std::max(
            min_temp_k - current_temp_k,
            current_temp_k - max_temp_k
        );
        const double range = max_temp_k - min_temp_k;
        if (deviation < range * 0.1) {
            result.severity = AlertSeverity::WARNING;
        } else {
            result.severity = AlertSeverity::CRITICAL;
        }
    }
    
    std::ostringstream oss;
    oss << "Temperature: " << current_temp_k << " K (range: " 
        << min_temp_k << " - " << max_temp_k << " K)";
    result.message = oss.str();
    
    result.measured_value = current_temp_k;
    result.threshold_value = (min_temp_k + max_temp_k) / 2.0;  // Nominal value
    
    return result;
}

SafetyCheckResult SafetyMonitor::check_radiation_exposure(
    double cumulative_dose_rad,
    double max_dose_rad
) const {
    SafetyCheckResult result;
    result.check_id = "S-005";
    result.check_name = "Radiation Exposure";
    result.timestamp_ms = get_timestamp_ms();
    
    result.passed = cumulative_dose_rad <= max_dose_rad;
    
    const double dose_percentage = (cumulative_dose_rad / max_dose_rad) * 100.0;
    if (dose_percentage <= 80.0) {
        result.severity = AlertSeverity::INFO;
    } else if (dose_percentage <= 100.0) {
        result.severity = AlertSeverity::WARNING;
    } else {
        result.severity = AlertSeverity::CRITICAL;
    }
    
    std::ostringstream oss;
    oss << "Radiation: " << cumulative_dose_rad << " rad cumulative ("
        << dose_percentage << "% of " << max_dose_rad << " rad limit)";
    result.message = oss.str();
    
    result.measured_value = cumulative_dose_rad;
    result.threshold_value = max_dose_rad;
    
    return result;
}

SafetyCheckResult SafetyMonitor::check_trajectory_corridor(
    const Vector3D& position,
    const Vector3D& expected_position,
    double max_deviation_km
) const {
    SafetyCheckResult result;
    result.check_id = "S-006";
    result.check_name = "Trajectory Corridor";
    result.timestamp_ms = get_timestamp_ms();
    
    // Calculate 3D Euclidean distance
    const double dx = position.x - expected_position.x;
    const double dy = position.y - expected_position.y;
    const double dz = position.z - expected_position.z;
    const double deviation_km = std::sqrt(dx*dx + dy*dy + dz*dz);
    
    result.passed = deviation_km <= max_deviation_km;
    
    if (deviation_km <= max_deviation_km * 0.5) {
        result.severity = AlertSeverity::INFO;
    } else if (deviation_km <= max_deviation_km) {
        result.severity = AlertSeverity::WARNING;
    } else {
        result.severity = AlertSeverity::CRITICAL;
    }
    
    std::ostringstream oss;
    oss << "Trajectory deviation: " << deviation_km << " km (corridor: " 
        << max_deviation_km << " km)";
    result.message = oss.str();
    
    result.measured_value = deviation_km;
    result.threshold_value = max_deviation_km;
    
    return result;
}

SafetyCheckResult SafetyMonitor::check_abort_window(
    int64_t current_time_ms,
    int64_t abort_deadline_ms
) const {
    SafetyCheckResult result;
    result.check_id = "S-007";
    result.check_name = "Abort Window";
    result.timestamp_ms = get_timestamp_ms();
    
    const int64_t time_remaining_ms = abort_deadline_ms - current_time_ms;
    const double time_remaining_min = time_remaining_ms / 60000.0;
    
    result.passed = time_remaining_ms > 0;
    
    if (time_remaining_min > 30.0) {
        result.severity = AlertSeverity::INFO;
    } else if (time_remaining_min > 10.0) {
        result.severity = AlertSeverity::WARNING;
    } else if (time_remaining_min > 0.0) {
        result.severity = AlertSeverity::CRITICAL;
    } else {
        result.severity = AlertSeverity::CRITICAL;
    }
    
    std::ostringstream oss;
    if (time_remaining_ms > 0) {
        oss << "Abort window: " << time_remaining_min << " minutes remaining";
    } else {
        oss << "Abort window EXPIRED " << (-time_remaining_min) << " minutes ago";
    }
    result.message = oss.str();
    
    result.measured_value = static_cast<double>(time_remaining_ms);
    result.threshold_value = 0.0;
    
    return result;
}

SafetyCheckResult SafetyMonitor::check_subsystem_health(
    const SubsystemHealth& health
) const {
    SafetyCheckResult result;
    result.check_id = "S-008";
    result.check_name = "Subsystem Health";
    result.timestamp_ms = get_timestamp_ms();
    
    // Count subsystem statuses
    int critical_count = 0;
    int degraded_count = 0;
    
    auto count_status = [&](HealthStatus status) {
        if (status == HealthStatus::HEALTH_CRITICAL || 
            status == HealthStatus::HEALTH_FAILED) {
            critical_count++;
        } else if (status == HealthStatus::HEALTH_DEGRADED) {
            degraded_count++;
        }
    };
    
    count_status(health.propulsion);
    count_status(health.navigation);
    count_status(health.communication);
    count_status(health.power);
    count_status(health.thermal);
    count_status(health.life_support);
    
    result.passed = (critical_count == 0);
    
    if (critical_count > 0) {
        result.severity = AlertSeverity::CRITICAL;
    } else if (degraded_count > 0) {
        result.severity = AlertSeverity::WARNING;
    } else {
        result.severity = AlertSeverity::INFO;
    }
    
    std::ostringstream oss;
    oss << "Subsystems: " << critical_count << " critical, " 
        << degraded_count << " degraded";
    result.message = oss.str();
    
    result.measured_value = static_cast<double>(critical_count);
    result.threshold_value = 0.0;
    
    return result;
}

std::vector<SafetyCheckResult> SafetyMonitor::run_all_checks(
    const VehicleState& state
) const {
    std::vector<SafetyCheckResult> results;
    results.reserve(8);
    
    const auto& resources = state.resources();
    const auto& kinematics = state.kinematics();
    const auto& health = state.health();
    
    // S-001: Delta-V Budget
    results.push_back(check_delta_v_budget(
        resources.delta_v_remaining,
        config_.min_delta_v_margin,
        1.1  // 10% margin
    ));
    
    // S-002: Communication Delay (estimate based on distance from Earth)
    // Light speed: ~3e8 m/s, so round trip at 384,400 km = ~2.56 seconds one-way
    const double distance_from_earth_km = std::sqrt(
        kinematics.position.x * kinematics.position.x +
        kinematics.position.y * kinematics.position.y +
        kinematics.position.z * kinematics.position.z
    );
    const double one_way_delay_ms = (distance_from_earth_km * 1000.0) / 299792.458;
    results.push_back(check_communication_delay(
        one_way_delay_ms,
        config_.max_comm_delay_ms
    ));
    
    // S-003: Fuel Reserves
    results.push_back(check_fuel_reserves(
        resources.propellant_kg,
        config_.abort_fuel_reserve_kg
    ));
    
    // S-004: Thermal Limits (using primary battery temp as proxy)
    results.push_back(check_thermal_limits(
        resources.battery_temp_k,
        config_.min_temp_k,
        config_.max_temp_k
    ));
    
    // S-005: Radiation Exposure (would need cumulative tracking in real system)
    results.push_back(check_radiation_exposure(0.0, config_.max_radiation_rad));
    
    // S-006: Trajectory Corridor (simplified - would need planned trajectory)
    Vector3D expected_pos = kinematics.position;  // Placeholder
    results.push_back(check_trajectory_corridor(
        kinematics.position,
        expected_pos,
        config_.trajectory_corridor_km
    ));
    
    // S-007: Abort Window (would need mission timeline in real system)
    int64_t abort_deadline = kinematics.timestamp_ms + 1800000;  // 30 min from now placeholder
    results.push_back(check_abort_window(kinematics.timestamp_ms, abort_deadline));
    
    // S-008: Subsystem Health
    results.push_back(check_subsystem_health(health));
    
    return results;
}

bool SafetyMonitor::all_checks_pass(const VehicleState& state) const {
    const auto results = run_all_checks(state);
    return std::all_of(results.begin(), results.end(),
        [](const SafetyCheckResult& r) { return r.passed; });
}

bool SafetyMonitor::any_critical(const VehicleState& state) const {
    const auto results = run_all_checks(state);
    return std::any_of(results.begin(), results.end(),
        [](const SafetyCheckResult& r) { 
            return r.severity == AlertSeverity::CRITICAL && !r.passed; 
        });
}

int64_t SafetyMonitor::get_timestamp_ms() const {
    auto now = std::chrono::system_clock::now();
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();
}

}  // namespace oas::core
