from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.core.models import Material, CustomMaterials
from apps.core.serializers import CustomMaterials_Serializer


def _grade_conflict(user, grade, exclude_pk=None):
    """Message if `grade` clashes with the catalog or another of the user's materials, else None."""
    # A custom row named like a catalog grade would silently replace it in this user's designs.
    if Material.objects.filter(Grade=grade).exists():
        return "This grade already exists in the standard catalog"
    qs = CustomMaterials.objects.filter(user=user, Grade=grade)
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    if qs.exists():
        return "The material already exists"
    return None


class MaterialDetails(APIView):

    def get(self, request):
        material = request.GET.get("material")
        material_qs = Material.objects.all()
        if material:
            material_qs = material_qs.filter(Grade=material)
        material_details = list(material_qs.values())

        custom_materials = []
        if hasattr(request, "user") and request.user.is_authenticated:
            custom_materials = list(
                CustomMaterials.objects.filter(user=request.user).values()
            )

        # Same ordering as module `options` `material_list()`: standard, then custom, then sentinel.
        material_list = material_details + custom_materials + [{"id": -1, "Grade": "Custom"}]

        return Response(
            {
                "materialList": material_list,
                "material_details": material_details,
                "custom_materials": custom_materials,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        materialName = request.data.get("materialName")
        fy_20 = request.data.get("fy_20")
        fy_20_40 = request.data.get("fy_20_40")
        fy_40 = request.data.get("fy_40")
        fu = request.data.get("fu")

        if not (hasattr(request, "user") and request.user.is_authenticated):
            return Response({"message": "Authentication required", "success": False}, status=401)

        conflict = _grade_conflict(request.user, materialName)
        if conflict:
            return Response({"message": conflict, "success": False}, status=403)

        serializer = CustomMaterials_Serializer(data={
            "user": request.user.id,
            "Grade": materialName,
            "Yield_Stress_less_than_20": fy_20,
            "Yield_Stress_between_20_and_neg40": fy_20_40,
            "Yield_Stress_greater_than_40": fy_40,
            "Ultimate_Tensile_Stress": fu,
            "Elongation": 0,
        })


        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Material added successfuly", "success": True}, status=201)
        else:
            print('serializer.errors : ', serializer.errors)
        return Response({"message": "Something went wrong", "success": True}, status=500)

    def delete(self, request, material_id=None):
        if not (hasattr(request, "user") and request.user.is_authenticated):
            return Response({"message": "Authentication required", "success": False}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not material_id:
            material_id = request.query_params.get("id")
            
        if not material_id:
            return Response({"message": "Material ID is required", "success": False}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            material = CustomMaterials.objects.get(id=material_id, user=request.user)
            material.delete()
            return Response({"message": "Material deleted successfully", "success": True}, status=status.HTTP_200_OK)
        except CustomMaterials.DoesNotExist:
            return Response({"message": "Material not found or access denied", "success": False}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, material_id=None):
        if not (hasattr(request, "user") and request.user.is_authenticated):
            return Response({"message": "Authentication required", "success": False}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not material_id:
            material_id = request.data.get("id") or request.query_params.get("id")
            
        if not material_id:
            return Response({"message": "Material ID is required", "success": False}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            material = CustomMaterials.objects.get(id=material_id, user=request.user)
            new_grade = request.data.get("Grade", material.Grade)
            if new_grade != material.Grade:
                conflict = _grade_conflict(request.user, new_grade, exclude_pk=material.pk)
                if conflict:
                    return Response({"message": conflict, "success": False}, status=403)
            material.Grade = new_grade
            material.Yield_Stress_less_than_20 = request.data.get("Yield_Stress_less_than_20", material.Yield_Stress_less_than_20)
            material.Yield_Stress_between_20_and_neg40 = request.data.get("Yield_Stress_between_20_and_neg40", material.Yield_Stress_between_20_and_neg40)
            material.Yield_Stress_greater_than_40 = request.data.get("Yield_Stress_greater_than_40", material.Yield_Stress_greater_than_40)
            material.Ultimate_Tensile_Stress = request.data.get("Ultimate_Tensile_Stress", material.Ultimate_Tensile_Stress)
            material.Elongation = request.data.get("Elongation", material.Elongation)
            material.save()
            
            serializer = CustomMaterials_Serializer(material)
            return Response({"message": "Material updated successfully", "success": True, "data": serializer.data}, status=status.HTTP_200_OK)
        except CustomMaterials.DoesNotExist:
            return Response({"message": "Material not found or access denied", "success": False}, status=status.HTTP_404_NOT_FOUND)