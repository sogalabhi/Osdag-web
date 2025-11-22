"""
Fin Plate Service - Business logic layer
Bridges between API and osdag_core
"""
from osdag_core.design_type.connection.fin_plate_connection import FinPlateConnection
from .adapter import validate_input, generate_output, create_cad_model


class FinPlateService:
    """Service class for Fin Plate Connection module"""
    
    @staticmethod
    def calculate(inputs: dict, request=None, project_id=None, user_email=None) -> dict:
        """
        Run design calculation and return results.
        
        Args:
            inputs: Dictionary of input parameters
            request: Optional Django request object (for future use)
            project_id: Optional project ID (for future use)
            user_email: Optional user email (for future use)
            
        Returns:
            Dictionary with 'data' (results) and 'logs' (calculation logs)
        """
        # Validate inputs
        validate_input(inputs)
        
        # Instantiate and run calculation
        model = FinPlateConnection()
        model.set_input_values(inputs)
        model.hard_values()  # Performs the actual engineering math
        
        # Generate formatted output
        output, logs = generate_output(inputs)
        
        return {
            'data': output,
            'logs': logs,
            'success': True
        }
    
    @staticmethod
    def get_cad_model(inputs: dict, section: str, session: str) -> str:
        """
        Generate CAD model and return file path.
        
        Args:
            inputs: Dictionary of input parameters
            section: Section to generate ('Model', 'Beam', 'Column', 'Plate')
            session: Session identifier for file naming
            
        Returns:
            File path to the generated CAD model
        """
        return create_cad_model(inputs, section, session)

