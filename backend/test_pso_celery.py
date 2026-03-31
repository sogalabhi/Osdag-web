#!/usr/bin/env python
"""
Async PSO optimization test using Celery + Redis + Channels.

This script:
- Boots Django
- Enqueues run_pso_optimization via Celery (delay)
- Polls the task state until it finishes or times out

Run from repo root:
    cd backend
    conda run -n osdag-web python test_pso_celery.py
"""
import os
import time

import django
from celery.result import AsyncResult


def main() -> None:
    # Django setup
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()

    from config.celery import app
    from apps.modules.flexure_member.submodules.plate_girder.tasks import run_pso_optimization

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

    channel_name = "test.channel.pso"

    print("=" * 80)
    print("Enqueuing Plate Girder PSO optimization via Celery (async)")
    print("=" * 80)
    print(f"Channel: {channel_name}")
    print(f"Input keys: {list(input_data.keys())}")
    print()

    # Enqueue task
    async_result = run_pso_optimization.delay(channel_name, input_data)
    task_id = async_result.id
    print(f"Task ID: {task_id}")
    print(f"Initial State: {async_result.state}")
    print()

    # Poll for completion
    timeout_seconds = 600  # 10 minutes max
    poll_interval = 5
    start = time.time()

    while True:
        res = AsyncResult(task_id, app=app)
        state = res.state
        print(f"[{int(time.time() - start):4d}s] State: {state}")

        if state in ("SUCCESS", "FAILURE", "REVOKED"):
            print()
            print("=" * 80)
            print("Final Task State:", state)
            print("Result / Info:", res.info)
            print("=" * 80)
            break

        if time.time() - start > timeout_seconds:
            print("❌ Timeout waiting for task to finish.")
            break

        time.sleep(poll_interval)


if __name__ == "__main__":
    main()


