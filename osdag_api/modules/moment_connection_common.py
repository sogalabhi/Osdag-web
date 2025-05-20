from cad.common_logic import CommonDesignLogic
from OCC.Display.backend import *
from Common import *
def setup_for_cad(cdl: CommonDesignLogic, module_class):
    """Sets up the CommonLogicObjct before generating CAD"""
    cdl.module_class = module_class # Set the module class in design logic object.
    module_object = module_class
    if module_object.module == "Beam-to-Beam Cover Plate Bolted Connection": # If module is cover plate bolted then'.
        cdl.CPObj = cdl.createBBCoverPlateCAD() # IDK what this does, I guess it creates the connection object.
    if module_object.module == "Beam-to-Beam End Plate Connection":
        cdl.CPObj = cdl.createBBEndPlateCAD()