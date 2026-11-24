"""A cover plate module that cannot be created raises its own error, not a NameError."""
import pytest

from apps.modules.moment_connection import shared


class _BrokenModule:
    def __init__(self):
        raise RuntimeError("module could not be created")


def test_a_module_that_cannot_be_created_raises_its_own_error():
    with pytest.raises(RuntimeError, match="module could not be created"):
        shared.create_cover_plate_bolted_from_input(_BrokenModule, {})
