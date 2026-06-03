import json
import re
from datetime import datetime
from typing import Any, Dict, Tuple
from tkinter import messagebox

from django.core.files.base import ContentFile

OSI_SCHEMA_VERSION = "1.0"
SUPPORTED_VERSIONS = {"1.0"}


def validate_module_id(module_id: str) -> bool:
    if not isinstance(module_id, str):
        return False
    # allow letters, numbers, dashes and underscores
    return bool(re.fullmatch(r"[A-Za-z0-9_-]{2,64}", module_id))


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


def _to_flat_yaml(module_id: str, name: str, inputs: Dict[str, Any]) -> str:
    """Render a flat dictionary of inputs into OSI flat YAML with dotted keys."""
    def qt(s: Any) -> str:
        # quote list items as strings in YAML as per standard flat files
        return f"'{str(s)}'"

    flat_inputs = {**inputs}
    
    # Guarantee Module and Version are set
    if "Module" not in flat_inputs and "module" not in flat_inputs:
        flat_inputs["Module"] = module_id
    if "OsdagWeb.Version" not in flat_inputs:
        flat_inputs["OsdagWeb.Version"] = "1.0"

    # Build YAML string manually
    lines: list[str] = []
    
    # Sort keys for deterministic output
    for key in sorted(flat_inputs.keys()):
        if key in ["name", "project_name"]:
            continue
        value = flat_inputs[key]
        if value is None:
            continue
        if isinstance(value, list):
            if len(value) == 0:
                continue
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"- {qt(item)}")
        else:
            if isinstance(value, str) and value.strip() == "":
                continue
            lines.append(f"{key}: {value}")

    return "\n".join(lines) + "\n"


def serialize_osi(payload: Dict[str, Any]) -> str:
    module_id = payload.get("module_id") or ""
    name = payload.get("name") or "project"
    inputs = payload.get("inputs") or {}

    # If payload inputs are already nested, fallback to JSON
    if "dock" in inputs or "pref" in inputs:
        return json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n"

    # Otherwise, serialize as generic flat YAML
    return _to_flat_yaml(module_id, name, inputs)


def _parse_flat_yaml(text: str) -> Dict[str, Any]:
    """Very small YAML reader for the flat format we emit.

    Supports lines like:
      Key: value\n
      Key:\n
      - 'item'\n
    Returns a dict of key -> value (str or list[str]).
    """
    flat_inputs: Dict[str, Any] = {}
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip() != ""]
    i = 0
    while i < len(lines):
        line = lines[i]
        if ":" in line:
            key, after = line.split(":", 1)
            key = key.strip()
            after = after.strip()
            if after == "":
                # list block
                i += 1
                items: list[str] = []
                while i < len(lines) and lines[i].lstrip().startswith("-"):
                    item = lines[i].lstrip()[1:].strip()
                    # strip optional quotes
                    if (item.startswith("'") and item.endswith("'")) or (item.startswith('"') and item.endswith('"')):
                        item = item[1:-1]
                    items.append(item)
                    i += 1
                flat_inputs[key] = items
                continue  # already advanced i
            else:
                # scalar
                val = after
                # strip quotes
                if (val.startswith("'") and val.endswith("'")) or (val.startswith('"') and val.endswith('"')):
                    val = val[1:-1]
                flat_inputs[key] = val
        i += 1
    return flat_inputs


def parse_osi(text: str) -> Tuple[str, str, Dict[str, Any]]:
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
        module_id = flat_inputs.get("Module") or flat_inputs.get("module") or ""

        if not module_id:
            raise ValueError("Module missing in OSI")

        # Simply return the parsed flat dictionary as inputs!
        name = flat_inputs.get("name") or module_id
        return module_id, name, flat_inputs


def make_osifile_contentfile(payload: Dict[str, Any]) -> ContentFile:
    content = serialize_osi(payload)
    return ContentFile(content.encode("utf-8"))


