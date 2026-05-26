from celery import shared_task
import logging

logger = logging.getLogger(__name__)


def get_service_class(module_name: str, submodule_slug: str):
    """
    Helper to resolve the ServiceClass based on parent module and submodule slug.
    """
    if module_name == 'shear-connection':
        from apps.modules.shear_connection.registry import ShearConnectionRegistry
        return ShearConnectionRegistry.get_service_by_slug(submodule_slug)
    elif module_name == 'moment-connection':
        from apps.modules.moment_connection.registry import MomentConnectionRegistry
        return MomentConnectionRegistry.get_service_by_slug(submodule_slug)
    elif module_name == 'simple-connection':
        from apps.modules.simple_connection.registry import SimpleConnectionRegistry
        return SimpleConnectionRegistry.get_service_by_slug(submodule_slug)
    elif module_name == 'tension-member':
        from apps.modules.tension_member.registry import TensionMemberRegistry
        return TensionMemberRegistry.get_service_by_slug(submodule_slug)
    elif module_name == 'flexure-member':
        from apps.modules.flexure_member.registry import FlexureMemberRegistry
        return FlexureMemberRegistry.get_service_by_slug(submodule_slug)
    elif module_name in ('compression-member', 'Compression-Member-Design'):
        from apps.modules.compression_member.registry import CompressionMemberRegistry
        return CompressionMemberRegistry.get_service_by_slug(submodule_slug)
    elif module_name == 'base-plate':
        from apps.modules.base_plate.service import BasePlateService
        return BasePlateService
    else:
        raise ValueError(f"Unknown parent module: {module_name}")


def get_create_from_input_func(module_name: str, submodule_slug: str):
    """
    Helper to resolve the create_from_input function for CAD hover_dict generation.
    """
    try:
        if module_name == 'shear-connection':
            slug_clean = submodule_slug.replace('-', '_')
            mod = __import__(f"apps.modules.shear_connection.submodules.{slug_clean}.adapter", fromlist=["create_from_input"])
            return getattr(mod, "create_from_input", None)
        elif module_name == 'moment-connection':
            slug_clean = submodule_slug.replace('-', '_')
            mod = __import__(f"apps.modules.moment_connection.submodules.{slug_clean}.adapter", fromlist=["create_from_input"])
            return getattr(mod, "create_from_input", None)
        elif module_name == 'simple-connection':
            slug_clean = submodule_slug.replace('-', '_')
            mod = __import__(f"apps.modules.simple_connection.submodules.{slug_clean}.adapter", fromlist=["create_from_input"])
            return getattr(mod, "create_from_input", None)
        elif module_name == 'tension-member':
            slug_clean = submodule_slug.replace('-', '_')
            mod = __import__(f"apps.modules.tension_member.submodules.{slug_clean}.adapter", fromlist=["create_from_input"])
            return getattr(mod, "create_from_input", None)
        elif module_name == 'flexure-member':
            slug_clean = submodule_slug.replace('-', '_')
            mod = __import__(f"apps.modules.flexure_member.submodules.{slug_clean}.adapter", fromlist=["create_from_input"])
            return getattr(mod, "create_from_input", None)
        elif module_name in ('compression-member', 'Compression-Member-Design'):
            slug_clean = submodule_slug.replace('-', '_')
            mod = __import__(f"apps.modules.compression_member.submodules.{slug_clean}.adapter", fromlist=["create_from_input"])
            return getattr(mod, "create_from_input", None)
        elif module_name == 'base-plate':
            from apps.modules.base_plate.adapter import create_from_input
            return create_from_input
    except Exception as e:
        logger.warning(f"Could not dynamically import create_from_input for {module_name}/{submodule_slug}: {e}")
    return None


@shared_task
def healthcheck_task():
    return {"status": "ok", "worker": "celery"}


@shared_task(bind=True)
def run_design_calculation_task(self, module_name: str, submodule_slug: str, inputs: dict, project_id=None, user_email=None):
    """
    Celery task to run CPU-bound connection design calculations.
    """
    logger.info(f"Starting calculation task: {module_name}/{submodule_slug} (Task ID: {self.request.id})")
    
    ServiceClass = get_service_class(module_name, submodule_slug)
    if not ServiceClass:
        raise ValueError(f"Service class for {module_name}/{submodule_slug} not found")
        
    result = ServiceClass.calculate(
        inputs=inputs,
        request=None,
        project_id=project_id,
        user_email=user_email
    )
    
    return result


@shared_task(bind=True)
def run_cad_generation_task(self, module_name: str, submodule_slug: str, inputs: dict, sections: list):
    """
    Celery task to generate CAD models.
    """
    logger.info(f"Starting CAD generation task: {module_name}/{submodule_slug} (Task ID: {self.request.id})")
    
    ServiceClass = get_service_class(module_name, submodule_slug)
    if not ServiceClass:
        raise ValueError(f"Service class for {module_name}/{submodule_slug} not found")
        
    create_from_input_func = get_create_from_input_func(module_name, submodule_slug)
    
    from apps.core.utils.cad_helpers import generate_cad_models
    result = generate_cad_models(
        service_class=ServiceClass,
        inputs=inputs,
        sections=sections,
        session_id=self.request.id,
        create_from_input_func=create_from_input_func
    )
    
    return result


@shared_task(bind=True)
def run_report_generation_task(self, mapped_data: dict):
    """
    Celery task to build initial reports.
    """
    logger.info(f"Starting report generation task (Task ID: {self.request.id})")
    
    from apps.core.api.design.report_customization_api import generate_initial_report_core
    payload, status_code = generate_initial_report_core(mapped_data)
    
    return {
        "payload": payload,
        "status_code": status_code
    }
