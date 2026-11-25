"""
Dynamic Module Finder - Auto-discovers modules from parent module registries
Replaces the old osdag_api/module_finder.py with registry-based discovery
"""
import importlib
import inspect
from typing import Any, Callable, Dict, List, Optional, Protocol
from types import ModuleType


class ModuleApiType(Protocol):
    """Protocol for module API interface (backward compatibility)"""
    
    def validate_input(self, input_values: Dict[str, Any]) -> None:
        """Validate type for all values in design dict. Raise error when invalid"""
        pass
    
    def get_required_keys(self) -> List[str]:
        """Return all required input parameters for the module"""
        pass
    
    def create_module(self) -> Any:
        """Create an instance of the module design class and set it up for use"""
        pass
    
    def create_from_input(self, input_values: Dict[str, Any]) -> Any:
        """Create an instance of the module design class from input values."""
        pass
    
    def generate_output(self, input_values: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate, format and return the output values from the given input values.
        Output format (json): {
            "Bolt.Pitch": {
                "key": "Bolt.Pitch",
                "label": "Pitch Distance (mm)",
                "value": 40
            }
        }
        """
        pass
    
    def create_cad_model(
        self,
        input_values: Dict[str, Any],
        section: str,
        session: str,
        export_formats: Optional[List[str]] = None,
    ) -> str:
        """Generate the CAD model from input values as a BREP file. Return file path."""
        pass


def _accepts_keyword(func: Callable[..., Any], name: str) -> bool:
    """True when `func` can be called with the keyword argument `name`."""
    parameters = inspect.signature(func).parameters.values()
    return any(
        p.kind is inspect.Parameter.VAR_KEYWORD
        or (p.name == name and p.kind in (inspect.Parameter.POSITIONAL_OR_KEYWORD, inspect.Parameter.KEYWORD_ONLY))
        for p in parameters
    )


class ModuleApiAdapter:
    """
    Adapter class that wraps adapter module functions to provide ModuleApiType interface
    This allows backward compatibility with code that expects the old module API
    """
    
    def __init__(self, adapter_module: ModuleType):
        """
        Initialize adapter with the adapter module
        
        Args:
            adapter_module: The adapter module (e.g., apps.modules.shear_connection.submodules.fin_plate.adapter)
        """
        self._adapter = adapter_module
    
    def validate_input(self, input_values: Dict[str, Any]) -> None:
        """Delegate to adapter's validate_input function"""
        return self._adapter.validate_input(input_values)
    
    def get_required_keys(self) -> List[str]:
        """Delegate to adapter's get_required_keys function"""
        return self._adapter.get_required_keys()
    
    def create_module(self) -> Any:
        """Delegate to adapter's create_module function"""
        return self._adapter.create_module()
    
    def create_from_input(self, input_values: Dict[str, Any]) -> Any:
        """Delegate to adapter's create_from_input function"""
        return self._adapter.create_from_input(input_values)
    
    def generate_output(self, input_values: Dict[str, Any]) -> Dict[str, Any]:
        """Delegate to adapter's generate_output function"""
        return self._adapter.generate_output(input_values)
    
    def create_cad_model(
        self,
        input_values: Dict[str, Any],
        section: str,
        session: str,
        export_formats: Optional[List[str]] = None,
    ) -> str:
        """Delegate to adapter's create_cad_model function, once.

        `export_formats` is passed only to adapters whose function declares it. The signature is
        read up front, so a TypeError raised while the model is being built is not mistaken for
        a signature mismatch and the (expensive) build is never run a second time.
        """
        build = self._adapter.create_cad_model
        if _accepts_keyword(build, "export_formats"):
            return build(input_values, section, session, export_formats=export_formats)
        return build(input_values, section, session)


# Global module dictionary - auto-populated on import
_module_dict: Dict[str, ModuleApiType] = {}


def _discover_modules():
    """
    Auto-discover all modules from parent module registries
    Scans apps.modules.*.submodules.* and registers each adapter under the
    MODULE_ID exported by its package
    """
    from pathlib import Path

    # Get the apps/modules directory
    backend_path = Path(__file__).resolve().parent.parent.parent
    modules_path = backend_path / 'apps' / 'modules'

    if not modules_path.exists():
        print("Warning: modules path does not exist:", modules_path)
        return

    # Iterate through all parent module directories
    for parent_module_dir in modules_path.iterdir():
        if not parent_module_dir.is_dir() or parent_module_dir.name.startswith('_'):
            continue

        submodules_path = parent_module_dir / 'submodules'
        if not submodules_path.exists():
            continue

        package_base = f'apps.modules.{parent_module_dir.name}.submodules'

        # Iterate through all sub-module directories
        for submodule_dir in submodules_path.iterdir():
            if not submodule_dir.is_dir() or submodule_dir.name.startswith('_'):
                continue

            if not (submodule_dir / 'adapter.py').exists():
                continue

            package_path = f'{package_base}.{submodule_dir.name}'
            try:
                package = importlib.import_module(package_path)
                adapter_module = importlib.import_module(f'{package_path}.adapter')
            except Exception:
                # Import failed - skip, falls back to the old system
                continue

            module_id = getattr(package, 'MODULE_ID', None)
            if not module_id:
                continue

            _module_dict[module_id] = ModuleApiAdapter(adapter_module)


# Auto-discover modules on import
_discover_modules()


def get_module_api(module_id: str) -> ModuleApiType:
    """
    Return the API adapter for the specified module by MODULE_ID
    Falls back to old osdag_api for modules not yet migrated
    
    Args:
        module_id: The MODULE_ID (e.g., 'Fin Plate Connection', 'Beam-to-Beam End Plate Connection')
    
    Returns:
        ModuleApiType adapter instance
    
    Raises:
        KeyError: If module_id is not found in either new or old system
    """
    # Try new registry-based discovery first
    if module_id in _module_dict:
        return _module_dict[module_id]
    
    # Fall back to old osdag_api for modules not yet migrated
    try:
        from osdag_api.module_finder import get_module_api as old_get_module_api
        return old_get_module_api(module_id)
    except (ImportError, KeyError):
        raise KeyError(
            f"Module '{module_id}' not found. "
            f"Available modules: {list(_module_dict.keys())}"
        )


# Export module_dict for backward compatibility (used by modules_api.py)
module_dict = _module_dict


# For backward compatibility with old imports
# Combine discovered modules with old modules (for modules not yet migrated)
def _get_developed_modules():
    """Get list of all available modules (new + old)"""
    new_modules = list(_module_dict.keys())
    try:
        from osdag_api.module_finder import module_dict as old_module_dict
        old_modules = list(old_module_dict.keys())
        # Combine and deduplicate
        all_modules = list(set(new_modules + old_modules))
        return all_modules
    except ImportError:
        return new_modules

developed_modules = _get_developed_modules()

