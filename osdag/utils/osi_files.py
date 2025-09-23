import json
import re
from datetime import datetime
from typing import Any, Dict, Tuple

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


def serialize_osi(payload: Dict[str, Any]) -> str:
    # stable key ordering, indent for readability
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def parse_osi(text: str) -> Tuple[str, str, Dict[str, Any]]:
    try:
        data = json.loads(text)
    except Exception as exc:
        raise ValueError(f"Invalid OSI content: {exc}")

    version = data.get("version")
    if version not in SUPPORTED_VERSIONS:
        raise ValueError("Unsupported OSI version")

    name = data.get("name")
    module_id = data.get("module_id")
    inputs = data.get("inputs")

    if not name or not validate_module_id(module_id) or not isinstance(inputs, dict):
        raise ValueError("Malformed OSI payload")

    return module_id, name, inputs


def make_osifile_contentfile(payload: Dict[str, Any]) -> ContentFile:
    content = serialize_osi(payload)
    return ContentFile(content.encode("utf-8"))


