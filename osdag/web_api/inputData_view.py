from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser

# importing models
from osdag.models import Columns, Beams, Bolt, Bolt_fy_fu, Material, CustomMaterials
from osdag.models import Design

from .inputdata.fin_plate_input import FinPlateInputData
from .inputdata.cleat_angle_input import CleatAngleInputData
from .inputdata.end_plate_input import EndPlateInputData
from .inputdata.seated_angle_input import SeatedAngleInputData
from .inputdata.cover_plate_bolted_input import CoverPlateBoltedInputData
from .inputdata.beam_beam_end_plate_input import BeamBeamEndPlateInputData
from .inputdata.cover_plate_weld_input import CoverPlateWeldedInputData
from .inputdata.beam_to_column_end_plate_input import BeamToColumnEndPlateInputData

INPUT_DATA_FACTORY = {
    'Fin-Plate-Connection': FinPlateInputData(),
    'Cleat-Angle-Connection': CleatAngleInputData(),
    'End-Plate-Connection': EndPlateInputData(),
    'Seated-Angle-Connection': SeatedAngleInputData(),
    'Cover-Plate-Bolted-Connection': CoverPlateBoltedInputData(),
    'Beam-Beam-End-Plate-Connection': BeamBeamEndPlateInputData(),
    'Cover-Plate-Welded-Connection': CoverPlateWeldedInputData(),
    'Beam-to-Column-End-Plate-Connection': BeamToColumnEndPlateInputData()
}


class InputData(APIView):

    """
    method : GET 
    format : Query parameters : 
        moduleName = <String>
        connectivity = <String>
        boltDiameter = <String> ( Optional query )
        propertyClass = <String> ( Optional query )

    Example : 
        moduleName = Fin Plate Connection
        connectivity = Beam-Beam
        boltDiameter = Customized 
        propertyClass = Customized
        thickness = Customized

    Example URL would look like this : 
        1. http://127.0.0.1:8000/populate?moduleName=Fin-Plate-Connection&connectivity=Column-Flange-Beam-Web
        2. http://127.0.0.1:8000/populate?moduleName=Fin-Plate-Connection&boltDiameter=Customized
        3. http://127.0.0.1:8000/populate?moduleName=Fin-Plate-Connection&propertyClass=Customized
        4. http://127.0.0.1:8000/populate?moduleName=Fin-Plate-Connection&connectivity=Column-Web-Beam-Web
        5. http://127.0.0.1:8000/populate?moduleName=Fin-Plate-Connection
        6. http://127.0.0.1:8000/populate?moduleName=Fin-Plate-Connection&thickness=Customized

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
        cookie_id = None
        
        if moduleName is not None:
            print(moduleName)
        else:
            print("module not found")
        print(moduleName)
        
        # cookie_id = request.COOKIES.get('fin_plate_connection_session')
        
        if(moduleName=='Fin-Plate-Connection'):
            cookie_id = request.COOKIES.get('fin_plate_connection_session')
            print('cookie_id inside input data: ' , cookie_id)

        elif(moduleName=='Cleat-Angle-Connection'):
            cookie_id=request.COOKIES.get('cleat_angle_connection_session')
            print('cookie_id inside input data: ' , cookie_id)
            
        elif(moduleName=='End-Plate-Connection'):
            cookie_id = request.COOKIES.get('end_plate_connection_session')
            print('cookie_id inside end plate input data: ' , cookie_id)
            
        elif(moduleName=="Seated-Angle-Connection"):
            cookie_id = request.COOKIES.get('seated_angle_connection')
            print('cookie id in seated angle connection input data ', cookie_id)
            
        elif(moduleName=='Cover-Plate-Bolted-Connection'):
            cookie_id = request.COOKIES.get('cover_plate_bolted_connection_session')
            print('cookie id in cover plate bolted connection input data ', cookie_id)
            
        elif(moduleName=='Beam-Beam-End-Plate-Connection'):
            cookie_id = request.COOKIES.get('beam_beam_end_plate_connection_session')
            print('cookie id in beam beam bolted connection input data ', cookie_id)

        elif(moduleName=='Cover-Plate-Welded-Connection'):
            cookie_id = request.COOKIES.get('cover_plate_welded_connection_session')
            print('cookie id in cover plate welded connection input data ', cookie_id)
            
        elif(moduleName=='Beam-to-Column-End-Plate-Connection'):
            cookie_id = request.COOKIES.get('beam_to_column_end_plate_connection_session')
            print('cookie id in beam to column end plate connection input data ', cookie_id)

        if cookie_id == None or cookie_id == '': # Error Checking: If design session id provided.
            return Response("Error: Please open module", status=status.HTTP_400_BAD_REQUEST) # Returns error response.
        if not Design.objects.filter(cookie_id=cookie_id).exists(): # Error Checking: If design session exists.
            print('The design session does not exists')
            return Response("Error: This design session does not exist", status = status.HTTP_404_NOT_FOUND) # Return error response.

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