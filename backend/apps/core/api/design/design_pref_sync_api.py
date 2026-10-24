"""
POST /api/design-preferences/sync/

Design preference sync for web.
"""
from apps.core.permissions import IsEmailVerifiedIfAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.core.api.design.sync_merge import lookup_sources, merge_design_pref_sync, VALID_OPERATIONS
from apps.core.osdag_overrides import user_id_from_request, user_rows


class DesignPreferenceSync(APIView):
    permission_classes = [IsEmailVerifiedIfAuthenticated]

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        module_session_name = body.get("module_session_name") or body.get("module") or ""
        inputs = body.get("inputs") or {}
        design_pref_draft = body.get("design_pref_draft")
        operation = (body.get("operation") or "open").strip().lower()
        if operation not in VALID_OPERATIONS:
            return Response(
                {"error": "Invalid operation", "valid": list(VALID_OPERATIONS)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not module_session_name:
            return Response(
                {"error": "module_session_name is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # osdag_core computes some defaults from the selected material, so it must see custom rows too.
            with user_rows(user_id_from_request(request)):
                resolved_inputs, meta, material_details, section_details = merge_design_pref_sync(
                    module_session_name=module_session_name,
                    inputs=inputs,
                    operation=operation,
                    design_pref_draft=design_pref_draft,
                    **lookup_sources(request.user),
                )
        except Exception as e:
            return Response(
                {"error": str(e), "success": False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "success": True,
                "resolved_inputs": resolved_inputs,
                "metadata": meta,
                "material_details": material_details,
                "section_details": section_details,
                "version": 1,
            },
            status=status.HTTP_200_OK,
        )
