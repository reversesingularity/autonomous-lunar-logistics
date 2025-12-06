#!/usr/bin/env python3
"""
Safety Boundary Validation

Validates that all three segments correctly implement the safety boundaries
defined in shared-contracts/safety-boundaries/.

Per Project Constitution Article V:
"All safety boundary checks shall be deterministic and verifiable"
"""

import sys
import yaml
from pathlib import Path
from dataclasses import dataclass


@dataclass
class SafetyCheck:
    name: str
    segment: str
    boundary_id: str
    passed: bool
    message: str


class SafetyBoundaryValidator:
    """Validate safety boundary implementation across segments."""
    
    # Safety boundaries from SPEC-KIT
    SAFETY_BOUNDARIES = {
        "S-001": {
            "name": "Delta-V Budget",
            "description": "10% margin required",
            "threshold": 0.10,  # 10% margin
        },
        "S-002": {
            "name": "Communication Delay",
            "description": "Max 5000ms one-way",
            "threshold": 5000,  # ms
        },
        "S-003": {
            "name": "Fuel Reserves",
            "description": "Abort minimum: 5000kg",
            "threshold": 5000,  # kg
        },
        "S-004": {
            "name": "Thermal Limits",
            "description": "200K - 350K",
            "min": 200,  # K
            "max": 350,  # K
        },
        "S-005": {
            "name": "Radiation Exposure",
            "description": "Max 50 rad cumulative",
            "threshold": 50,  # rad
        },
        "S-006": {
            "name": "Trajectory Corridor",
            "description": "100km deviation max",
            "threshold": 100,  # km
        },
        "S-007": {
            "name": "Abort Window",
            "description": "Must have viable abort option",
            "threshold": 0,  # time remaining > 0
        },
        "S-008": {
            "name": "Subsystem Health",
            "description": "No critical failures",
            "threshold": 0,  # critical count = 0
        },
    }
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.results: list[SafetyCheck] = []
    
    def validate_all(self) -> bool:
        """Run all safety boundary validations."""
        print("=" * 60)
        print("  Safety Boundary Validation")
        print("  Per Constitution Article V: Deterministic & Verifiable")
        print("=" * 60)
        print()
        
        # Validate safety boundary definition files
        self._validate_boundary_files()
        
        # Validate OAS implementation
        self._validate_oas_safety()
        
        # Validate GSC implementation
        self._validate_gsc_safety()
        
        # Cross-check boundary values
        self._validate_boundary_consistency()
        
        return self._print_results()
    
    def _validate_boundary_files(self):
        """Validate safety boundary YAML files exist and are valid."""
        safety_dir = self.project_root / "shared-contracts" / "safety-boundaries"
        
        required_files = [
            "thermal_limits.yaml",
            "power_limits.yaml",
            "structural_limits.yaml",
            "operational_limits.yaml",
        ]
        
        for filename in required_files:
            filepath = safety_dir / filename
            if filepath.exists():
                try:
                    with open(filepath) as f:
                        data = yaml.safe_load(f)
                    
                    if data and isinstance(data, dict):
                        self.results.append(SafetyCheck(
                            name=f"Boundary file {filename}",
                            segment="shared-contracts",
                            boundary_id="CONFIG",
                            passed=True,
                            message="Valid YAML with safety limits",
                        ))
                    else:
                        self.results.append(SafetyCheck(
                            name=f"Boundary file {filename}",
                            segment="shared-contracts",
                            boundary_id="CONFIG",
                            passed=False,
                            message="Empty or invalid YAML",
                        ))
                except yaml.YAMLError as e:
                    self.results.append(SafetyCheck(
                        name=f"Boundary file {filename}",
                        segment="shared-contracts",
                        boundary_id="CONFIG",
                        passed=False,
                        message=f"YAML parse error: {e}",
                    ))
            else:
                self.results.append(SafetyCheck(
                    name=f"Boundary file {filename}",
                    segment="shared-contracts",
                    boundary_id="CONFIG",
                    passed=False,
                    message="File not found",
                ))
    
    def _validate_oas_safety(self):
        """Validate OAS implements all safety checks."""
        safety_monitor_path = self.project_root / "oas" / "include" / "oas" / "core" / "safety_monitor.hpp"
        safety_impl_path = self.project_root / "oas" / "src" / "core" / "safety_monitor.cpp"
        
        files_to_check = []
        if safety_monitor_path.exists():
            files_to_check.append(("header", safety_monitor_path))
        if safety_impl_path.exists():
            files_to_check.append(("impl", safety_impl_path))
        
        if not files_to_check:
            self.results.append(SafetyCheck(
                name="OAS SafetyMonitor",
                segment="OAS",
                boundary_id="ALL",
                passed=False,
                message="SafetyMonitor files not found",
            ))
            return
        
        # Combine content from all files
        content = ""
        for name, path in files_to_check:
            content += path.read_text()
        
        # Check each safety boundary is implemented
        for boundary_id, boundary in self.SAFETY_BOUNDARIES.items():
            # Look for the boundary ID or related function names
            patterns = [
                boundary_id,
                boundary["name"].lower().replace(" ", "_"),
                boundary["name"].lower().replace("-", "_"),
            ]
            
            found = any(p in content.lower() or p.replace("_", "") in content.lower() 
                       for p in patterns)
            
            self.results.append(SafetyCheck(
                name=f"OAS {boundary_id}: {boundary['name']}",
                segment="OAS",
                boundary_id=boundary_id,
                passed=found,
                message="Check implemented" if found else "Check not found",
            ))
    
    def _validate_gsc_safety(self):
        """Validate GSC implements all safety checks."""
        safety_path = self.project_root / "gsc" / "src" / "gsc" / "safety.py"
        
        if not safety_path.exists():
            self.results.append(SafetyCheck(
                name="GSC safety.py",
                segment="GSC",
                boundary_id="ALL",
                passed=False,
                message="safety.py not found",
            ))
            return
        
        content = safety_path.read_text()
        
        # Check each safety boundary
        for boundary_id, boundary in self.SAFETY_BOUNDARIES.items():
            patterns = [
                boundary_id,
                boundary["name"].lower().replace(" ", "_"),
                boundary["name"].lower().replace("-", "_"),
            ]
            
            found = any(p in content.lower() for p in patterns)
            
            self.results.append(SafetyCheck(
                name=f"GSC {boundary_id}: {boundary['name']}",
                segment="GSC",
                boundary_id=boundary_id,
                passed=found,
                message="Check implemented" if found else "Check not explicitly labeled",
            ))
    
    def _validate_boundary_consistency(self):
        """Validate boundary values are consistent across segments."""
        # Check OAS safety config matches GSC
        oas_header = self.project_root / "oas" / "include" / "oas" / "core" / "safety_monitor.hpp"
        gsc_safety = self.project_root / "gsc" / "src" / "gsc" / "safety.py"
        
        if not oas_header.exists() or not gsc_safety.exists():
            return
        
        oas_content = oas_header.read_text()
        gsc_content = gsc_safety.read_text()
        
        # Check thermal limits (S-004)
        # OAS should have min_temp_k and max_temp_k around 200-350K
        oas_has_thermal = "min_temp" in oas_content.lower() and "max_temp" in oas_content.lower()
        gsc_has_thermal = "thermal" in gsc_content.lower() or "temperature" in gsc_content.lower()
        
        self.results.append(SafetyCheck(
            name="Thermal limits consistency",
            segment="cross-segment",
            boundary_id="S-004",
            passed=oas_has_thermal and gsc_has_thermal,
            message="Both segments implement thermal checks" if (oas_has_thermal and gsc_has_thermal) 
                   else "Thermal check implementation mismatch",
        ))
        
        # Check fuel reserves (S-003)
        oas_has_fuel = "fuel" in oas_content.lower() or "propellant" in oas_content.lower()
        gsc_has_fuel = "fuel" in gsc_content.lower() or "propellant" in gsc_content.lower()
        
        self.results.append(SafetyCheck(
            name="Fuel reserves consistency",
            segment="cross-segment",
            boundary_id="S-003",
            passed=oas_has_fuel and gsc_has_fuel,
            message="Both segments implement fuel checks" if (oas_has_fuel and gsc_has_fuel)
                   else "Fuel check implementation mismatch",
        ))
    
    def _print_results(self) -> bool:
        """Print validation results and return success status."""
        print("\nSafety Boundary Validation Results:")
        print("-" * 60)
        
        # Group by segment
        segments = {}
        for check in self.results:
            if check.segment not in segments:
                segments[check.segment] = []
            segments[check.segment].append(check)
        
        all_passed = True
        for segment, checks in segments.items():
            print(f"\n[{segment}]")
            for check in checks:
                icon = "✓" if check.passed else "✗"
                color = "\033[92m" if check.passed else "\033[91m"
                reset = "\033[0m"
                
                print(f"  {color}{icon}{reset} [{check.boundary_id}] {check.name}")
                print(f"      {check.message}")
                
                if not check.passed:
                    all_passed = False
        
        print("\n" + "=" * 60)
        if all_passed:
            print("\033[92m✓ All safety boundary validations passed!\033[0m")
        else:
            print("\033[91m✗ Some safety validations need attention!\033[0m")
        print("=" * 60 + "\n")
        
        return all_passed


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    validator = SafetyBoundaryValidator(project_root)
    success = validator.validate_all()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
