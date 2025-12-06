#!/usr/bin/env python3
"""
Run All Contract Validations

Master script that runs all integration tests:
1. Contract validation (protobuf schemas)
2. Telemetry flow tests
3. Safety boundary tests
"""

import sys
import subprocess
from pathlib import Path
from datetime import datetime


def run_test(name: str, script: str, project_root: Path) -> tuple[bool, str]:
    """Run a single test script and capture output."""
    print(f"\n{'=' * 60}")
    print(f"  Running: {name}")
    print('=' * 60)
    
    script_path = project_root / "integration-tests" / "contract-validation" / script
    
    if not script_path.exists():
        return False, f"Script not found: {script_path}"
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            cwd=str(project_root),
            timeout=60,
        )
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0, result.stdout
    except subprocess.TimeoutExpired:
        return False, "Test timed out after 60 seconds"
    except Exception as e:
        return False, f"Error running test: {e}"


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    
    print("\n" + "=" * 70)
    print("  AUTONOMOUS LUNAR LOGISTICS - Integration Test Suite")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 70)
    
    tests = [
        ("Contract Validation", "validate_contracts.py"),
        ("Telemetry Flow Test", "test_telemetry_flow.py"),
        ("Safety Boundary Test", "test_safety_boundaries.py"),
    ]
    
    results = []
    for name, script in tests:
        passed, output = run_test(name, script, project_root)
        results.append((name, passed))
    
    # Print summary
    print("\n" + "=" * 70)
    print("  INTEGRATION TEST SUMMARY")
    print("=" * 70)
    
    total_passed = 0
    total_failed = 0
    
    for name, passed in results:
        icon = "✓" if passed else "✗"
        color = "\033[92m" if passed else "\033[91m"
        reset = "\033[0m"
        print(f"  {color}{icon}{reset} {name}")
        
        if passed:
            total_passed += 1
        else:
            total_failed += 1
    
    print("\n" + "-" * 70)
    print(f"  Total: {total_passed} passed, {total_failed} failed")
    print("=" * 70)
    
    if total_failed == 0:
        print("\n\033[92m✓ All integration tests passed!\033[0m\n")
        sys.exit(0)
    else:
        print(f"\n\033[91m✗ {total_failed} test suite(s) failed!\033[0m\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
