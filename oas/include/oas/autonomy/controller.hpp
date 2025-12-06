/**
 * @file autonomy_controller.hpp
 * @brief Main autonomy controller for spacecraft operations
 * 
 * Per Project Constitution Article II:
 * "AI decision-making authority is bounded by explicit operational envelopes"
 * 
 * Per Article III:
 * "No AI shall alter a planned trajectory without explicit human authorization"
 */

#pragma once

#include "oas/types.hpp"
#include "oas/core/vehicle_state.hpp"
#include "oas/core/safety_monitor.hpp"
#include "oas/navigation/trajectory_planner.hpp"
#include <functional>
#include <memory>
#include <queue>
#include <mutex>
#include <optional>

namespace oas::autonomy {

/**
 * @brief Autonomy levels per Project Constitution Article II
 */
enum class AutonomyLevel {
    LEVEL_0_MANUAL,          // Full human control, AI advisory only
    LEVEL_1_ASSISTED,        // AI provides recommendations, human approves
    LEVEL_2_SUPERVISED,      // AI executes routine tasks, human monitors
    LEVEL_3_CONDITIONAL,     // AI operates within narrow bounds autonomously
    LEVEL_4_HIGH,            // AI handles most situations, human backup
    LEVEL_5_FULL             // NEVER USED - Per Constitution Article VI
};

/**
 * @brief Command types the controller can process
 */
enum class CommandType {
    CMD_EXECUTE_MANEUVER,     // Execute approved maneuver
    CMD_ABORT_MANEUVER,       // Abort current maneuver
    CMD_CHANGE_AUTONOMY,      // Change autonomy level
    CMD_UPDATE_TRAJECTORY,    // Update trajectory plan (requires approval)
    CMD_SAFE_MODE,            // Enter safe mode
    CMD_DIAGNOSTIC,           // Run diagnostics
    CMD_TELEMETRY_REQUEST     // Request telemetry snapshot
};

/**
 * @brief Command structure for controller input
 */
struct ControlCommand {
    std::string command_id;
    CommandType type;
    int64_t timestamp_ms{0};
    std::string payload;           // JSON-encoded parameters
    bool requires_human_auth{true};
    bool is_authorized{false};
    std::string authorization_code;
};

/**
 * @brief Decision made by the autonomy system
 */
struct AutonomyDecision {
    std::string decision_id;
    int64_t timestamp_ms{0};
    std::string action_type;
    std::string description;
    double confidence{0.0};           // AI confidence in decision
    bool requires_human_approval{true};
    bool was_executed{false};
    std::vector<std::string> reasoning;  // Explainability per Constitution Art. IV
    std::string affected_system;
};

/**
 * @brief Callback for human-in-the-loop notifications
 */
using HumanNotificationCallback = std::function<void(
    const std::string& notification_type,
    const std::string& message,
    AlertSeverity severity
)>;

/**
 * @brief Callback for telemetry broadcast
 */
using TelemetryCallback = std::function<void(const TelemetryPacket& packet)>;

/**
 * @brief Main autonomy controller for spacecraft operations
 * 
 * Implements bounded autonomy per Project Constitution:
 * - Article II: Explicit operational envelopes
 * - Article III: Human authorization for trajectory changes
 * - Article IV: Explainable decisions
 * - Article VI: Human override capability
 */
class AutonomyController {
public:
    /**
     * @brief Construct controller with initial configuration
     * @param ship_id Spacecraft identifier
     * @param initial_level Initial autonomy level (default: LEVEL_1_ASSISTED)
     */
    explicit AutonomyController(
        const std::string& ship_id,
        AutonomyLevel initial_level = AutonomyLevel::LEVEL_1_ASSISTED
    );
    
    /**
     * @brief Initialize controller subsystems
     * @return true if initialization successful
     */
    bool initialize();
    
    /**
     * @brief Main update loop - call at regular intervals
     * @param delta_time_ms Time since last update
     */
    void update(int64_t delta_time_ms);
    
    // ========== State Management ==========
    
    /**
     * @brief Get current vehicle state
     */
    const core::VehicleState& vehicle_state() const { return vehicle_state_; }
    
    /**
     * @brief Update vehicle state from sensor data
     */
    void update_vehicle_state(const VehicleKinematics& kinematics, int64_t timestamp_ms);
    void update_vehicle_resources(const VehicleResources& resources);
    void update_vehicle_health(const SubsystemHealth& health);
    
    // ========== Autonomy Control ==========
    
