"""
Core calculation logic for axially loaded column (compression member) design.
This module contains pure calculation functions independent of UI framework.

Author: Refactored for web integration
Date: October 2025
"""

import logging
from typing import Dict, Any, Optional, List
from utils.common.component import ISection, RHS, CHS, SHS, Material
from utils.common.load import Load

# Setup logger
logger = logging.getLogger('osdag.compression_core')


class CompressionCalculator:
    """
    Core calculator class for compression member design.
    This class handles all structural calculations without UI dependencies.
    """

    def __init__(self, section_profile: str, section_size: str, material_grade: str,
                 length_yy: float, length_zz: float, load: Load):
        """
        Initialize the compression calculator.

        Args:
            section_profile: Profile type ('Beams', 'Columns', 'RHS', 'SHS', 'CHS')
            section_size: Section designation (e.g., 'ISMB200')
            material_grade: Material grade (e.g., 'Fe250', 'Fe410')
            length_yy: Effective length about minor axis (mm)
            length_zz: Effective length about major axis (mm)
            load: Load object containing axial force and moments
        """
        self.section_profile = section_profile
        self.section_size_designation = section_size
        self.material_grade = material_grade
        self.length_yy = length_yy
        self.length_zz = length_zz
        self.load = load
        
        # Initialize section object
        self.section = self._create_section_object()
        
        logger.info(f"Initialized CompressionCalculator: {section_profile} {section_size} {material_grade}")

    def _create_section_object(self):
        """
        Create appropriate section object based on profile type.

        Returns:
            Section object (ISection, RHS, CHS, or SHS)
        """
        section_map = {
            'RHS': RHS,
            'CHS': CHS,
            'SHS': SHS,
            'Beams': ISection,
            'Columns': ISection
        }

        section_class = section_map.get(self.section_profile)
        
        if section_class is None:
            raise ValueError(f"Unknown section profile: {self.section_profile}")

        return section_class(
            designation=self.section_size_designation,
            material_grade=self.material_grade
        )

    def calculate_slenderness_ratio(self) -> Dict[str, float]:
        """
        Calculate slenderness ratios about both axes.

        Returns:
            Dictionary with slenderness ratios for YY and ZZ axes
        """
        # Get radius of gyration
        r_yy = getattr(self.section, 'rad_of_gy_y', 0)
        r_zz = getattr(self.section, 'rad_of_gy_z', 0)

        if r_yy == 0 or r_zz == 0:
            logger.warning("Radius of gyration is zero. Check section properties.")

        slenderness_yy = self.length_yy / r_yy if r_yy > 0 else float('inf')
        slenderness_zz = self.length_zz / r_zz if r_zz > 0 else float('inf')

        return {
            'slenderness_yy': slenderness_yy,
            'slenderness_zz': slenderness_zz,
            'governing_slenderness': max(slenderness_yy, slenderness_zz),
            'governing_axis': 'YY' if slenderness_yy > slenderness_zz else 'ZZ'
        }

    def calculate_design_compressive_stress(self, slenderness_ratio: float) -> float:
        """
        Calculate design compressive stress (fcd) as per IS 800:2007.

        Args:
            slenderness_ratio: Governing slenderness ratio

        Returns:
            Design compressive stress in MPa
        """
        fy = self.section.fy  # Yield strength in MPa

        # IS 800:2007 Table 9
        # Simplified formula (actual code uses more complex curves)
        if slenderness_ratio <= 0:
            fcd = 0.6 * fy
        else:
            # Perry-Robertson formula (simplified)
            fcd = 0.6 * fy / (1 + (slenderness_ratio / 200) ** 2)

        return fcd

    def calculate_axial_capacity(self) -> Dict[str, Any]:
        """
        Calculate axial compression capacity of the member.

        Returns:
            Dictionary containing:
                - area: Cross-sectional area (mm²)
                - fy: Yield strength (MPa)
                - slenderness_data: Slenderness calculations
                - fcd: Design compressive stress (MPa)
                - design_capacity: Axial capacity (kN)
                - applied_load: Applied axial load (kN)
                - utilization_ratio: Load/Capacity ratio
                - is_safe: Boolean indicating if design is safe
        """
        # Get section properties
        area = self.section.area  # mm²
        fy = self.section.fy  # MPa

        # Calculate slenderness
        slenderness_data = self.calculate_slenderness_ratio()
        governing_slenderness = slenderness_data['governing_slenderness']

        # Calculate design compressive stress
        fcd = self.calculate_design_compressive_stress(governing_slenderness)

        # Calculate design capacity
        design_capacity = (fcd * area) / 1000  # Convert to kN

        # Get applied load
        applied_load = float(self.load.axial_force) if self.load.axial_force else 0

        # Calculate utilization ratio
        utilization_ratio = applied_load / design_capacity if design_capacity > 0 else float('inf')

        # Check if safe (utilization ratio should be <= 1.0)
        is_safe = utilization_ratio <= 1.0

        result = {
            'area_mm2': area,
            'fy_MPa': fy,
            'slenderness_data': slenderness_data,
            'fcd_MPa': fcd,
            'design_capacity_kN': design_capacity,
            'applied_load_kN': applied_load,
            'utilization_ratio': utilization_ratio,
            'is_safe': is_safe,
            'status': 'PASS' if is_safe else 'FAIL'
        }

        logger.info(f"Calculation complete: Status={result['status']}, "
                   f"Capacity={design_capacity:.2f}kN, Load={applied_load:.2f}kN")

        return result

    def calculate_combined_loading(self) -> Dict[str, Any]:
        """
        Calculate member capacity under combined axial and bending loads.

        Returns:
            Dictionary with combined loading analysis results
        """
        # This is a placeholder for combined loading calculations
        # Implement as per IS 800:2007 Section 9.3
        
        axial_result = self.calculate_axial_capacity()
        
        moment_major = float(self.load.moment) if self.load.moment else 0
        moment_minor = float(self.load.moment_minor) if self.load.moment_minor else 0

        # Combined loading check (simplified)
        # Actual implementation would use interaction equations
        has_moments = moment_major > 0 or moment_minor > 0

        return {
            'axial_result': axial_result,
            'moment_major_kNm': moment_major,
            'moment_minor_kNm': moment_minor,
            'has_moments': has_moments,
            'note': 'Combined loading analysis not fully implemented'
        }

    def get_detailed_report(self) -> Dict[str, Any]:
        """
        Generate a detailed calculation report.

        Returns:
            Comprehensive dictionary with all calculation details
        """
        axial_capacity = self.calculate_axial_capacity()
        combined_loading = self.calculate_combined_loading()

        return {
            'input_data': {
                'section_profile': self.section_profile,
                'section_size': self.section_size_designation,
                'material_grade': self.material_grade,
                'length_yy_mm': self.length_yy,
                'length_zz_mm': self.length_zz,
                'axial_load_kN': float(self.load.axial_force) if self.load.axial_force else 0,
                'moment_major_kNm': float(self.load.moment) if self.load.moment else 0,
                'moment_minor_kNm': float(self.load.moment_minor) if self.load.moment_minor else 0
            },
            'section_properties': {
                'area_mm2': self.section.area,
                'fy_MPa': self.section.fy,
                'fu_MPa': self.section.fu if hasattr(self.section, 'fu') else None
            },
            'axial_capacity_analysis': axial_capacity,
            'combined_loading_analysis': combined_loading,
            'design_conclusion': {
                'status': axial_capacity['status'],
                'is_safe': axial_capacity['is_safe'],
                'utilization_ratio': axial_capacity['utilization_ratio']
            }
        }


