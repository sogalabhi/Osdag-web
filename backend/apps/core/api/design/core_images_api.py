"""Serves the engine's popup images (osdag_core/data/ResourceFiles/images) to the output dock."""
import mimetypes
import re

from django.http import FileResponse, Http404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.core.utils.output_layout import CORE_IMAGES_DIR

# Letters, digits, underscore, hyphen, dot and space, ending in an image extension.
_IMAGE_NAME = re.compile(r"[A-Za-z0-9_. -]+\.(png|jpg|jpeg|svg)", re.IGNORECASE)
_CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
}
_CACHE_CONTROL = "public, max-age=2592000"


class CoreImageView(APIView):
    """GET /api/core-images/<name>: a file directly inside the engine's images folder."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def get(self, request, name):
        if not _IMAGE_NAME.fullmatch(name):
            raise Http404
        path = (CORE_IMAGES_DIR / name).resolve()
        if path.parent != CORE_IMAGES_DIR or not path.is_file():
            raise Http404

        content_type = _CONTENT_TYPES.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0]
        response = FileResponse(open(path, "rb"), content_type=content_type)
        response["Cache-Control"] = _CACHE_CONTROL
        response["X-Content-Type-Options"] = "nosniff"
        return response
