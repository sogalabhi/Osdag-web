from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser

# importing models
from apps.core.models import Columns, Beams, Bolt, Bolt_fy_fu, Material, CustomMaterials
from apps.core.models import Design

from apps.core.api.legacy.inputdata.fin_plate_input import FinPlateInputData
from apps.core.api.legacy.inputdata.cleat_angle_input import CleatAngleInputData
from apps.core.api.legacy.inputdata.end_plate_input import EndPlateInputData
from apps.core.api.legacy.inputdata.seated_angle_input import SeatedAngleInputData
from apps.core.api.legacy.inputdata.cover_plate_bolted_input import CoverPlateBoltedInputData
from apps.core.api.legacy.inputdata.beam_beam_end_plate_input import BeamBeamEndPlateInputData
from apps.core.api.legacy.inputdata.cover_plate_weld_input import CoverPlateWeldedInputData
from apps.core.api.legacy.inputdata.beam_to_column_end_plate_input import BeamToColumnEndPlateInputData
from apps.core.api.legacy.inputdata.tension_member_bolted_input import TensionMemberBoltedInputData
from apps.core.api.legacy.inputdata.tension_member_welded_input import TensionMemberWeldedInputData
from apps.core.api.legacy.inputdata.simply_supported_beam_input import SimplySupportedBeamInputData
from apps.core.api.legacy.inputdata.butt_joint_welded_input import ButtJointWeldedInputData
from apps.core.api.legacy.inputdata.butt_joint_bolted_input import ButtJointBoltedInputData
from apps.core.api.legacy.inputdata.lap_joint_welded_input import LapJointWeldedInputData
from apps.core.api.legacy.inputdata.lap_joint_bolted_input import LapJointBoltedInputData

INPUT_DATA_FACTORY = {
    'FinPlateConnection': FinPlateInputData(),
    'CleatAngleConnection': CleatAngleInputData(),
    'EndPlateConnection': EndPlateInputData(),
    'SeatedAngleConnection': SeatedAngleInputData(),
    'Cover-Plate-Bolted-Connection': CoverPlateBoltedInputData(),
    'Beam-Beam-End-Plate-Connection': BeamBeamEndPlateInputData(),
    'Cover-Plate-Welded-Connection': CoverPlateWeldedInputData(),
    'Beam-to-Column-End-Plate-Connection': BeamToColumnEndPlateInputData(),
    'Tension-Member-Bolted-Design': TensionMemberBoltedInputData(),
    'Tension-Member-Welded-Design': TensionMemberWeldedInputData(),
    'Simply-Supported-Beam': SimplySupportedBeamInputData()
}

# Register simple/joint modules that frontend still requests by name
INPUT_DATA_FACTORY.update({
    'Butt-Joint-Welded': ButtJointWeldedInputData(),
    'Butt-Joint-Bolted': ButtJointBoltedInputData(),
    'Lap-Joint-Welded': LapJointWeldedInputData(),
    'Lap-Joint-Bolted': LapJointBoltedInputData(),
})


class InputData(APIView):

    """
    method : GET 
    format : Query parameters : 
        moduleName = <String>
        connectivity = <String>
        boltDiameter = <String> ( Optional query )
        propertyClass = <String> ( Optional query )

    Example : 
        moduleName = FinPlateConnection
        connectivity = Beam-Beam
        boltDiameter = Customized 
        propertyClass = Customized
        thickness = Customized

    Example URL would look like this : 
        1. http://127.0.0.1:8000/populate?moduleName=FinPlateConnection&connectivity=Column-Flange-Beam-Web
        2. http://127.0.0.1:8000/populate?moduleName=FinPlateConnection&boltDiameter=Customized
        3. http://127.0.0.1:8000/populate?moduleName=FinPlateConnection&propertyClass=Customized
        4. http://127.0.0.1:8000/populate?moduleName=FinPlateConnection&connectivity=Column-Web-Beam-Web
        5. http://127.0.0.1:8000/populate?moduleName=FinPlateConnection
        6. http://127.0.0.1:8000/populate?moduleName=FinPlateConnection&thickness=Customized

    """

    def get(self, request):
        email = request.GET.get("email")
        moduleName = request.GET.get("moduleName")
        connectivity = request.GET.get("connectivity")
        boltDiameter = request.GET.get("boltDiameter")
        propertyClass = request.GET.get("propertyClass")
        thickness = request.GET.get('thickness')
        angleList = request.GET.get('angleList')
        topAngleList = request.GET.get('topAngleList')
        seatedAngleList = request.GET.get('seatedAngleList')
        
        if moduleName is not None:
            print(f"Processing request for module: {moduleName}")
        else:
            print("module not found")
            return Response({"error": "Module name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if (not (moduleName in INPUT_DATA_FACTORY)):
            return Response({"error": "Bad Query Parameter (input data view)"}, status=status.HTTP_400_BAD_REQUEST)        
        print("///////////////////////////////////////// ", email)

        input_data_handler = INPUT_DATA_FACTORY.get(moduleName)
        return input_data_handler.process(
            connectivity = connectivity,
            boltDiameter = boltDiameter,
            propertyClass = propertyClass,
            thickness = thickness,
            angleList = angleList,
            seatedAngleList = seatedAngleList,
            topAngleList = topAngleList,
            email = email
        )


class DesignView(APIView):

    parser_classes = [JSONParser]

    """
    Endpoint : http://127.0.0.1:8000/design

    format : 
        {
            "data" : ...
        }

    method : POST
    Content-Type : application/JSON
    """

    def post(self, request):

        try:
            data = request.data

            # print('data : ', data)

            return Response({'success': 'Request made successfully'}, status=status.HTTP_200_OK)

        except:
            return Response({'error': 'Something went wrong'}, status=status.HTTP_400_BAD_REQUEST)
