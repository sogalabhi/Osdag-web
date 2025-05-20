from osdag_api.module_finder import *

developed_modules = [
    "Fin Plate Connection","End Plate Connection","Cleat Angle Connection","Seated Angle Connection","Cover Plate Bolted Connection","Beam Beam End Plate Connection"
]
module_dict = [
    {
        "key": "Fin Plate Connection",
        "image": "/static/images/modules/fin_plate_connection.png",
        "name": "Fin Plate",
        "path": "Connection/Shear Connection"
    },
    {
        "key": "End Plate Connection",
        "image": "/static/images/modules/end_plate_connection.png",
        "name": "End Plate",
        "path": "Connection/Shear Connection"
    },
    {
        "key": "Cleat Angle Connection",
        "image":"/static/images/modules/cleat_angle_connection.png",
        "name":"Cleat Angle",
        "path":"Connection/Shear Connection"
    },
    {
        "key":"Seated Angle Connection",
        "image":"/static/images/modules/seated_angle_connection.png",
        "name":"Seated Angle",
        "path":"Connection/Shear Connection/"
    },
    {
        "key": "Cover Plate Bolted Connection",
        "image":"/static/images/modules/cover_plate_bolted_connection.png",
        "name":"Cover Plate Bolted",
        "path":"Connection/Moment Connection/"
    },
    {
        "key": "Beam Beam End Plate Connection",
        "image":"/static/images/modules/beam_beam_end_plate_connection.png",
        "name":"End Plate",
        "path":"Connection/Moment Connection/"
    }
]