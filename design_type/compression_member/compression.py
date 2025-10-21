"""
Refactored Compression Module for OSDAG
Handles axially loaded column design with separated UI and calculation logic.

This file maintains UI compatibility while delegating calculations to compression_core.
"""

from design_type.member import Member
from Common import *
from utils.common.component import ISection, RHS, CHS, SHS, Material
from utils.common.load import Load
from utils.common.Section_Properties_Calculator import I_sectional_Properties

# Import core calculation module
try:
    from .compression_core import CompressionCalculator, calculate_compression_capacity, validate_input_data
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False
    import logging
    logging.warning("compression_core module not found. Using legacy calculation methods.")


class Compression(Member):
    """
    Compression member (axially loaded column) design class.
    Handles both UI interaction and design calculations.
    """

    def __init__(self):
        """Initialize the Compression class."""
        super().__init__()
        self.module = None
        self.sizelist = None
        self.sec_profile = None
        self.material = None
        self.length_zz = None
        self.length_yy = None
        self.load = None
        self.section_size = None
        self.calculator = None  # Will hold CompressionCalculator instance

  
    # Design Preference Functions (UI-Related)
  

    def tab_list(self):
        """
        Define tabs for design preferences dialog.

        Returns:
            List of tuples defining tab structure:
            (Tab Title, Tab Type, Tab Content Function)
        """
        tabs = []

        t1 = (KEY_DISP_COLSEC, TYPE_TAB_1, self.tab_section)
        tabs.append(t1)

        t5 = ("Design", TYPE_TAB_2, self.design_values)
        tabs.append(t5)

        return tabs

    def tab_value_changed(self):
        """
        Define which values update when design preference values change.

        Returns:
            List of tuples for dynamic value updates
        """
        change_tab = []
        # Currently no dynamic changes needed
        # Add tuples here if values need to update based on other selections
        return change_tab

    def edit_tabs(self):
        """
        Define tabs that change based on connectivity or profile.

        Returns:
            List of tab modifications (empty for this module)
        """
        return []

    def input_dictionary_design_pref(self):
        """
        Define which design preference values to save.

        Returns:
            List of tuples: (Tab Name, Widget Type, List of Keys)
        """
        design_input = []

        t2 = (KEY_DISP_COLSEC, TYPE_COMBOBOX, [KEY_SEC_MATERIAL])
        design_input.append(t2)

        t7 = ("Connector", TYPE_COMBOBOX, [KEY_CONNECTOR_MATERIAL])
        design_input.append(t7)

        return design_input

    def input_dictionary_without_design_pref(self):
        """
        Set default design preference values when not opened by user.

        Returns:
            List of tuples for default value assignment
        """
        design_input = []
        
        t1 = (KEY_MATERIAL, [KEY_SEC_MATERIAL], 'Input Dock')
        design_input.append(t1)

        t2 = (None, [KEY_DP_DESIGN_METHOD], '')
        design_input.append(t2)

        return design_input

    def refresh_input_dock(self):
        """
        Define keys that update in input dock when design preferences change.

        Returns:
            List of tuples for input dock updates
        """
        add_buttons = []

        t2 = (KEY_DISP_COLSEC, KEY_SECSIZE, TYPE_COMBOBOX, KEY_SECSIZE, None, None, "Columns")
        add_buttons.append(t2)

        return add_buttons

    def get_values_for_design_pref(self, key, design_dictionary):
        """
        Get values for design preferences from design dictionary.

        Args:
            key: Key to retrieve value for
            design_dictionary: Current design parameters

        Returns:
            Value for the specified key
        """
        if design_dictionary[KEY_MATERIAL] != 'Select Material':
            fu = Material(design_dictionary[KEY_MATERIAL], 41).fu
        else:
            fu = ''

        val = {
            KEY_DP_DESIGN_METHOD: "Limit State Design"
        }[key]

        return val

    # Input/Output UI Functions

    def module_name(self):
        """Return module display name."""
        return KEY_DISP_COMPRESSION

    def customized_input(self):
        """
        Define customized input widgets.

        Returns:
            List of tuples with custom input handlers
        """
        c_lst = []

        t1 = (KEY_SECSIZE, self.fn_profile_section)
        c_lst.append(t1)

        return c_lst

    def input_values(self):
        """
        Define input dock UI structure.

        Returns:
            List of tuples defining each input field:
            (Key, Display Name, Widget Type, Options/Default, Required, Validator)
        """
        options_list = []

        t1 = (KEY_MODULE, KEY_DISP_COMPRESSION, TYPE_MODULE, None, True, 'No Validator')
        options_list.append(t1)

        t2 = (KEY_SEC_PROFILE, KEY_DISP_SEC_PROFILE, TYPE_COMBOBOX, VALUES_SEC_PROFILE, True, 'No Validator')
        options_list.append(t2)

        t4 = (KEY_SECSIZE, KEY_DISP_SECSIZE, TYPE_COMBOBOX_CUSTOMIZED, ['All', 'Customized'], True, 'No Validator')
        options_list.append(t4)

        t4 = (KEY_MATERIAL, KEY_DISP_MATERIAL, TYPE_COMBOBOX, VALUES_MATERIAL, True, 'No Validator')
        options_list.append(t4)

        t5 = (KEY_LENZZ, KEY_DISP_LENZZ, TYPE_TEXTBOX, None, True, 'No Validator')
        options_list.append(t5)

        t6 = (KEY_LENYY, KEY_DISP_LENYY, TYPE_TEXTBOX, None, True, 'No Validator')
        options_list.append(t6)

        t7 = (None, DISP_TITLE_FSL, TYPE_TITLE, None, True, 'No Validator')
        options_list.append(t7)

        t8 = (KEY_AXIAL, KEY_DISP_AXIAL, TYPE_TEXTBOX, None, True, 'No Validator')
        options_list.append(t8)

        t12 = (KEY_MOMENT_MAJOR, KEY_DISP_MOMENT_MAJOR, TYPE_TEXTBOX, None, True, 'No Validator')
        options_list.append(t12)

        t13 = (KEY_MOMENT_MINOR, KEY_DISP_MOMENT_MINOR, TYPE_TEXTBOX, None, True, 'No Validator')
        options_list.append(t13)

        t9 = (None, DISP_TITLE_SC, TYPE_TITLE, None, True, 'No Validator')
        options_list.append(t9)

        t10 = (KEY_END1, KEY_DISP_END1, TYPE_COMBOBOX, VALUES_END1, True, 'No Validator')
        options_list.append(t10)

        t11 = (KEY_END2, KEY_DISP_END2, TYPE_COMBOBOX, VALUES_END2, True, 'No Validator')
        options_list.append(t11)

        t12 = (KEY_IMAGE, None, TYPE_IMAGE_COMPRESSION, "./ResourceFiles/images/6.RRRR.PNG", True, 'No Validator')
        options_list.append(t12)

        return options_list

    def output_values(self, flag):
        """
        Define output dock structure.

        Args:
            flag: Flag for output configuration

        Returns:
            List of tuples defining output fields
        """
        out_list = []
        
        t1 = (None, DISP_TITLE_TENSION_SECTION, TYPE_TITLE, None, True)
        out_list.append(t1)

        return out_list

  
    # Custom Input Functions
 

    def fn_profile_section(self):
        """
        Return section database based on selected profile.

        Returns:
            Database query results for selected profile type
        """
        profile = self[0]
        
        profile_database = {
            'Beams': "Beams",
            'Columns': "Columns",
            'RHS': "RHS",
            'SHS': "SHS",
            'CHS': "CHS"
        }
        
        db_name = profile_database.get(profile)
        if db_name:
            return connectdb(db_name, call_type="popup")
        return []

    def fn_end1_end2(self):
        """
        Return valid end condition combinations based on first end.

        Returns:
            List of valid end conditions for second end
        """
        end1 = self[0]
        
        end_combinations = {
            'Fixed': VALUES_END2,
            'Free': ['Fixed'],
            'Hinged': ['Fixed', 'Hinged', 'Roller'],
            'Roller': ['Fixed', 'Hinged']
        }
        
        return end_combinations.get(end1, VALUES_END2)

    def fn_end1_image(self):
        """
        Return image path for first end condition.

        Returns:
            Path to image file
        """
        image_map = {
            'Fixed': "./ResourceFiles/images/6.RRRR.PNG",
            'Free': "./ResourceFiles/images/1.RRFF.PNG",
            'Hinged': "./ResourceFiles/images/5.RRRF.PNG",
            'Roller': "./ResourceFiles/images/4.RRFR.PNG"
        }
        
        return image_map.get(self, "./ResourceFiles/images/6.RRRR.PNG")

    def fn_end2_image(self):
        """
        Return image path based on both end conditions.

        Returns:
            Path to image file for end condition combination
        """
        end1 = self[0]
        end2 = self[1]

        image_matrix = {
            'Fixed': {
                'Fixed': "./ResourceFiles/images/6.RRRR.PNG",
                'Free': "./ResourceFiles/images/1.RRFF_rotated.PNG",
                'Hinged': "./ResourceFiles/images/5.RRRF_rotated.PNG",
                'Roller': "./ResourceFiles/images/4.RRFR_rotated.PNG"
            },
            'Free': {
                'Fixed': "./ResourceFiles/images/1.RRFF.PNG"
            },
            'Hinged': {
                'Fixed': "./ResourceFiles/images/5.RRRF.PNG",
                'Hinged': "./ResourceFiles/images/3.RFRF.PNG",
                'Roller': "./ResourceFiles/images/2.FRFR_rotated.PNG"
            },
            'Roller': {
                'Fixed': "./ResourceFiles/images/4.RRFR.PNG",
                'Hinged': "./ResourceFiles/images/2.FRFR.PNG"
            }
        }

        return image_matrix.get(end1, {}).get(end2, "./ResourceFiles/images/6.RRRR.PNG")

    def input_value_changed(self):
        """
        Define which UI elements update when input values change.

        Returns:
            List of tuples defining dynamic UI updates
        """
        lst = []

        t1 = ([KEY_SEC_PROFILE], KEY_SECSIZE, TYPE_COMBOBOX_CUSTOMIZED, self.fn_profile_section)
        lst.append(t1)

        t2 = ([KEY_END1], KEY_END2, TYPE_COMBOBOX, self.fn_end1_end2)
        lst.append(t2)

        t3 = ([KEY_END1, KEY_END2], KEY_IMAGE, TYPE_IMAGE, self.fn_end2_image)
        lst.append(t3)

        return lst

    # Validation and Calculation Functions

    def func_for_validation(self, design_dictionary):
        """
        Validate input values before performing calculations.

        Args:
            design_dictionary: Dictionary containing all input values

        Returns:
            List of error messages (empty if validation passes)
        """
        all_errors = []
        self.design_status = False
        flag = False
        
        # Get input fields
        option_list = self.input_values()
        missing_fields_list = []

        # Check for missing required fields
        for option in option_list:
            if option[2] == TYPE_TEXTBOX:
                if design_dictionary.get(option[0], '') == '':
                    missing_fields_list.append(option[1])
            elif option[2] == TYPE_COMBOBOX and option[0] not in [KEY_SEC_PROFILE, KEY_END1, KEY_END2]:
                val = option[3]
                if design_dictionary.get(option[0]) == val[0]:
                    missing_fields_list.append(option[1])

        if len(missing_fields_list) > 0:
            error = self.generate_missing_fields_error_string(missing_fields_list)
            all_errors.append(error)
        else:
            flag = True

        if flag:
            self.set_input_values(design_dictionary)
        else:
            return all_errors

    def set_input_values(self, design_dictionary):
        """
        Set internal values from design dictionary and initialize calculator.

        Args:
            design_dictionary: Dictionary containing all design parameters
        """
        # Set basic parameters
        self.module = design_dictionary.get(KEY_MODULE)
        self.sizelist = design_dictionary.get(KEY_SECSIZE, [])
        self.sec_profile = design_dictionary.get(KEY_SEC_PROFILE)
        self.material = design_dictionary.get(KEY_SEC_MATERIAL, design_dictionary.get(KEY_MATERIAL))
        self.length_zz = float(design_dictionary.get(KEY_LENZZ, 0))
        self.length_yy = float(design_dictionary.get(KEY_LENYY, 0))
        
        # Create load object
        self.load = Load(
            shear_force="",
            axial_force=design_dictionary.get(KEY_AXIAL, 0),
            moment=design_dictionary.get(KEY_MOMENT_MAJOR, 0),
            moment_minor=design_dictionary.get(KEY_MOMENT_MINOR, 0),
            unit_kNm=True
        )

        # Log parameters
        logger.debug(f"Module: {self.module}")
        logger.debug(f"Profile: {self.sec_profile}")
        logger.debug(f"Material: {self.material}")
        logger.debug(f"Length YY: {self.length_yy} mm")
        logger.debug(f"Length ZZ: {self.length_zz} mm")
        logger.debug(f"Load: {self.load}")

        # Select section (assuming first member as selected size)
        if self.sizelist and len(self.sizelist) > 0:
            selectedsize = self.sizelist[0]
            self.select_section(selectedsize)
            
            # Initialize calculator if core module available
            if CORE_AVAILABLE:
                try:
                    self.calculator = CompressionCalculator(
                        section_profile=self.sec_profile,
                        section_size=selectedsize,
                        material_grade=self.material,
                        length_yy=self.length_yy,
                        length_zz=self.length_zz,
                        load=self.load
                    )
                    logger.info("CompressionCalculator initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize calculator: {e}")

    def select_section(self, selectedsize):
        """
        Create section object based on profile type and size.

        Args:
            selectedsize: Section designation string
        """
        section_map = {
            'RHS': RHS,
            'CHS': CHS,
            'SHS': SHS,
            'Beams': ISection,
            'Columns': ISection
        }

        section_class = section_map.get(self.sec_profile)
        
        if section_class:
            self.section_size = section_class(
                designation=selectedsize,
                material_grade=self.material
            )
            logger.debug(f"Selected section: {self.section_size}")
        else:
            logger.error(f"Unknown section profile: {self.sec_profile}")

    def perform_design_calculations(self):
        """
        Perform compression member design calculations.

        Returns:
            Dictionary containing calculation results
        """
        if CORE_AVAILABLE and self.calculator:
            try:
                results = self.calculator.get_detailed_report()
                logger.info("Design calculations completed successfully")
                return results
            except Exception as e:
                logger.error(f"Calculation error: {e}", exc_info=True)
                return {
                    'status': 'ERROR',
                    'errors': [str(e)],
                    'message': 'Design calculation failed'
                }
        else:
            logger.warning("Calculator not available. Using legacy methods.")
            return {
                'status': 'WARNING',
                'message': 'Core calculation module not available'
            }

    ###############################################
    # 3D Model Functions
    ###############################################

    def get_3d_components(self):
        """
        Return 3D model components for visualization.

        Returns:
            List of 3D components
        """
        components = []
        # Add 3D model generation logic here
        return components

    # Logger Setup

    @staticmethod
    def set_osdaglogger(key):
        """
        Configure logger for compression module.

        Args:
            key: Logger key for custom handler
        """
        global logger
        logger = logging.getLogger('osdag')

        logger.setLevel(logging.DEBUG)
        
        # Console handler
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # File handler
        handler = logging.FileHandler('logging_text.log')
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Custom handler if key provided
        if key is not None:
            handler = OurLog(key)
            formatter = logging.Formatter(
                fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%H:%M:%S'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)


# Initialize logger
logger = logging.getLogger('osdag.compression')

# Helper Functions for Web API

def design_compression_member(design_dict):
    """
    Standalone function for web API to design compression member.
    This is the main entry point for web integration.

    Args:
        design_dict: Dictionary containing design inputs with keys:
            - KEY_SEC_PROFILE: Section profile type
            - KEY_SECSIZE: List of section sizes
            - KEY_MATERIAL or KEY_SEC_MATERIAL: Material grade
            - KEY_LENYY: Effective length about YY axis (mm)
            - KEY_LENZZ: Effective length about ZZ axis (mm)
            - KEY_AXIAL: Axial load (kN)
            - KEY_MOMENT_MAJOR: Major axis moment (kNm) [optional]
            - KEY_MOMENT_MINOR: Minor axis moment (kNm) [optional]

    Returns:
        Dictionary containing:
            - status: 'SUCCESS', 'ERROR', or 'WARNING'
            - results: Calculation results (if successful)
            - errors: List of error messages (if failed)
            - message: Status message

    Example:
        >>> design_dict = {
        ...     'KEY_SEC_PROFILE': 'Columns',
        ...     'KEY_SECSIZE': ['ISMB200'],
        ...     'KEY_MATERIAL': 'Fe250',
        ...     'KEY_LENYY': 3000,
        ...     'KEY_LENZZ': 3000,
        ...     'KEY_AXIAL': 100,
        ...     'KEY_MOMENT_MAJOR': 0,
        ...     'KEY_MOMENT_MINOR': 0
        ... }
        >>> results = design_compression_member(design_dict)
        >>> print(results['status'])
        SUCCESS
    """
    if CORE_AVAILABLE:
        return calculate_compression_capacity(design_dict)
    else:
        # Fallback to class-based approach
        try:
            comp = Compression()
            errors = comp.func_for_validation(design_dict)
            
            if errors:
                return {
                    'status': 'ERROR',
                    'errors': errors,
                    'message': 'Validation failed'
                }
            
            results = comp.perform_design_calculations()
            return results
            
        except Exception as e:
            logger.error(f"Design failed: {e}", exc_info=True)
            return {
                'status': 'ERROR',
                'errors': [str(e)],
                'message': 'Design process failed'
            }


def batch_design_compression_members(design_dicts_list):
    """
    Design multiple compression members in batch.
    Useful for optimization or multi-section analysis.

    Args:
        design_dicts_list: List of design dictionaries

    Returns:
        List of result dictionaries
    """
    results = []
    
    for idx, design_dict in enumerate(design_dicts_list):
        logger.info(f"Processing design {idx + 1}/{len(design_dicts_list)}")
        result = design_compression_member(design_dict)
        result['design_index'] = idx
        results.append(result)
    
    return results