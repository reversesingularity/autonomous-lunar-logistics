cmake_minimum_required(VERSION 3.20)
project(alls_oas VERSION 0.1.0 LANGUAGES CXX CUDA)

# C++20 Standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Options
option(BUILD_TESTS "Build unit tests" ON)
option(USE_CUDA "Enable CUDA acceleration" OFF)
option(BUILD_DOCS "Build documentation" OFF)

# Find packages
find_package(Protobuf REQUIRED)
find_package(gRPC CONFIG)
find_package(Eigen3 REQUIRED)
find_package(spdlog REQUIRED)

if(USE_CUDA)
    find_package(CUDAToolkit REQUIRED)
    add_definitions(-DUSE_CUDA)
endif()

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${Protobuf_INCLUDE_DIRS}
    ${EIGEN3_INCLUDE_DIR}
)

# Source files
set(OAS_SOURCES
    src/core/vehicle_state.cpp
    src/core/trajectory_planner.cpp
    src/core/safety_monitor.cpp
    src/gnc/guidance.cpp
    src/gnc/navigation.cpp
    src/gnc/control.cpp
    src/comms/grpc_client.cpp
    src/main.cpp
)

# Header files
set(OAS_HEADERS
    include/oas/core/vehicle_state.hpp
    include/oas/core/trajectory_planner.hpp
    include/oas/core/safety_monitor.hpp
    include/oas/gnc/guidance.hpp
    include/oas/gnc/navigation.hpp
    include/oas/gnc/control.hpp
    include/oas/comms/grpc_client.hpp
    include/oas/types.hpp
)

# Main executable
add_executable(oas_sim ${OAS_SOURCES})

target_link_libraries(oas_sim
    PRIVATE
    ${Protobuf_LIBRARIES}
    Eigen3::Eigen
    spdlog::spdlog
)

if(gRPC_FOUND)
    target_link_libraries(oas_sim PRIVATE gRPC::grpc++)
endif()

if(USE_CUDA)
    target_link_libraries(oas_sim PRIVATE CUDA::cudart)
endif()

# Tests
if(BUILD_TESTS)
    enable_testing()
    find_package(GTest REQUIRED)
    
    add_executable(oas_tests
        tests/test_vehicle_state.cpp
        tests/test_trajectory.cpp
        tests/test_safety.cpp
    )
    
    target_link_libraries(oas_tests
        PRIVATE
        GTest::gtest_main
        Eigen3::Eigen
    )
    
    add_test(NAME oas_tests COMMAND oas_tests)
endif()

# Install
install(TARGETS oas_sim DESTINATION bin)
install(DIRECTORY include/ DESTINATION include)

# Documentation
if(BUILD_DOCS)
    find_package(Doxygen)
    if(DOXYGEN_FOUND)
        add_custom_target(doc
            COMMAND ${DOXYGEN_EXECUTABLE} ${CMAKE_CURRENT_SOURCE_DIR}/Doxyfile
            WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        )
    endif()
endif()
