from .input_data_base import InputDataBase
from rest_framework import status
from rest_framework.response import Response
from osdag.models import Angles, Channels,  Beams, Material, Bolt, Bolt_fy_fu, CustomMaterials

class TensionMemberBoltedInputData(InputDataBase):
    def process(self, **kwargs):
        email = kwargs.get("email")

        print("Processing Tension Member Bolted Input Data - Complete Dataset")

        # Always return ALL data needed for this module
        response = {}

        # Materials
        materialList = list(Material.objects.all().values())
        if email:
            custom_material = list(CustomMaterials.objects.filter(email=email).values())
            materialList += custom_material
        materialList.append({"id": -1, "Grade": 'Custom'})
        response['materialList'] = materialList

        # Section profiles
        response['sectionProfileList'] = [
            "Angles",
            "Back to Back Angles", 
            "Star Angles",
            "Channels"
        ]

        # Angles and Channels
        response['angleList'] = list(Angles.objects.values_list('Designation', flat=True))
        response['channelList'] = list(Channels.objects.values_list('Designation', flat=True))

        # Bolts
        boltList = list(Bolt.objects.values_list('Bolt_diameter', flat=True))
        boltList.sort()
        response['boltDiameterList'] = boltList

        # Designation
        response['sectionDesignation'] = ['20 x 20 x 3', '20 x 20 x 4', '25 x 25 x 3', '25 x 25 x 4', '25 x 25 x 5', '30 x 30 x 3', '30 x 30 x 4', '30 x 30 x 5', '35 x 35 x 3', '35 x 35 x 4', '35 x 35 x 5', '35 x 35 x 6', '40 x 40 x 3', '40 x 40 x 4', '40 x 40 x 5', '40 x 40 x 6', '45 x 45 x 3', '45 x 45 x 4', '45 x 45 x 5', '45 x 45 x 6', '50 x 50 x 3', '50 x 50 x 4', '50 x 50 x 5', '50 x 50 x 6', '55 x 55 x 4', '55 x 55 x 5', '55 x 55 x 6', '55 x 55 x 8', '60 x 60 x 4', '60 x 60 x 5', '60 x 60 x 6', '60 x 60 x 8', '65 x 65 x 4', '65 x 65 x 5', '65 x 65 x 6', '65 x 65 x 8', '70 x 70 x 5', '70 x 70 x 6', '70 x 70 x 8', '70 x 70 x 10', '75 x 75 x 5', '75 x 75 x 6', '75 x 75 x 8', '75 x 75 x 10', '80 x 80 x 6', '80 x 80 x 8', '80 x 80 x 10', '80 x 80 x 12', '90 x 90 x 6', '90 x 90 x 8', '90 x 90 x 10', '90 x 90 x 12', '100 x 100 x 6', '100 x 100 x 8', '100 x 100 x 10', '100 x 100 x 12', '110 x 110 x 8', '110 x 110 x 10', '110 x 110 x 12', '110 x 110 x 16', '130 x 130 x 8', '130 x130 x 10', '130 x130 x 12', '130 x130 x 16', '150 x 150 x 10', '150 x 150 x 12', '150 x 150 x 16', '150 x 150 x 20', '200 x 200 x 12', '200 x 200 x 16', '200 x 200 x 20', '200 x 200 x 25', '50 x 50 x 7', '50 x 50 x 8', '55 x 55 x 10', '60 x 60 x 10', '65 x 65 x 10', '70 x 70 x 7', '100 x 100 x 7', '100 x 100 x 15', '120 x 120 x 8', '120 x 120 x 10', '120 x 120 x 12', '120 x 120 x 15', '130 x 130 x 9', '150 x 150 x 15', '150 x 150 x 18', '180 x 180 x 15', '180 x 180 x 18', '180 x 180 x 20', '200 x 200 x 24', '30 x 20 x 3', '30 x 20 x 4', '30 x 20 x 5', '40 x 25 x 3', '40 x 25 x 4', '40 x 25 x 5', '40 x 25 x 6', '45 x 30 x 3', '45 x 30 x 4', '45 x 30 x 5', '45 x 30 x 6', '50 x 30 x 3', '50 x 30 x 4', '50 x 30 x 5', '50 x 30 x 6', '60 x 40 x 5', '60 x 40 x 6', '60 x 40 x 8', '65 x 45 x 5', '65 x 45 x 6', '65 x 45 x 8', '70 x 45 x 5', '70 x 45 x 6', '70 x 45 x 8', '70 x 45 x 10', '75 x 50 x 5', '75 x 50 x 6', '75 x 50 x 8', '75 x 50 x 10', '80 x 50 x 5', '80 x 50 x 6', '80 x 50 x 8', '80 x 50 x 10', '90 x 60 x 6', '90 x 60 x 8', '90 x 60 x 10', '90 x 60 x 12', '100 x 65 x 6', '100 x 65 x 8', '100 x 65 x 10', '100 x 75 x 6', '100 x 75 x 8', '100 x 75 x 10', '100 x 75 x 12', '125 x 75 x 6', '125 x 75 x 8', '125 x 75 x 10', '125 x 95 x 6', '125 x 95 x 8', '125 x 95 x 10', '125 x 95 x 12', '150 x 115 x 8', '150 x 115 x 10', '150 x 115 x 12', '150 x 115 x 16', '200 x 100 x 10', '200 x 100 x 12', '200 x 100 x 16', '200 x 150 x 10', '200 x 150 x 12', '200 x 150 x 16', '200 x 150 x 20', '40 x 20 x 3', '40 x 20 x 4', '40 x 20 x 5', '60 x 30 x 5', '60 x 30 x 6', '60 x 40 x 7', '65 x 50 x 5', '65 x 50 x 6', '65 x 50 x 7', '65 x 50 x 8', '70 x 50 x 5', '70 x 50 x 6', '70 x 50 x 7', '70 x 50 x 8', '75 x 50 x 7', '80 x 40 x 5', '80 x 40 x 6', '80 x 40 x 7', '80 x 40 x 8', '80 x 60 x 6', '80 x 60 x 7', '80 x 60 x 8', '90 x 65 x 6', '90 x 65 x 7', '90 x 65 x 8', '90 x 65 x 10', '100 x 50 x 6', '100 x 50 x 7', '100 x 50 x 8', '100 x 50 x 10', '100 x 65 x 7', '120 x 80 x 8', '120 x 80 x 10', '120 x 80 x 12', '125 x 75 x 12', '135 x 65 x 8', '135 x 65 x 10', '135 x 65 x 12', '150 x 75 x 9', '150 x 75 x 15', '150 x 90 x 10', '150 x 90 x 12', '150 x 90 x 15', '200 x 100 x 15', '200 x 150 x 15', '200 x 150 x 18']

        # Property classes
        response['propertyClassList'] = ['3.6', '4.6', '4.8', '5.6', '5.8', '6.8', '8.8', '9.8', '10.9', '12.9']

        # Thickness
        response['thicknessList'] = [
            '8', '10', '12', '14', '16', '18', '20', '22', '25', '28', '32', '36', '40', '45', '50',
            '56', '63', '75', '80', '90', '100', '110', '120'
        ]

        print("Tension Member Complete Response: ", {k: len(v) if isinstance(v, list) else v for k, v in response.items()})
        return Response(response, status=status.HTTP_200_OK)