    /**
     * @brief Get current autonomy level
     */
    AutonomyLevel autonomy_level() const { return autonomy_level_; }
    
    /**
     * @brief Request autonomy level change (requires human approval)
     * @param level Requested level
     * @return true if request queued, false if denied
     */
    bool request_autonomy_change(AutonomyLevel level);
    
    /**
     * @brief Human override - immediately reduce autonomy
     * Per Constitution Article VI: "Human override shall always be possible"
     */
    void human_override(AutonomyLevel target_level = AutonomyLevel::LEVEL_0_MANUAL);
    
    // ========== Command Processing ==========
    
    /**
     * @brief Queue a command for processing
     * @param command Command to queue
     * @return true if command accepted
     */
    bool queue_command(const ControlCommand& command);
    
    /**
     * @brief Process next command in queue
     * @return Processed command result, or nullopt if queue empty
     */
    std::optional<AutonomyDecision> process_next_command();
    
    /**
     * @brief Get pending command count
     */
    size_t pending_commands() const;
    
    // ========== Safety Integration ==========
    
    /**
     * @brief Run safety checks and return results
     */
    std::vector<core::SafetyCheckResult> run_safety_checks() const;
    
    /**
     * @brief Check if system is in safe state
     */
    bool is_safe() const;
    
    /**
     * @brief Enter safe mode - minimal operations
     */
    void enter_safe_mode();
    
    /**
     * @brief Exit safe mode (requires human authorization)
     */
    bool exit_safe_mode(const std::string& authorization_code);
    
    // ========== Trajectory Management ==========
    
    /**
     * @brief Set active trajectory plan (requires human approval)
     */
    bool set_trajectory_plan(const navigation::TrajectoryPlan& plan);
    
    /**
     * @brief Get active trajectory plan
     */
    std::optional<navigation::TrajectoryPlan> active_trajectory() const;
    
    /**
     * @brief Check if on trajectory corridor
     */
    bool is_on_trajectory() const;
    
    /**
     * @brief Get suggested correction (if off trajectory)
     * Per Constitution Article III: Returns suggestion, does NOT execute
     */
    std::optional<navigation::Maneuver> suggest_correction() const;
    
    // ========== Callbacks ==========
    
    /**
     * @brief Set callback for human notifications
     */
    void set_notification_callback(HumanNotificationCallback callback);
    
    /**
     * @brief Set callback for telemetry broadcast
     */
    void set_telemetry_callback(TelemetryCallback callback);
    
    // ========== Decision History ==========
    
    /**
     * @brief Get recent decisions for audit/explainability
     * Per Constitution Article IV: All decisions must be explainable
     */
    std::vector<AutonomyDecision> recent_decisions(size_t count = 10) const;
    
    /**
     * @brief Get decision by ID
     */
    std::optional<AutonomyDecision> get_decision(const std::string& decision_id) const;

private:
    // Ship identification
    std::string ship_id_;
    
    // Core components
    core::VehicleState vehicle_state_;
    core::SafetyMonitor safety_monitor_;
    navigation::TrajectoryPlanner trajectory_planner_;
    
    // Autonomy state
    AutonomyLevel autonomy_level_;
    bool is_in_safe_mode_{false};
    bool is_initialized_{false};
    
    // Active trajectory
    std::optional<navigation::TrajectoryPlan> active_trajectory_;
    navigation::TrajectoryCorridor trajectory_corridor_;
    
    // Command queue (thread-safe)
    mutable std::mutex command_mutex_;
    std::queue<ControlCommand> command_queue_;
    
    // Decision history (for explainability)
    mutable std::mutex decision_mutex_;
    std::vector<AutonomyDecision> decision_history_;
    static constexpr size_t MAX_DECISION_HISTORY = 1000;
    
    // Callbacks
    HumanNotificationCallback notification_callback_;
    TelemetryCallback telemetry_callback_;
    
