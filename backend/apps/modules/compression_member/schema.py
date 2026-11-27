"""Design request keys and value types shared by the compression member modules."""
from typing import Annotated, Any, List

from pydantic import AfterValidator, Field, StrictStr
from pydantic_core import PydanticCustomError

from apps.core.schemas import DesignInput, Text
from apps.core.utils.validation import float_able, int_able
from osdag_core.Common import (
    KEY_END1,
    KEY_END2,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_SEC_PROFILE,
)


def _check(test, expected):
    def check(value):
        if not test(value):
            raise PydanticCustomError("invalid_value", "should be {expected}", {"expected": expected})
        return value
    return check


def _is_section_designation(value: Any) -> bool:
    if isinstance(value, list):
        return all(isinstance(v, str) for v in value) and any(v.strip() for v in value)
    if isinstance(value, str):
        return bool(value.strip()) and value.strip().lower() != "all"
    return False


def _is_int_str_or_list(value: Any) -> bool:
    if isinstance(value, str):
        return int_able(value)
    return isinstance(value, list) and all(isinstance(v, str) and int_able(v) for v in value)


def _is_number(value: Any) -> bool:
    return (isinstance(value, str) and float_able(value)) or isinstance(value, (int, float))


# A section list, or a single section name; blank entries and the name "All" do not count.
SectionDesignation = Annotated[
    Any, AfterValidator(_check(_is_section_designation, "a non-empty str (single section) or non-empty List[str]"))
]
# A list of section names, at least one of them not blank.
SectionList = Annotated[
    List[StrictStr],
    Field(min_length=1),
    AfterValidator(_check(lambda v: any(s.strip() for s in v), "a non-empty List[str] with at least one section selected")),
]
# One int string, or a list of them.
IntStrOrList = Annotated[
    Any, AfterValidator(_check(_is_int_str_or_list, "a str or List[str] where all items can be converted to int"))
]
# A number, or a string that converts to float.
Number = Annotated[Any, AfterValidator(_check(_is_number, "a str convertible to float, or a numeric value"))]


class CompressionMemberInput(DesignInput):
    section_profile: Text = Field(alias=KEY_SEC_PROFILE)
    material: Text = Field(alias=KEY_MATERIAL)
    end_condition_1: Text = Field(alias=KEY_END1)
    end_condition_2: Text = Field(alias=KEY_END2)
    module: Text = Field(alias=KEY_MODULE)
