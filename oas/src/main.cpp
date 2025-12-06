/**
 * @file main.cpp
 * @brief OAS (Onboard Autonomy System) main entry point
 * 
 * Autonomous Lunar Logistics - Onboard Autonomy System
 * Per Project Constitution: Bounded autonomy with human oversight
 */

#include "oas/autonomy/controller.hpp"
#include <iostream>
#include <thread>
#include <chrono>
#include <csignal>
#include <atomic>

namespace {
    std::atomic<bool> running{true};
    
    void signal_handler(int signal) {
        std::cout << "\nReceived signal " << signal << ", shutting down..." << std::endl;
        running = false;
    }
}

int main(int argc, char* argv[]) {
    std::cout << "========================================" << std::endl;
    std::cout << "  Onboard Autonomy System (OAS) v0.1.0" << std::endl;
    std::cout << "  Autonomous Lunar Logistics" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << std::endl;
    std::cout << "Per Project Constitution Article VI:" << std::endl;
    std::cout << "  Human override shall ALWAYS be possible" << std::endl;
    std::cout << std::endl;
    
    // Set up signal handling
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
    // Parse command line arguments
    std::string ship_id = "SHIP-001";
    if (argc > 1) {
        ship_id = argv[1];
    }
    
    std::cout << "Initializing autonomy controller for: " << ship_id << std::endl;
    
    // Create autonomy controller at Level 1 (Assisted)
    oas::autonomy::AutonomyController controller(
        ship_id,
        oas::autonomy::AutonomyLevel::LEVEL_1_ASSISTED
    );
    
    // Set up notification callback
    controller.set_notification_callback([](
        const std::string& type,
        const std::string& message,
        oas::AlertSeverity severity
    ) {
        std::string severity_str;
        switch (severity) {
            case oas::AlertSeverity::INFO: severity_str = "INFO"; break;
            case oas::AlertSeverity::WARNING: severity_str = "WARN"; break;
            case oas::AlertSeverity::CRITICAL: severity_str = "CRIT"; break;
            case oas::AlertSeverity::EMERGENCY: severity_str = "EMRG"; break;
            default: severity_str = "????"; break;
        }
        
        std::cout << "[" << severity_str << "] " << type << ": " << message << std::endl;
    });
    
    // Set up telemetry callback
    controller.set_telemetry_callback([](const oas::TelemetryPacket& packet) {
        std::cout << "[TELEM] Ship: " << packet.ship_id 
                  << " | Pos: (" << packet.kinematics.position.x 
                  << ", " << packet.kinematics.position.y 
                  << ", " << packet.kinematics.position.z << ") km"
                  << " | Fuel: " << packet.resources.propellant_kg << " kg"
                  << std::endl;
    });
    
    // Initialize controller
    if (!controller.initialize()) {
        std::cerr << "ERROR: Failed to initialize autonomy controller" << std::endl;
        return 1;
    }
    
    std::cout << "Controller initialized successfully" << std::endl;
    std::cout << "Autonomy Level: " << static_cast<int>(controller.autonomy_level()) << std::endl;
    std::cout << std::endl;
    
    // Set up initial vehicle state (simulated)
    oas::VehicleKinematics initial_kinematics;
    initial_kinematics.position = {6771.0, 0.0, 0.0};  // 400 km LEO
    initial_kinematics.velocity = {0.0, 7.67, 0.0};    // Orbital velocity km/s
    initial_kinematics.orientation = {1.0, 0.0, 0.0, 0.0};  // Identity quaternion
    initial_kinematics.timestamp_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
    
    controller.update_vehicle_state(initial_kinematics, initial_kinematics.timestamp_ms);
    
    oas::VehicleResources initial_resources;
    initial_resources.propellant_kg = 50000.0;
    initial_resources.oxidizer_kg = 100000.0;
    initial_resources.battery_charge = 0.95;
    initial_resources.battery_temp_k = 293.0;
    initial_resources.delta_v_remaining = 3.2;  // km/s
    
    controller.update_vehicle_resources(initial_resources);
    
    oas::SubsystemHealth initial_health;
    initial_health.propulsion = oas::HealthStatus::HEALTH_NOMINAL;
    initial_health.navigation = oas::HealthStatus::HEALTH_NOMINAL;
    initial_health.communication = oas::HealthStatus::HEALTH_NOMINAL;
    initial_health.power = oas::HealthStatus::HEALTH_NOMINAL;
    initial_health.thermal = oas::HealthStatus::HEALTH_NOMINAL;
    initial_health.life_support = oas::HealthStatus::HEALTH_NOMINAL;
    
    controller.update_vehicle_health(initial_health);
    
    std::cout << "Vehicle state initialized" << std::endl;
    std::cout << "Press Ctrl+C to exit" << std::endl;
    std::cout << std::endl;
    
    // Main loop
    constexpr int64_t UPDATE_INTERVAL_MS = 1000;  // 1 Hz update rate
    
    int64_t last_update_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count();
    
    int iteration = 0;
    
    while (running) {
        int64_t current_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        
        int64_t delta_ms = current_ms - last_update_ms;
        
        if (delta_ms >= UPDATE_INTERVAL_MS) {
            // Update controller
            controller.update(delta_ms);
            
            // Run safety checks periodically
            if (iteration % 10 == 0) {
                auto safety_results = controller.run_safety_checks();
                
                std::cout << "\n--- Safety Check Results ---" << std::endl;
                for (const auto& result : safety_results) {
                    std::string status = result.passed ? "PASS" : "FAIL";
                    std::cout << "  [" << result.check_id << "] " << result.check_name 
                              << ": " << status << " - " << result.message << std::endl;
                }
                std::cout << std::endl;
            }
            
            last_update_ms = current_ms;
            iteration++;
        }
        
        // Sleep to avoid busy-waiting
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    std::cout << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "  OAS Shutdown Complete" << std::endl;
    std::cout << "========================================" << std::endl;
    
    // Print decision history
    auto decisions = controller.recent_decisions(5);
    if (!decisions.empty()) {
        std::cout << std::endl;
        std::cout << "Recent Decisions:" << std::endl;
        for (const auto& decision : decisions) {
            std::cout << "  [" << decision.decision_id << "] " 
                      << decision.action_type << ": " << decision.description << std::endl;
        }
    }
    
    return 0;
}