# Standalone functions for API usage

def validate_input_data(design_dict: Dict[str, Any]) -> tuple[bool, List[str]]:
    """
    Validate input data for compression member design.

    Args:
        design_dict: Dictionary containing design inputs

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    required_fields = {
        'KEY_SEC_PROFILE': 'Section Profile',
        'KEY_SECSIZE': 'Section Size',
        'KEY_MATERIAL': 'Material',
        'KEY_LENZZ': 'Length about ZZ axis',
        'KEY_LENYY': 'Length about YY axis',
        'KEY_AXIAL': 'Axial Load'
    }

    for key, display_name in required_fields.items():
        if key not in design_dict or not design_dict[key]:
            errors.append(f"Missing required field: {display_name}")
        elif key in ['KEY_LENZZ', 'KEY_LENYY', 'KEY_AXIAL']:
            try:
                value = float(design_dict[key])
                if value <= 0:
                    errors.append(f"{display_name} must be greater than zero")
            except (ValueError, TypeError):
                errors.append(f"Invalid value for {display_name}")

    # Validate section size list
    if 'KEY_SECSIZE' in design_dict and isinstance(design_dict['KEY_SECSIZE'], list):
        if len(design_dict['KEY_SECSIZE']) == 0:
            errors.append("Section size list is empty")

    return len(errors) == 0, errors


def calculate_compression_capacity(design_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function to calculate compression capacity from design dictionary.
    This function is the primary API for web integration.

    Args:
        design_dict: Dictionary containing all design inputs

    Returns:
        Dictionary containing calculation results and status
    """
    try:
        # Validate inputs
        is_valid, validation_errors = validate_input_data(design_dict)
        if not is_valid:
            return {
                'status': 'ERROR',
                'errors': validation_errors,
                'message': 'Input validation failed'
            }

        # Extract data
        section_profile = design_dict.get('KEY_SEC_PROFILE', 'Columns')
        section_size = design_dict['KEY_SECSIZE'][0]  # First size in list
        material = design_dict.get('KEY_MATERIAL', design_dict.get('KEY_SEC_MATERIAL', 'Fe250'))
        length_yy = float(design_dict['KEY_LENYY'])
        length_zz = float(design_dict['KEY_LENZZ'])
        
        # Create load object
        load = Load(
            shear_force="",
            axial_force=design_dict['KEY_AXIAL'],
            moment=design_dict.get('KEY_MOMENT_MAJOR', 0),
            moment_minor=design_dict.get('KEY_MOMENT_MINOR', 0),
            unit_kNm=True
        )

        # Create calculator and perform calculations
        calculator = CompressionCalculator(
            section_profile=section_profile,
            section_size=section_size,
            material_grade=material,
            length_yy=length_yy,
            length_zz=length_zz,
            load=load
        )

        # Get detailed report
        report = calculator.get_detailed_report()
        report['status'] = 'SUCCESS'
        
        return report

    except Exception as e:
        logger.error(f"Error in calculate_compression_capacity: {str(e)}", exc_info=True)
        return {
            'status': 'ERROR',
            'errors': [str(e)],
            'message': 'Calculation failed'
        }