from .input_data_base import InputDataBase
from rest_framework import status
from rest_framework.response import Response
from osdag.models import Columns, Beams, Material, CustomMaterials

class BeamToColumnEndPlateInputData(InputDataBase):
    def process(self, **kwargs):
        connectivity = kwargs.get("connectivity")
        boltDiameter = kwargs.get("boltDiameter")
        propertyClass = kwargs.get("propertyClass") 
        thickness = kwargs.get("thickness")
        email = kwargs.get("email")
        
        if (connectivity is None and boltDiameter is None and propertyClass is None and thickness is None):
            print("\n\n")
            print('inside connectivtityList handling for Beam-to-Column End Plate Connection')
            print("\n\n")
            connectivityList = ['Column-Flange-Beam-Web', 'Column Web-Beam Web']
            response = {
                'connectivityList': connectivityList
            }
            return Response(response, status=status.HTTP_200_OK)
            
        if connectivity in ['Column-Flange-Beam-Web', 'Column Web-Beam Web']:
            try:
                columnList = list(Columns.objects.values_list('Designation', flat=True))
                beamList = list(Beams.objects.values_list('Designation', flat=True))
                
                materialList = list(Material.objects.filter().values())
                if email:
                    custom_material = list(CustomMaterials.objects.filter(email=email).values())
                    materialList = materialList + custom_material
                
                materialList.append({"id": -1, "Grade": 'Custom'})
                
                endPlateTypeList = ['Flushed - Reversible Moment', 
                                  'Extended One Way - Irreversible Moment', 
                                  'Extended Both Ways - Reversible Moment']
                
                response = {
                    'columnList': columnList,
                    'beamList': beamList,
                    'materialList': materialList,
                    'endPlateTypeList': endPlateTypeList
                }
                return Response(response, status=status.HTTP_200_OK)

            except Exception as err:
                print(err)
                return Response({"error": "Bad request"}, status=status.HTTP_400_BAD_REQUEST)

        elif (boltDiameter == 'Customized'):
            try:
                boltList = [
                    '8', '10', '12', '16', '20', '24', '30', '36', '42', '48', '56', '64',
                    '14', '18', '22', '27', '33', '39', '45', '52', '60'
                ]
                boltList.sort(key=int)
                response = {
                    'boltList': boltList
                }
                return Response(response, status=status.HTTP_200_OK)

            except Exception as err:
                print(err)
                return Response({"error": "Something went wrong"}, status=status.HTTP_400_BAD_REQUEST)

        elif (propertyClass == 'Customized'):
            try:
                boltFyFuList = ['3.6', '4.6', '4.8', '5.6', '5.8', '6.8', '8.8', '9.8', '10.9', '12.9']
                response = {
                    'propertyClassList': boltFyFuList
                }
                return Response(response, status=status.HTTP_200_OK)

            except Exception as err:
                print(err)
                return Response({"error": "Something went wrong"}, status=status.HTTP_400_BAD_REQUEST)

        elif (thickness == 'Customized'):
            try:
                PLATE_THICKNESS_SAIL = ['8', '10', '12', '14', '16', '18', '20', '22', '25', '28', '32', '36', '40', '45', '50', '56', '63', '75', '80', '90', '100',
                                    '110', '120']
                response = {
                    'thicknessList': PLATE_THICKNESS_SAIL
                }
                return Response(response, status=status.HTTP_200_OK)

            except Exception as err:
                print(err)
                return Response({'error': 'Something went wrong'}, status=status.HTTP_400_BAD_REQUEST)

        return super().process(**kwargs)