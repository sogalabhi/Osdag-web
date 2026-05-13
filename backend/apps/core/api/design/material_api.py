from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.core.models import Material, CustomMaterials
from apps.core.serializers import CustomMaterials_Serializer


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

        alreadyExists = CustomMaterials.objects.filter(user=request.user, Grade=materialName).exists()
        if alreadyExists:
            return Response({"message": "The material already exists", "success": False}, status=403)

        serializer = CustomMaterials_Serializer(data={
            "user": request.user.id,
            "Grade": materialName,
            "Yield_Stress_less_than_20": fy_20,
            "Yield_Stress_between_20_and_neg40": fy_20_40,
            "Yield_Stress_greater_than_40": fy_40,
            "Ultimate_Tensile_Stress": fu,
        })

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Material added successfuly", "success": True}, status=201)
        else:
            print('serializer.errors : ', serializer.errors)
        return Response({"message": "Something went wrong", "success": True}, status=500)
