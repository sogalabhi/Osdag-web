"""
Core utilities package - Re-exports for convenience
"""
from .errors import OsdagApiException, MissingKeyError, InvalidInputTypeError
from .validation import (
    validate_list_type, contains_keys, custom_list_validation,
    int_able, float_able, is_yes_or_no,
    validate_string, validate_num, validate_arr
)

try: 
    from .mesh_export import write_stl
except Exception: 
    def write_stl(*args, **kwargs):
        raise ImportError(
            "write_stl is not available because OCC (pythonOCC) is not installed. "
            "CAD/STL export cannot be used in this environment."
        )

__all__ = [
    # Errors
    'OsdagApiException', 'MissingKeyError', 'InvalidInputTypeError',
    # Validation utilities
    'validate_list_type', 'contains_keys', 'custom_list_validation',
    'int_able', 'float_able', 'is_yes_or_no',
    'validate_string', 'validate_num', 'validate_arr',
    'write_stl',
    # CAD export
    'export_step', 'export_iges',
]

