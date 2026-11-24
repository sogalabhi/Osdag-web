"""
Tension Member - Bolted Service - Business logic layer
Bridges between API and osdag_core
"""
from apps.core.utils.api_errors import failure_result
from .adapter import validate_input, generate_output, create_cad_model
import traceback


class BoltedTensionMemberService:
    """Service class for the bolted tension member module"""
    
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
        print("=" * 60)
        print("BoltedTensionMemberService.calculate() called")
        print("=" * 60)
        print(f"Inputs received: {list(inputs.keys())[:10]}...")  # Print first 10 keys
        
        try:
            # Validate inputs
            print("\n[1/3] Validating inputs...")
            validate_input(inputs)
            print("Input validation passed")
            
            # Generate formatted output (this handles module creation and calculation)
            print("\n[2/3] Generating output (creates module and runs calculation)...")
            output, logs, raw_csv = generate_output(inputs)
            print(f"Output generated: {len(output)} output parameters")
            print(f"Logs retrieved: {len(logs) if logs else 0} log entries")

            print("\n[3/3] Preparing response...")
            result = {
                'data': output,
                'logs': logs or [],  # Ensure logs is always a list
                'success': True,
                'raw_csv': raw_csv or {},
            }
            print("Response prepared successfully")
            print("=" * 60)
            
            return result
            
        except Exception as e:
            return failure_result(e, "BoltedTensionMemberService calculation")
    
    @staticmethod
    def get_cad_model(inputs: dict, section: str, session: str, module=None) -> str:
        """
        Generate CAD model and return file path.
        
        Args:
            inputs: Dictionary of input parameters
            section: Section to generate ('Model', 'Member', 'Plate', 'Endplate')
            session: Session identifier for file naming
            module: Solved module instance to build from; when omitted the design is recalculated
            
        Returns:
            File path to the generated CAD model
        """
        return create_cad_model(inputs, section, session, module=module)

