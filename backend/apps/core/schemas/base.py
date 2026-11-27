"""
Pydantic base class and field types for design requests.

One model per module says which keys the request must carry and what type each has. The
field types accept exactly what the helpers in ``apps.core.utils.validation`` accept, so a
model never rejects a request the old hand-written ``validate_input()`` took (nor takes one
it rejected). Values stay strings on the wire; the models only check, they do not convert.

Declare a field with the core's key constant as its alias, so the key string is never
retyped here::

    class MyInput(DesignInput):
        bolt_diameter: IntStrList = Field(alias=KEY_D)                  # required
        gap: IntStr = Field(default="0", alias=KEY_DP_DETAILING_GAP)    # optional, checked if sent

A validator that finds a key required only under some condition raises ``PydanticCustomError("conditionally_missing", ...)``, which is reported like a missing required key.

``MyInput.validate_request(inputs)`` raises ``ValidationError`` (the shared 400 body, one
``fields`` entry per bad key) and ``MyInput.required_keys()`` lists the required keys.
"""
from typing import Annotated, Any, Dict, List

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StrictStr
from pydantic import ValidationError as PydanticValidationError
from pydantic_core import PydanticCustomError

from apps.core.utils.errors import ValidationError
from apps.core.utils.validation import float_able, int_able, is_yes_or_no

_EMPTY = ("", None, [])


def _check(test, expected):
    def check(value):
        if not test(value):
            raise PydanticCustomError("invalid_value", "should be {expected}", {"expected": expected})
        return value
    return check


# A required key sent as "", None or [] counts as missing (as ``contains_keys`` did).
Text = Annotated[StrictStr, Field(min_length=1)]
# Required with any non-empty value: the old validator only checked that the key was there.
Present = Annotated[Any, AfterValidator(_check(lambda v: v not in _EMPTY, "specified"))]
IntStr = Annotated[StrictStr, AfterValidator(_check(int_able, "a string that can be converted to int"))]
FloatStr = Annotated[StrictStr, AfterValidator(_check(float_able, "a string that can be converted to float"))]
YesNo = Annotated[StrictStr, AfterValidator(_check(is_yes_or_no, "'Yes' or 'No'"))]
StrList = Annotated[List[StrictStr], Field(min_length=1)]
IntStrList = Annotated[List[IntStr], Field(min_length=1)]
FloatStrList = Annotated[List[FloatStr], Field(min_length=1)]


class DesignInput(BaseModel):
    """Base for a module's design request. Keys the model does not list are ignored."""

    model_config = ConfigDict(extra="ignore")

    @classmethod
    def required_keys(cls) -> List[str]:
        return [f.alias for f in cls.model_fields.values() if f.is_required()]

    @classmethod
    def validate_request(cls, inputs: Any) -> None:
        """Raise ``ValidationError`` naming every bad key; return when the request is fine."""
        try:
            cls.model_validate(inputs)
        except PydanticValidationError as exc:
            raise ValidationError(cls._field_errors(exc, inputs)) from None

    @classmethod
    def _field_errors(cls, exc: PydanticValidationError, inputs: Any) -> List[Dict[str, str]]:
        required = set(cls.required_keys())
        aliases = {name: f.alias for name, f in cls.model_fields.items()}
        errors: Dict[str, str] = {}
        for err in exc.errors():
            key = str(err["loc"][0]) if err["loc"] else "non_field_errors"
            key = aliases.get(key, key)
            if key in errors:
                continue
            empty = isinstance(inputs, dict) and inputs.get(key) in _EMPTY
            if err["type"] == "conditionally_missing" or (key in required and (err["type"] == "missing" or empty)):
                errors[key] = f"Please specify {key} in input values."
            elif err["loc"][1:]:
                errors[key] = f"Item {err['loc'][1]} of {key}: {err['msg']}."
            else:
                errors[key] = f"Input Parameter {key}: {err['msg']}."
        return [{"field": key, "message": message} for key, message in errors.items()]
