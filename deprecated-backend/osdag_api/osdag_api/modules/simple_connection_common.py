from osdag_core.cad.common_logic import CommonDesignLogic  # Changed to osdag_core as ButtJointedBoltedCad is present there.
from OCC.Display.backend import *
from osdag_core.Common import *
def setup_for_cad(cdl: CommonDesignLogic, module_class):
    """Sets up the CommonLogicObjct before generating CAD"""
    print('SETTING UP FOR CAD', module_class)
    cdl.module_class = module_class # Set the module class in design logic object.
    print("******")
    module_object = module_class
    print("********")
    if module_object.module == KEY_DISP_BUTTJOINTBOLTED:
        cdl.ButtJointBoltedObj = cdl.createButtJointBoltedCAD()
    if module_object.module == KEY_DISP_LAPJOINTBOLTED:
        cdl.boltedLapJointObj = cdl.createBoltedLapJoint()