#!/usr/bin/env python
"""
Standalone test runner for Plate Girder PSO Celery task (backend-only).

This calls run_pso_optimization() synchronously, without WebSocket or frontend.
"""
import os
import sys
from pathlib import Path
import django


def main():
    # Setup Django
    # Ensure backend package (with config.settings) is on sys.path
    project_root = Path(__file__).resolve().parent
    backend_dir = project_root / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()

    from apps.modules.flexure_member.submodules.plate_girder.tasks import run_pso_optimization

    # Sample optimization input (same shape as WebSocket would send in content["data"])
    input_data = {
        "Total.Design_Type": "Optimized",
        "Material": "E 250 (Fe 410 W)A",
        "Member.Length": "5",  # 5 m
        "Load.Shear": "150",   # kN
        "Load.Moment": "500",  # kNm
        "Design.Web_Philosophy": "Thick Web without ITS",
        "Web.Thickness": ["6", "8", "10", "12", "16", "20"],
        "TopFlange.Thickness": ["10", "12", "16", "20"],
        "BottomFlange.Thickness": ["10", "12", "16", "20"],
        "Design.Design_Type_Flexure": "Major Laterally Supported",
        "Loading.Bending_Moment_Shape": "Uniform Loading with pinned-pinned support",
        "Design.Torsional_Restraint": "Fully Restrained",
        "Design.Warping_Restraint": "Both flanges fully restrained",
        "Design.Max_Deflection": "L/250",
        "Design.Allow_Class": "Plastic",
        "Design.Support_Width": "100",
        "Design.IntermediateStiffener.Spacing": "NA",
        "Design.IntermediateStiffener.Thickness": "Standard",
        "Design.LongitudnalStiffener": "No",
        "Design.LongitudnalStiffener.Thickness": "Standard",
        "Symmetry": "Symmetrical",
        "Loading.Condition": "Normal",
    }

    # Use a dummy channel name; in this test we don't have a real WebSocket consumer.
    channel_name = "test.channel.pso"

    print("=" * 80)
    print("Running Plate Girder PSO task synchronously (direct call)")
    print("=" * 80)
    print(f"Channel: {channel_name}")
    print(f"Input keys: {list(input_data.keys())}")
    print()

    # Call the task directly (NOT .delay) so we can see logs and exceptions immediately.
    result = run_pso_optimization(channel_name, input_data)

    print()
    print("=" * 80)
    print("✅ PSO task finished without raising an exception.")
    print("Note: Actual optimized design is sent via Channels; this script mainly")
    print("verifies that the task runs end-to-end without crashing in backend-only mode.")
    print("=" * 80)


if __name__ == "__main__":
    main()