    // Internal methods
    void notify_human(const std::string& type, const std::string& message, AlertSeverity severity);
    void broadcast_telemetry();
    AutonomyDecision make_decision(const std::string& action, const std::string& description,
                                   double confidence, const std::vector<std::string>& reasoning);
    void record_decision(const AutonomyDecision& decision);
    bool validate_authorization(const ControlCommand& command);
    bool can_execute_autonomously(CommandType type) const;
    int64_t get_timestamp_ms() const;
    std::string generate_decision_id() const;
};

// ========== Implementation ==========

inline AutonomyController::AutonomyController(
    const std::string& ship_id,
    AutonomyLevel initial_level
)   : ship_id_(ship_id)
    , vehicle_state_(ship_id, "Spacecraft-" + ship_id)
    , autonomy_level_(initial_level) {
    
    // Per Constitution Article VI: Never allow full autonomy
    if (autonomy_level_ == AutonomyLevel::LEVEL_5_FULL) {
        autonomy_level_ = AutonomyLevel::LEVEL_4_HIGH;
    }
}

inline bool AutonomyController::initialize() {
    // Configure safety monitor with default config
    core::SafetyConfig safety_config;
    safety_monitor_.update_config(safety_config);
    
    // Initialize vehicle state
    vehicle_state_.set_phase(MissionPhase::PHASE_PRELAUNCH);
    
    is_initialized_ = true;
    
    auto decision = make_decision(
        "INITIALIZE",
        "Autonomy controller initialized at level " + std::to_string(static_cast<int>(autonomy_level_)),
        1.0,
        {"System startup sequence complete", "Safety monitor configured", "Vehicle state initialized"}
    );
    decision.requires_human_approval = false;
    decision.was_executed = true;
    record_decision(decision);
    
    return true;
}

inline void AutonomyController::update(int64_t delta_time_ms) {
    if (!is_initialized_) return;
    
    // Run safety checks
    auto safety_results = run_safety_checks();
    
    // Check for critical safety issues
    for (const auto& result : safety_results) {
        if (!result.passed && result.severity == AlertSeverity::CRITICAL) {
            if (!is_in_safe_mode_) {
                notify_human("SAFETY_CRITICAL", result.message, AlertSeverity::CRITICAL);
                // Auto-enter safe mode on critical safety failure
                enter_safe_mode();
            }
        }
    }
    
    // Broadcast telemetry
    broadcast_telemetry();
}

inline void AutonomyController::update_vehicle_state(
    const VehicleKinematics& kinematics, 
    int64_t timestamp_ms
) {
    vehicle_state_.update_kinematics(kinematics, timestamp_ms);
}

inline void AutonomyController::update_vehicle_resources(const VehicleResources& resources) {
    vehicle_state_.update_resources(resources);
}

inline void AutonomyController::update_vehicle_health(const SubsystemHealth& health) {
    vehicle_state_.update_health(health);
}

inline bool AutonomyController::request_autonomy_change(AutonomyLevel level) {
    // Per Constitution Article VI: Never allow LEVEL_5_FULL
    if (level == AutonomyLevel::LEVEL_5_FULL) {
        notify_human("AUTONOMY_DENIED", 
            "Full autonomy (Level 5) is prohibited per Project Constitution Article VI",
            AlertSeverity::WARNING);
        return false;
    }
    
    // Increasing autonomy always requires human approval
    if (level > autonomy_level_) {
        notify_human("AUTONOMY_REQUEST",
            "Request to increase autonomy from Level " + std::to_string(static_cast<int>(autonomy_level_)) +
            " to Level " + std::to_string(static_cast<int>(level)),
            AlertSeverity::INFO);
        return true;  // Request queued, awaiting approval
    }
    
    // Decreasing autonomy can be done immediately
    autonomy_level_ = level;
    
    auto decision = make_decision(
        "AUTONOMY_CHANGE",
        "Autonomy level reduced to " + std::to_string(static_cast<int>(level)),
        1.0,
        {"Human-initiated autonomy reduction", "No approval required for decrease"}
    );
    decision.requires_human_approval = false;
    decision.was_executed = true;
    record_decision(decision);
    
    return true;
}

inline void AutonomyController::human_override(AutonomyLevel target_level) {
    // Per Constitution Article VI: Human override is ALWAYS possible
    autonomy_level_ = target_level;
    
    auto decision = make_decision(
        "HUMAN_OVERRIDE",
        "Human override activated - autonomy set to Level " + std::to_string(static_cast<int>(target_level)),
        1.0,
        {"Emergency human override", "Per Constitution Article VI", "Immediate effect"}
    );
    decision.requires_human_approval = false;
    decision.was_executed = true;
    record_decision(decision);
    
    notify_human("OVERRIDE_ACTIVATED", decision.description, AlertSeverity::WARNING);
}

inline bool AutonomyController::queue_command(const ControlCommand& command) {
    std::lock_guard<std::mutex> lock(command_mutex_);
    command_queue_.push(command);
    return true;
}

inline std::optional<AutonomyDecision> AutonomyController::process_next_command() {
    ControlCommand command;
    {
        std::lock_guard<std::mutex> lock(command_mutex_);
        if (command_queue_.empty()) return std::nullopt;
        command = command_queue_.front();
        command_queue_.pop();
    }
    
    // Check if command requires human authorization
    if (command.requires_human_auth && !command.is_authorized) {
        if (!can_execute_autonomously(command.type)) {
            auto decision = make_decision(
                "COMMAND_PENDING",
                "Command " + command.command_id + " requires human authorization",
                0.0,
                {"Authorization required per Constitution Article III"}
            );
            record_decision(decision);
            return decision;
        }
    }
    
    // Process command based on type
    AutonomyDecision decision;
    switch (command.type) {
        case CommandType::CMD_SAFE_MODE:
            enter_safe_mode();
            decision = make_decision("SAFE_MODE", "Entered safe mode", 1.0, 
                {"Safe mode command received", "All non-essential operations suspended"});
            decision.was_executed = true;
            break;
            
        case CommandType::CMD_DIAGNOSTIC:
            decision = make_decision("DIAGNOSTIC", "Running system diagnostics", 1.0,
                {"Diagnostic sequence initiated"});
            decision.was_executed = true;
            break;
            
        case CommandType::CMD_TELEMETRY_REQUEST:
            broadcast_telemetry();
            decision = make_decision("TELEMETRY", "Telemetry snapshot transmitted", 1.0,
                {"Telemetry request fulfilled"});
            decision.was_executed = true;
            break;
            
        default:
            decision = make_decision("UNKNOWN", "Unknown command type", 0.0,
                {"Command type not recognized"});
            break;
    }
    
    decision.requires_human_approval = command.requires_human_auth;
    record_decision(decision);
    return decision;
}

inline size_t AutonomyController::pending_commands() const {
    std::lock_guard<std::mutex> lock(command_mutex_);
    return command_queue_.size();
}

inline std::vector<core::SafetyCheckResult> AutonomyController::run_safety_checks() const {
    return safety_monitor_.run_all_checks(vehicle_state_);
}

inline bool AutonomyController::is_safe() const {
    return safety_monitor_.all_checks_pass(vehicle_state_);
}

inline void AutonomyController::enter_safe_mode() {
    is_in_safe_mode_ = true;
    autonomy_level_ = AutonomyLevel::LEVEL_0_MANUAL;
    
    notify_human("SAFE_MODE_ENTERED", 
        "Spacecraft has entered safe mode - manual control required",
        AlertSeverity::CRITICAL);
}

inline bool AutonomyController::exit_safe_mode(const std::string& authorization_code) {
    // Validate authorization (simplified - real system would verify cryptographically)
    if (authorization_code.empty()) {
        notify_human("AUTH_FAILED", "Safe mode exit requires authorization code", AlertSeverity::WARNING);
        return false;
    }
    
    is_in_safe_mode_ = false;
    
    auto decision = make_decision(
        "SAFE_MODE_EXIT",
        "Exited safe mode with authorization",
        1.0,
        {"Authorization validated", "Normal operations resuming"}
    );
    decision.requires_human_approval = true;
    decision.was_executed = true;
    record_decision(decision);
    
    notify_human("SAFE_MODE_EXITED", "Spacecraft has exited safe mode", AlertSeverity::INFO);
    return true;
}

inline bool AutonomyController::set_trajectory_plan(const navigation::TrajectoryPlan& plan) {
    // Per Constitution Article III: Trajectory changes require human approval
    if (!plan.is_human_approved) {
        notify_human("TRAJECTORY_PENDING",
            "Trajectory plan " + plan.plan_id + " requires human approval",
            AlertSeverity::INFO);
        return false;
    }
    
    active_trajectory_ = plan;
    trajectory_corridor_ = trajectory_planner_.generate_corridor(plan);
    
    auto decision = make_decision(
        "TRAJECTORY_SET",
        "Trajectory plan " + plan.plan_id + " activated",
        1.0,
        {"Plan approved by human operator", "Trajectory corridor generated", 
         "Total delta-v: " + std::to_string(plan.total_delta_v) + " km/s"}
    );
    decision.requires_human_approval = true;
    decision.was_executed = true;
    record_decision(decision);
    
    return true;
}

inline std::optional<navigation::TrajectoryPlan> AutonomyController::active_trajectory() const {
    return active_trajectory_;
}

inline bool AutonomyController::is_on_trajectory() const {
    if (!active_trajectory_) return true;  // No trajectory = no deviation
    
    const auto& kinematics = vehicle_state_.kinematics();
    return trajectory_corridor_.is_within_bounds(kinematics.position, kinematics.timestamp_ms);
}

inline std::optional<navigation::Maneuver> AutonomyController::suggest_correction() const {
    if (!active_trajectory_ || is_on_trajectory()) return std::nullopt;
    
    // Find next waypoint
    const auto& kinematics = vehicle_state_.kinematics();
    for (const auto& wp : trajectory_corridor_.nominal_path) {
        if (wp.timestamp_ms > kinematics.timestamp_ms) {
            return trajectory_planner_.calculate_correction(
                kinematics.position,
                kinematics.velocity,
                wp,
                kinematics.timestamp_ms
            );
        }
    }
    
    return std::nullopt;
}

inline void AutonomyController::set_notification_callback(HumanNotificationCallback callback) {
    notification_callback_ = std::move(callback);
}

inline void AutonomyController::set_telemetry_callback(TelemetryCallback callback) {
    telemetry_callback_ = std::move(callback);
}

inline std::vector<AutonomyDecision> AutonomyController::recent_decisions(size_t count) const {
    std::lock_guard<std::mutex> lock(decision_mutex_);
    
    if (decision_history_.empty()) return {};
    
    size_t start = decision_history_.size() > count ? decision_history_.size() - count : 0;
    return std::vector<AutonomyDecision>(
        decision_history_.begin() + start,
        decision_history_.end()
    );
}

inline std::optional<AutonomyDecision> AutonomyController::get_decision(
    const std::string& decision_id
) const {
    std::lock_guard<std::mutex> lock(decision_mutex_);
    
    for (const auto& decision : decision_history_) {
        if (decision.decision_id == decision_id) {
            return decision;
        }
    }
    return std::nullopt;
}

inline void AutonomyController::notify_human(
    const std::string& type, 
    const std::string& message, 
    AlertSeverity severity
) {
    if (notification_callback_) {
        notification_callback_(type, message, severity);
    }
}

inline void AutonomyController::broadcast_telemetry() {
    if (telemetry_callback_) {
        telemetry_callback_(vehicle_state_.to_telemetry());
    }
}

inline AutonomyDecision AutonomyController::make_decision(
    const std::string& action,
    const std::string& description,
    double confidence,
    const std::vector<std::string>& reasoning
) {
    AutonomyDecision decision;
    decision.decision_id = generate_decision_id();
    decision.timestamp_ms = get_timestamp_ms();
    decision.action_type = action;
    decision.description = description;
    decision.confidence = confidence;
    decision.reasoning = reasoning;
    decision.requires_human_approval = true;  // Default to requiring approval
    decision.was_executed = false;
    return decision;
}

inline void AutonomyController::record_decision(const AutonomyDecision& decision) {
    std::lock_guard<std::mutex> lock(decision_mutex_);
    decision_history_.push_back(decision);
    
    // Trim history if too large
    if (decision_history_.size() > MAX_DECISION_HISTORY) {
        decision_history_.erase(decision_history_.begin());
    }
}

inline bool AutonomyController::validate_authorization(const ControlCommand& command) {
    // Simplified validation - real system would use cryptographic verification
    return !command.authorization_code.empty();
}

inline bool AutonomyController::can_execute_autonomously(CommandType type) const {
    // Per Constitution Article II: AI authority bounded by operational envelopes
    switch (autonomy_level_) {
        case AutonomyLevel::LEVEL_0_MANUAL:
            return false;  // All commands require human
            
        case AutonomyLevel::LEVEL_1_ASSISTED:
            return type == CommandType::CMD_TELEMETRY_REQUEST ||
                   type == CommandType::CMD_DIAGNOSTIC;
                   
        case AutonomyLevel::LEVEL_2_SUPERVISED:
            return type != CommandType::CMD_EXECUTE_MANEUVER &&
                   type != CommandType::CMD_UPDATE_TRAJECTORY;
                   
        case AutonomyLevel::LEVEL_3_CONDITIONAL:
        case AutonomyLevel::LEVEL_4_HIGH:
            // Still require human for trajectory changes per Article III
            return type != CommandType::CMD_UPDATE_TRAJECTORY;
            
        case AutonomyLevel::LEVEL_5_FULL:
            return false;  // This level is prohibited
            
        default:
            return false;
    }
}

inline int64_t AutonomyController::get_timestamp_ms() const {
    auto now = std::chrono::system_clock::now();
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();
}

inline std::string AutonomyController::generate_decision_id() const {
    return "DEC-" + ship_id_ + "-" + std::to_string(get_timestamp_ms());
}

}  // namespace oas::autonomy
