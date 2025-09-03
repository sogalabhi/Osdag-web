from .input_data_base import InputDataBase
from rest_framework import status
from rest_framework.response import Response
from osdag.models import Columns, Beams, Bolt, Material, CustomMaterials

class EndPlateInputData(InputDataBase):
    """
    Provides all necessary initial data for the End Plate Connection module in a single API call.
    """
    def process(self, **kwargs):
        # Safely get the email parameter
        email = kwargs.get("email")

        print("Processing End Plate Input Data - Complete Dataset")

        response = {}

        try:
            # 1. Connectivity and Bolt Type (Static Lists)
            response['connectivityList'] = ['Column Flange-Beam-Web', 'Column Web-Beam-Web', 'Beam-Beam']
            response['boltTypeList'] = ['Bearing Bolt', 'Friction Grip Bolt']

            # 2. Sections (From Database)
            response['columnList'] = list(Columns.objects.values_list('Designation', flat=True))
            response['beamList'] = list(Beams.objects.values_list('Designation', flat=True))

            # 3. Materials (From Database, with custom logic)
            material_list = list(Material.objects.all().values())
            if email:
                custom_materials = list(CustomMaterials.objects.filter(email=email).values())
                material_list.extend(custom_materials)
            material_list.append({"id": -1, "Grade": 'Custom'})
            response['materialList'] = material_list

            # 4. Bolt Properties (Database and Static)
            bolt_diameters = sorted(list(Bolt.objects.values_list('Bolt_diameter', flat=True)))
            response['boltDiameterList'] = bolt_diameters
            response['propertyClassList'] = ['3.6', '4.6', '4.8', '5.6', '5.8', '6.8', '8.8', '9.8', '10.9', '12.9']

            # 5. Plate Thickness (Static List)
            response['thicknessList'] = [
                '8', '10', '12', '14', '16', '18', '20', '22', '25', '28', '32', '36', '40', '45', '50',
                '56', '63', '75', '80', '90', '100', '110', '120'
            ]
            
            print(f"End Plate Complete Response: Generated {len(response)} data lists.")
            return Response(response, status=status.HTTP_200_OK)

        except Exception as e:
            # Log the actual error for easier debugging
            print(f"ERROR in EndPlateInputData handler: {e}")
            return Response({"error": "A server error occurred while fetching module data."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)