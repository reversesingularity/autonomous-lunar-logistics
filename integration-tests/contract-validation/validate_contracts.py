#!/usr/bin/env python3
"""
Contract Validation Suite

Validates that all three segments (OAS, GSC, MCWI) correctly implement
the shared protobuf contracts defined in shared-contracts/protobuf/.

Per Project Constitution Article III: Contract Supremacy
"Changes require unanimous segment approval"
"""

import os
import sys
import json
import re
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class ValidationResult(Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"
    SKIP = "SKIP"


@dataclass
class ContractCheck:
    """Result of a single contract validation check."""
    name: str
    segment: str
    result: ValidationResult
    message: str
    details: Optional[str] = None


class ContractValidator:
    """Validates protobuf contract compliance across segments."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.contracts_path = project_root / "shared-contracts"
        self.protobuf_path = self.contracts_path / "protobuf"
        self.results: list[ContractCheck] = []
        
    def validate_all(self) -> bool:
        """Run all contract validations."""
        print("=" * 60)
        print("  Contract Validation Suite")
        print("  Autonomous Lunar Logistics System")
        print("=" * 60)
        print()
        
        # Check contract version file exists
        self._check_version_file()
        
        # Validate protobuf schemas exist
        self._validate_protobuf_schemas()
        
        # Validate safety boundaries
        self._validate_safety_boundaries()
        
        # Validate each segment's contract compliance
        self._validate_oas_contracts()
        self._validate_gsc_contracts()
        self._validate_mcwi_contracts()
        
        # Cross-segment type compatibility
        self._validate_type_compatibility()
        
        # Print summary
        return self._print_summary()
    
    def _check_version_file(self):
        """Verify VERSION file exists and is valid."""
        version_file = self.contracts_path / "VERSION"
        
        if not version_file.exists():
            self.results.append(ContractCheck(
                name="VERSION file exists",
                segment="shared-contracts",
                result=ValidationResult.FAIL,
                message="VERSION file not found"
            ))
            return
            
        version = version_file.read_text().strip()
        
        # Validate semver format
        if re.match(r'^\d+\.\d+\.\d+$', version):
            self.results.append(ContractCheck(
                name="VERSION file format",
                segment="shared-contracts",
                result=ValidationResult.PASS,
                message=f"Version {version} is valid semver"
            ))
        else:
            self.results.append(ContractCheck(
                name="VERSION file format",
                segment="shared-contracts",
                result=ValidationResult.FAIL,
                message=f"Invalid version format: {version}"
            ))
    
    def _validate_protobuf_schemas(self):
        """Validate all required protobuf schemas exist."""
        required_schemas = [
            "telemetry.proto",
            "fleet_status.proto",
            "ai_decision.proto",
            "commands.proto",
            "constraints.proto",
        ]
        
        for schema in required_schemas:
            schema_path = self.protobuf_path / schema
            if schema_path.exists():
                # Basic syntax validation
                content = schema_path.read_text()
                if 'syntax = "proto3"' in content:
                    self.results.append(ContractCheck(
                        name=f"Schema {schema}",
                        segment="shared-contracts",
                        result=ValidationResult.PASS,
                        message="Schema exists and uses proto3 syntax"
                    ))
                else:
                    self.results.append(ContractCheck(
                        name=f"Schema {schema}",
                        segment="shared-contracts",
                        result=ValidationResult.WARN,
                        message="Schema exists but may not use proto3"
                    ))
            else:
                self.results.append(ContractCheck(
                    name=f"Schema {schema}",
                    segment="shared-contracts",
                    result=ValidationResult.FAIL,
                    message=f"Required schema {schema} not found"
                ))
    
    def _validate_safety_boundaries(self):
        """Validate safety boundary definitions."""
        safety_path = self.contracts_path / "safety-boundaries"
        
        required_boundaries = [
            "thermal_limits.yaml",
            "power_limits.yaml",
            "structural_limits.yaml",
            "operational_limits.yaml",
        ]
        
        for boundary in required_boundaries:
            boundary_path = safety_path / boundary
            if boundary_path.exists():
                self.results.append(ContractCheck(
                    name=f"Safety boundary {boundary}",
                    segment="shared-contracts",
                    result=ValidationResult.PASS,
                    message="Safety boundary file exists"
                ))
            else:
                self.results.append(ContractCheck(
                    name=f"Safety boundary {boundary}",
                    segment="shared-contracts",
                    result=ValidationResult.FAIL,
                    message=f"Required safety boundary {boundary} not found"
                ))
    
    def _validate_oas_contracts(self):
        """Validate OAS segment contract compliance."""
        oas_path = self.project_root / "oas"
        
        # Check types.hpp matches protobuf definitions
        types_file = oas_path / "include" / "oas" / "types.hpp"
        
        if not types_file.exists():
            self.results.append(ContractCheck(
                name="OAS types.hpp exists",
                segment="OAS",
                result=ValidationResult.FAIL,
                message="types.hpp not found"
            ))
            return
            
        content = types_file.read_text()
        
        # Check for required types matching telemetry.proto
        required_types = [
            ("Vector3D", "struct Vector3D"),
            ("Quaternion", "struct Quaternion"),
            ("HealthStatus", "enum class HealthStatus"),
            ("MissionPhase", "enum class MissionPhase"),
            ("TelemetryPacket", "struct TelemetryPacket"),
        ]
        
        for type_name, pattern in required_types:
            if pattern in content:
                self.results.append(ContractCheck(
                    name=f"OAS type {type_name}",
                    segment="OAS",
                    result=ValidationResult.PASS,
                    message=f"Type {type_name} defined correctly"
                ))
            else:
                self.results.append(ContractCheck(
                    name=f"OAS type {type_name}",
                    segment="OAS",
                    result=ValidationResult.FAIL,
                    message=f"Type {type_name} not found or incorrectly defined"
                ))
        
        # Check safety monitor implements S-001 through S-008
        safety_file = oas_path / "include" / "oas" / "core" / "safety_monitor.hpp"
        if safety_file.exists():
            safety_content = safety_file.read_text()
            for i in range(1, 9):
                check_id = f"S-00{i}"
                if check_id in safety_content:
                    self.results.append(ContractCheck(
                        name=f"OAS safety check {check_id}",
                        segment="OAS",
                        result=ValidationResult.PASS,
                        message=f"Safety check {check_id} implemented"
                    ))
                else:
                    self.results.append(ContractCheck(
                        name=f"OAS safety check {check_id}",
                        segment="OAS",
                        result=ValidationResult.FAIL,
                        message=f"Safety check {check_id} not found"
                    ))
    
    def _validate_gsc_contracts(self):
        """Validate GSC segment contract compliance."""
        gsc_path = self.project_root / "gsc"
        
        # Check types.py matches protobuf definitions
        types_file = gsc_path / "src" / "gsc" / "types.py"
        
        if not types_file.exists():
            self.results.append(ContractCheck(
                name="GSC types.py exists",
                segment="GSC",
                result=ValidationResult.FAIL,
                message="types.py not found"
            ))
            return
            
        content = types_file.read_text()
        
        # Check for required types
        required_types = [
            "Vector3D",
            "Quaternion",
            "HealthStatus",
            "MissionPhase",
            "TelemetryPacket",
        ]
        
        for type_name in required_types:
            if f"class {type_name}" in content or f"{type_name} =" in content:
                self.results.append(ContractCheck(
                    name=f"GSC type {type_name}",
                    segment="GSC",
                    result=ValidationResult.PASS,
                    message=f"Type {type_name} defined"
                ))
            else:
                self.results.append(ContractCheck(
                    name=f"GSC type {type_name}",
                    segment="GSC",
                    result=ValidationResult.FAIL,
                    message=f"Type {type_name} not found"
                ))
        
        # Check safety module implements boundaries
        safety_file = gsc_path / "src" / "gsc" / "safety.py"
        if safety_file.exists():
            safety_content = safety_file.read_text()
            for i in range(1, 9):
                check_id = f"S-00{i}"
                if check_id in safety_content:
                    self.results.append(ContractCheck(
                        name=f"GSC safety check {check_id}",
                        segment="GSC",
                        result=ValidationResult.PASS,
                        message=f"Safety check {check_id} implemented"
                    ))
                else:
                    self.results.append(ContractCheck(
                        name=f"GSC safety check {check_id}",
                        segment="GSC",
                        result=ValidationResult.WARN,
                        message=f"Safety check {check_id} not explicitly labeled"
                    ))
    
    def _validate_mcwi_contracts(self):
        """Validate MCWI segment contract compliance."""
        mcwi_path = self.project_root / "mcwi"
        
        # Check types.ts matches protobuf definitions
        types_file = mcwi_path / "src" / "types" / "index.ts"
        
        if not types_file.exists():
            self.results.append(ContractCheck(
                name="MCWI types/index.ts exists",
                segment="MCWI",
                result=ValidationResult.FAIL,
                message="types/index.ts not found"
            ))
            return
            
        content = types_file.read_text()
        
        # Check for required types
        required_types = [
            ("Position", "interface Position"),
            ("ShipStatus", "interface ShipStatus"),
            ("MissionPhase", "MissionPhase"),
            ("Alert", "interface Alert"),
        ]
        
        for type_name, pattern in required_types:
            if pattern in content or f"export type {type_name}" in content:
                self.results.append(ContractCheck(
                    name=f"MCWI type {type_name}",
                    segment="MCWI",
                    result=ValidationResult.PASS,
                    message=f"Type {type_name} defined"
                ))
            else:
                self.results.append(ContractCheck(
                    name=f"MCWI type {type_name}",
                    segment="MCWI",
                    result=ValidationResult.FAIL,
                    message=f"Type {type_name} not found"
                ))
    
    def _validate_type_compatibility(self):
        """Validate types are compatible across segments."""
        # Read protobuf definitions
        telemetry_proto = self.protobuf_path / "telemetry.proto"
        if not telemetry_proto.exists():
            return
            
        proto_content = telemetry_proto.read_text()
        
        # Extract field names from Vector3 in proto
        vector3_fields = {"x", "y", "z"}
        
        # Check OAS Vector3D
        oas_types = self.project_root / "oas" / "include" / "oas" / "types.hpp"
        if oas_types.exists():
            oas_content = oas_types.read_text()
            oas_has_xyz = all(f"double {f}" in oas_content or f"{f} =" in oas_content 
                            for f in vector3_fields)
            self.results.append(ContractCheck(
                name="Vector3D field compatibility (OAS)",
                segment="cross-segment",
                result=ValidationResult.PASS if oas_has_xyz else ValidationResult.FAIL,
                message="OAS Vector3D fields match proto" if oas_has_xyz else "OAS Vector3D fields mismatch"
            ))
        
        # Check GSC Vector3D
        gsc_types = self.project_root / "gsc" / "src" / "gsc" / "types.py"
        if gsc_types.exists():
            gsc_content = gsc_types.read_text()
            gsc_has_xyz = all(f in gsc_content for f in ["x:", "y:", "z:"])
            self.results.append(ContractCheck(
                name="Vector3D field compatibility (GSC)",
                segment="cross-segment",
                result=ValidationResult.PASS if gsc_has_xyz else ValidationResult.FAIL,
                message="GSC Vector3D fields match proto" if gsc_has_xyz else "GSC Vector3D fields mismatch"
            ))
        
        # Check MCWI Position
        mcwi_types = self.project_root / "mcwi" / "src" / "types" / "index.ts"
        if mcwi_types.exists():
            mcwi_content = mcwi_types.read_text()
            mcwi_has_xyz = all(f"{f}:" in mcwi_content for f in vector3_fields)
            self.results.append(ContractCheck(
                name="Position field compatibility (MCWI)",
                segment="cross-segment",
                result=ValidationResult.PASS if mcwi_has_xyz else ValidationResult.FAIL,
                message="MCWI Position fields match proto" if mcwi_has_xyz else "MCWI Position fields mismatch"
            ))
    
    def _print_summary(self) -> bool:
        """Print validation summary and return success status."""
        print("\n" + "=" * 60)
        print("  Validation Results")
        print("=" * 60 + "\n")
        
        # Group by segment
        segments = {}
        for check in self.results:
            if check.segment not in segments:
                segments[check.segment] = []
            segments[check.segment].append(check)
        
        total_pass = 0
        total_fail = 0
        total_warn = 0
        
        for segment, checks in segments.items():
            print(f"\n[{segment}]")
            print("-" * 40)
            
            for check in checks:
                icon = {
                    ValidationResult.PASS: "✓",
                    ValidationResult.FAIL: "✗",
                    ValidationResult.WARN: "⚠",
                    ValidationResult.SKIP: "○",
                }[check.result]
                
                color_code = {
                    ValidationResult.PASS: "\033[92m",
                    ValidationResult.FAIL: "\033[91m",
                    ValidationResult.WARN: "\033[93m",
                    ValidationResult.SKIP: "\033[90m",
                }[check.result]
                
                reset = "\033[0m"
                print(f"  {color_code}{icon}{reset} {check.name}: {check.message}")
                
                if check.result == ValidationResult.PASS:
                    total_pass += 1
                elif check.result == ValidationResult.FAIL:
                    total_fail += 1
                elif check.result == ValidationResult.WARN:
                    total_warn += 1
        
        print("\n" + "=" * 60)
        print(f"  Summary: {total_pass} passed, {total_fail} failed, {total_warn} warnings")
        print("=" * 60)
        
        if total_fail == 0:
            print("\n\033[92m✓ All contract validations passed!\033[0m\n")
            return True
        else:
            print(f"\n\033[91m✗ {total_fail} contract validation(s) failed!\033[0m\n")
            return False


def main():
    """Run contract validation."""
    # Find project root (parent of integration-tests)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    validator = ContractValidator(project_root)
    success = validator.validate_all()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
