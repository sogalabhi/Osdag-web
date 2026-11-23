import json
import re
from datetime import datetime
from typing import Any, Dict, Tuple

import yaml
from django.core.files.base import ContentFile

from osdag_core.Common import KEY_DISP_HEADERPLATE, KEY_MODULE

OSI_SCHEMA_VERSION = "1.0"
SUPPORTED_VERSIONS = {"1.0"}

# Desktop module names that differ from the web module id. The desktop calls the shear
# header plate module "End Plate Connection".
DESKTOP_MODULE_NAMES = {"End Plate Connection": KEY_DISP_HEADERPLATE}
WEB_MODULE_NAMES = {web: desktop for desktop, web in DESKTOP_MODULE_NAMES.items()}


def validate_module_id(module_id: str) -> bool:
    if not isinstance(module_id, str):
        return False
    # allow letters, numbers, spaces, dashes and underscores
    return bool(re.fullmatch(r"[A-Za-z0-9 _-]{2,64}", module_id))


def build_osi_payload(name: str, module_id: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    if not name or not isinstance(name, str):
        raise ValueError("Invalid project name")
    if not validate_module_id(module_id):
        raise ValueError("Invalid module_id")
    if not isinstance(inputs, dict):
        raise ValueError("Invalid inputs; expected object")
    return {
        "version": OSI_SCHEMA_VERSION,
        "name": name,
        "module_id": module_id,
        "inputs": inputs,
        "meta": {
            "saved_at": datetime.utcnow().isoformat() + "Z",
        },
    }


class _NoAliasDumper(yaml.SafeDumper):
    """SafeDumper that writes a list that occurs twice out in full, never as an anchor and alias."""

    def ignore_aliases(self, data):
        return True


def _text(value: Any) -> Any:
    """A value as the file keeps it: a string, or a list of strings."""
    if isinstance(value, (list, tuple)):
        return ["" if item is None else str(item) for item in value]
    return "" if value is None else str(value)


def _to_flat_yaml(module_id: str, inputs: Dict[str, Any]) -> str:
    """Write the design dictionary as the flat YAML the desktop reads: core key -> string or list of strings.

    The dictionary is written as it is. Only the `Module` entry is set, if it is missing, and
    spelled as the desktop names the module.
    """
    flat_inputs = {str(key): _text(value) for key, value in inputs.items()}
    module = flat_inputs.get(KEY_MODULE) or module_id
    flat_inputs[KEY_MODULE] = WEB_MODULE_NAMES.get(module, module)
    return yaml.dump(flat_inputs, Dumper=_NoAliasDumper, default_flow_style=False, allow_unicode=True, sort_keys=True)


def serialize_osi(payload: Dict[str, Any]) -> str:
    return _to_flat_yaml(payload.get("module_id") or "", payload.get("inputs") or {})


class _StringSafeLoader(yaml.SafeLoader):
    """SafeLoader that keeps every plain scalar a string.

    .osi values are strings (desktop quotes numbers, the web writes them bare), so
    `No`, `08` or `1.0` must not become a bool, int or float. Only an empty plain
    value (`Key:`) still resolves to null.
    """


_StringSafeLoader.yaml_implicit_resolvers = {}
_StringSafeLoader.add_implicit_resolver("tag:yaml.org,2002:null", re.compile(r"^$"), [""])


def _parse_flat_yaml(text: str) -> Dict[str, Any]:
    """Read the flat `.osi` YAML written by desktop Osdag and by the web app.

    Keys stay flat and dotted (`Bolt.Diameter`). Values are strings or lists of
    strings. Anchors and aliases (`&id001` / `*id001`, which PyYAML writes when the
    same list occurs twice) are resolved, so each key gets its own copy of the list.
    An empty value becomes an empty list.
    """
    data = yaml.load(text, Loader=_StringSafeLoader)
    if not isinstance(data, dict):
        raise ValueError("Malformed OSI file")

    flat_inputs: Dict[str, Any] = {}
    for key, value in data.items():
        if value is None:
            value = []
        elif isinstance(value, list):
            value = ["" if item is None else str(item) for item in value]
        flat_inputs[str(key)] = value
    return flat_inputs


def parse_osi(text: str) -> Tuple[str, str, Dict[str, Any]]:
    """Read an `.osi` file into (module id, name, design dictionary).

    The design dictionary is the file's keys and values as written (core keys such as
    `Bolt.Diameter`); the frontend reads it with each module's declared `coreKeys`.
    """
    # Try modern JSON first
    try:
        data = json.loads(text)
        version = data.get("version")
        if version not in SUPPORTED_VERSIONS:
            raise ValueError("Unsupported OSI version")
        name = data.get("name")
        module_id = data.get("module_id")
        inputs = data.get("inputs")
        if not name or not validate_module_id(module_id) or not isinstance(inputs, dict):
            raise ValueError("Malformed OSI payload")
        return module_id, name, inputs
    except Exception:
        # Fallback to flat YAML
        flat_inputs = _parse_flat_yaml(text)
        module_id = flat_inputs.get(KEY_MODULE) or flat_inputs.get("module") or ""

        if not module_id:
            raise ValueError("Module missing in OSI")
        module_id = DESKTOP_MODULE_NAMES.get(module_id, module_id)

        name = flat_inputs.get("name") or module_id
        return module_id, name, flat_inputs


def make_osifile_contentfile(payload: Dict[str, Any]) -> ContentFile:
    content = serialize_osi(payload)
    return ContentFile(content.encode("utf-8"))


