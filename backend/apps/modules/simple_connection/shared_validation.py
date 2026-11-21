"""
Shared validation utilities for simple connection modules.
DRY approach to avoid code duplication across adapters.
"""
from typing import Dict, Any, List, Optional
from apps.core.utils import (
    MissingKeyError, InvalidInputTypeError,
    contains_keys, validate_list_type, 
    custom_list_validation, float_able, int_able
)
from apps.core.utils.errors import RangeValidationError
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_D,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_GRD,
    KEY_PLATE1_THICKNESS,
    KEY_PLATE2_THICKNESS,
    KEY_PLATE_WIDTH,
    KEY_WELD_SIZE,
)


class SimpleConnectionValidator:
    """Configurable validator for simple connection modules"""
    
    def __init__(self, required_keys: List[str], module_name: str):
        self.required_keys = required_keys
        self.module_name = module_name
        self.range_validations: List[Dict[str, Any]] = []
    
    def add_range_validation(self, key: str, min_value: float = 0.0, 
                           max_value: Optional[float] = None, 
                           allow_zero: bool = False):
        """Add range validation for a numeric field"""
        self.range_validations.append({
            'key': key,
            'min': min_value,
            'max': max_value,
            'allow_zero': allow_zero
        })
        return self
    
    def validate(self, input_values: Dict[str, Any]) -> None:
        """Run all validations"""
        iv = dict(input_values or {})
        
        # 1. Check required keys
        missing = contains_keys(iv, self.required_keys)
        if missing:
            raise MissingKeyError(missing[0])
        
        # 2. Validate bolt fields (if present)
        self._validate_bolt_fields(iv)
        
        # 3. Validate weld fields (if present)
        self._validate_weld_fields(iv)
        
        # 4. Validate numeric fields
        self._validate_numeric_fields(iv, input_values)
        
        # 5. Range validations
        self._validate_ranges(iv)
    
    def _validate_bolt_fields(self, iv: Dict[str, Any]) -> None:
        """Validate bolt diameter and grade if present"""
        if KEY_D in iv:
            bolt_dia = iv.get(KEY_D)
            if (not isinstance(bolt_dia, list)
                    or not validate_list_type(bolt_dia, str)
                    or not custom_list_validation(bolt_dia, int_able)):
                raise InvalidInputTypeError(
                    KEY_D, 
                    "non empty List[str] convertible to int"
                )
        
        if KEY_GRD in iv:
            bolt_grade = iv.get(KEY_GRD)
            if (not isinstance(bolt_grade, list)
                    or not validate_list_type(bolt_grade, str)
                    or not custom_list_validation(bolt_grade, float_able)):
                raise InvalidInputTypeError(
                    KEY_GRD, 
                    "non empty List[str] convertible to float"
                )
    
    def _validate_weld_fields(self, iv: Dict[str, Any]) -> None:
        """Validate weld size if present"""
        if KEY_WELD_SIZE in iv:
            weld_size = iv.get(KEY_WELD_SIZE)
            # Normalize single value to list
            if isinstance(weld_size, (int, float, str)):
                iv[KEY_WELD_SIZE] = [str(weld_size)]
            
            if (not isinstance(iv.get(KEY_WELD_SIZE), list)
                    or not validate_list_type(iv.get(KEY_WELD_SIZE), str)
                    or not custom_list_validation(iv.get(KEY_WELD_SIZE), float_able)):
                raise InvalidInputTypeError(
                    KEY_WELD_SIZE, 
                    "non empty List[str] convertible to float"
                )
    
    def _validate_numeric_fields(self, iv: Dict[str, Any], input_values: Dict[str, Any]) -> None:
        """Validate common numeric fields"""
        numeric_keys = [
            KEY_PLATE1_THICKNESS, KEY_PLATE2_THICKNESS, 
            KEY_PLATE_WIDTH, KEY_AXIAL, KEY_DP_BOLT_SLIP_FACTOR
        ]
        
        for key in numeric_keys:
            if key not in iv:
                continue
                
            val = iv.get(key)
            # Normalize list/tuple to first element
            if isinstance(val, (list, tuple)) and val:
                val = val[0]
            # Allow numeric and coerce to str
            if isinstance(val, (int, float)):
                val = str(val)
            
            if not isinstance(val, str) or not float_able(val):
                raise InvalidInputTypeError(key, "str convertible to float")
            
            # Update normalized value in both dicts
            iv[key] = val
            input_values[key] = val
    
    def _validate_ranges(self, iv: Dict[str, Any]) -> None:
        """Validate numeric ranges"""
        for rule in self.range_validations:
            key = rule['key']
            if key not in iv:
                continue
            
            val = iv[key]
            # Normalize to float
            if isinstance(val, str):
                try:
                    num_value = float(val)
                except ValueError:
                    continue  # Type validation already caught this
            elif isinstance(val, (int, float)):
                num_value = float(val)
            else:
                continue  # Type validation already caught this
            
            min_val = rule['min']
            max_val = rule.get('max')
            allow_zero = rule.get('allow_zero', False)
            
            # Check minimum
            if not allow_zero and num_value <= 0:
                raise RangeValidationError(
                    key, num_value, min_val, max_val, allow_zero
                )
            elif allow_zero and num_value < 0:
                raise RangeValidationError(
                    key, num_value, min_val, max_val, allow_zero
                )
            
            if num_value < min_val:
                raise RangeValidationError(
                    key, num_value, min_val, max_val, allow_zero
                )
            
            # Check maximum
            if max_val is not None and num_value > max_val:
                raise RangeValidationError(
                    key, num_value, min_val, max_val, allow_zero
                )


# Factory functions for common validators
def create_bolted_validator(required_keys: List[str], module_name: str):
    """Create validator for bolted connections"""
    return (SimpleConnectionValidator(required_keys, module_name)
            .add_range_validation("PlateWidth", min_value=0.0, allow_zero=False)
            .add_range_validation(KEY_AXIAL, min_value=0.0, allow_zero=False)
            .add_range_validation("Plate1Thickness", min_value=0.0, allow_zero=False)
            .add_range_validation("Plate2Thickness", min_value=0.0, allow_zero=False)
            .add_range_validation(KEY_DP_BOLT_SLIP_FACTOR, min_value=0.0, max_value=1.0, allow_zero=False))


def create_welded_validator(required_keys: List[str], module_name: str):
    """Create validator for welded connections"""
    return (SimpleConnectionValidator(required_keys, module_name)
            .add_range_validation("PlateWidth", min_value=0.0, allow_zero=False)
            .add_range_validation(KEY_AXIAL, min_value=0.0, allow_zero=False)
            .add_range_validation("Plate1Thickness", min_value=0.0, allow_zero=False)
            .add_range_validation("Plate2Thickness", min_value=0.0, allow_zero=False))

