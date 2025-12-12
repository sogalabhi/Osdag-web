"""
Service for Butt Joint Welded
"""
from .adapter import validate_input, generate_output
import traceback


MODULE_ID = "ButtJointWelded"


class Service:
    @staticmethod
    def calculate(inputs: dict, request=None, project_id=None, user_email=None) -> dict:
        try:
            validate_input(inputs)
            output, logs = generate_output(inputs)
            return {
                'data': output,
                'logs': logs or [],
                'success': True
            }
        except Exception as exc:
            traceback.print_exc()
            return {
                'data': {},
                'logs': [],
                'success': False,
                'error': str(exc),
            }

