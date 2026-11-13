"""The output dock of a module before any design has run."""
import importlib
import logging

from django.http import Http404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.tasks import get_service_class
from apps.core.utils.output_layout import build_output_layout

logger = logging.getLogger(__name__)


def fresh_module(family, slug):
    """A new, unsolved instance of the module's design class, or None when it has no adapter for one."""
    service_class = get_service_class(family, slug)
    if service_class is None:
        return None
    adapter = importlib.import_module(service_class.__module__.rsplit(".", 1)[0] + ".adapter")
    create_module = getattr(adapter, "create_module", None)
    return create_module() if create_module else None


class OutputLayoutView(APIView):
    """GET /api/modules/<family>/<slug>/output-layout/

    The sections and fields the desktop app builds when the module opens: `output_values(False)`
    with empty values, every field visible, and buttons without popups. The base plate has no
    slug under its family.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, family, slug=None):
        module = fresh_module(family, slug or family)
        if module is None:
            raise Http404
        return Response(build_output_layout(module, False, {}))
