from rest_framework.response import Response
from rest_framework import status

# DB Models
from osdag.models import Columns, Beams, Material, CustomMaterials


class CompressionMemberInputData:
    def process(self, email=None, **kwargs):
        print(" Processing Compression Member Input Data")

        response = {}

        try:
            # ------------------------------------
            # 1) PROFILE LIST (matches UI)
            # ------------------------------------
            response["profileList"] = [
                "Beams and Columns",
                "RHS and SHS",
                "CHS"
            ]

            # ------------------------------------
            # 2) SECTION LISTS (Columns + Beams)
            # ------------------------------------
            response["columnList"] = list(
                Columns.objects.values_list("Designation", flat=True)
            )

            response["beamList"] = list(
                Beams.objects.values_list("Designation", flat=True)
            )

            # most modules want unified list
            response["sectionList"] = list(
                set(response["columnList"] + response["beamList"])
            )

            # ------------------------------------
            # 3) MATERIAL LIST (IS + Custom)
            # ------------------------------------
            material_list = list(Material.objects.values_list("Grade", flat=True))

            if email:
                custom = list(CustomMaterials.objects.filter(email=email).values_list("Grade", flat=True))
                material_list += custom

            material_list.append("Custom")
            response["materialList"] = material_list

            # ------------------------------------
            # 4) END CONDITION (fixed set)
            # ------------------------------------
            response["endConditionList"] = ["Fixed", "Free", "Hinged", "Roller"]

            print("Compression Member dropdown response ready:")
            print({
                "profileList": len(response["profileList"]),
                "columnList": len(response["columnList"]),
                "beamList": len(response["beamList"]),
                "materialList": len(response["materialList"]),
            })

            return Response(response, status=status.HTTP_200_OK)

        except Exception as err:
            print(f" Error in Compression Member input handler: {err}")
            return Response({"error": "Database error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
