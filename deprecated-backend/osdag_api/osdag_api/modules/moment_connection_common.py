<<<<<<< HEAD:osdag_api/modules/moment_connection_common.py
from osdag_core.cad.common_logic import CommonDesignLogic  # Changed to osdag_core as ButtJointedBoltedCad is present there.
=======
from osdag_core.cad.common_logic import CommonDesignLogic
>>>>>>> ddf6b31a8a093ec3a2d9bd13cb922f02324b9393:deprecated-backend/osdag_api/osdag_api/modules/moment_connection_common.py
from OCC.Display.backend import *
from osdag_core.Common import *
def setup_for_cad(cdl: CommonDesignLogic, module_class):
    """Sets up the CommonLogicObjct before generating CAD"""
    print('SETTING UP FOR CAD', module_class)
    cdl.module_class = module_class # Set the module class in design logic object.
    print("******")
    module_object = module_class
    print("********")
    if module_object.module == "Beam-to-Beam-Cover-Plate-Bolted-Connection": # If module is cover plate bolted then'.
        cdl.CPObj = cdl.createBBCoverPlateCAD() # IDK what this does, I guess it creates the connection object.
    if module_object.module == "Beam-to-Beam End Plate Connection":
        cdl.CPObj = cdl.createBBEndPlateCAD()
    if module_object.module == "Beam-to-Beam-Cover-Plate-Welded-Connection":
        cdl.CPObj = cdl.createBBCoverPlateCAD()
    if module_object.module == "Beam-to-Column End Plate Connection":
        cdl.CPObj = cdl.createBCEndPlateCAD() # Initialize the CAD object for beam-column end plate
