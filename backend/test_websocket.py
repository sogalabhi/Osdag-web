#!/usr/bin/env python3
"""
Test WebSocket connection for Plate Girder PSO Optimization
"""
import asyncio
import json
import websockets
import sys

async def test_websocket():
    """Test WebSocket connection with real optimized design data"""
    
    # Real optimized design inputs - matching plateGirderConfig.js buildSubmissionParams format
    # Based on the actual frontend submission format
    optimization_data = {
        "type": "start_optimization",
        "data": {
            "Module": "Plate-Girder",
            "Material": "E 250 (Fe 410 W)A",
            "Member.Length": "20",  # 20 meters (backend expects meters, frontend sends mm but adapter converts)
            "Loading.Condition": "Normal",
            "Load.Shear": "877.5",  # kN
            "Load.Moment": "4275",  # kNm
            "Loading.Bending_Moment_Shape": "Uniform Loading with pinned-pinned support",
            "Total.Design_Type": "Optimized",
            "Web.Thickness": ["3", "4", "5", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "36", "40"],
            "TopFlange.Thickness": ["3", "4", "5", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "36", "40"],
            "BottomFlange.Thickness": ["3", "4", "5", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "36", "40"],
            "Design.Design_Type_Flexure": "Major Laterally Supported",
            "Design.Torsional_Restraint": "Fully Restrained",
            "Design.Warping_Restraint": "Both flanges fully restrained",
            "Design.Max_Deflection": "Span/600",
            "Structure.Type": "Highway Bridge",
            "Design.Load": "Live load",
            "Member.Options": "Simple Span",
            "Supporting.Options": "NA",
            "Design.Allow_Class": "Plastic",
            "Design.Web_Philosophy": "Thick Web without ITS",
            "Design.Support_Width": "300",
            "Design.Design_Method": "Limit State Design",
            "Design.Effective_Area_Parameter": "1.0",
            "Design.Length_Overwrite": "NA",
            "Design.ShearBucklingOption": "Simple Post Critical",
            "Design.IntermediateStiffener.Spacing": "NA",
            "Design.IntermediateStiffener.Thickness": "Standard",
            "Design.LongitudnalStiffener": "No",
            "Design.LongitudnalStiffener.Thickness": "Standard",
            "Symmetry": "Symmetrical",
            # Dummy values for optimized (will be optimized by PSO)
            "Total.Depth": "1",
            "Topflange.Width": "1",
            "Bottomflange.Width": "1",
            # Optimization bounds (optional - empty means use defaults)
            "Total.Depth_lb": "",
            "Total.Depth_ub": "",
            "Total.Depth_inc": "",
            "Topflange.Width_lb": "",
            "Topflange.Width_ub": "",
            "Topflange.Width_inc": "",
            "Bottomflange.Width_lb": "",
            "Bottomflange.Width_ub": "",
            "Bottomflange.Width_inc": "",
        }
    }
    
    uri = "ws://localhost:8000/ws/optimize/plate-girder/"
    
    print(f"🔌 Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected!")
            
            # Send start_optimization message
            print("\n📤 Sending optimization request...")
            await websocket.send(json.dumps(optimization_data))
            print("✅ Request sent!")
            
            # Listen for responses
            print("\n📥 Listening for updates...")
            update_count = 0
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    msg_type = data.get('type', 'unknown')
                    
                    if msg_type == 'task_started':
                        print(f"\n✅ Task started: {data.get('data', {}).get('task_id', 'N/A')}")
                    
                    elif msg_type == 'pso_update':
                        update_count += 1
                        pso_data = data.get('data', {})
                        iteration = pso_data.get('iteration', '?')
                        particle = pso_data.get('particle_index', '?')
                        ur = pso_data.get('ur', 0)
                        weight = pso_data.get('weight_kg', 0)
                        
                        if update_count % 10 == 0:  # Print every 10th update
                            print(f"  Update #{update_count}: Iter {iteration}, Particle {particle}, UR={ur:.3f}, Weight={weight:.2f} kg")
                    
                    elif msg_type == 'pso_complete':
                        result = data.get('data', {}).get('result', {})
                        print(f"\n✅ Optimization complete!")
                        if result.get('design'):
                            print(f"  Final Design: {result['design'].get('Optimum.Designation', {}).get('val', 'N/A')}")
                            print(f"  Final UR: {result['design'].get('Optimum.UR', {}).get('val', 'N/A')}")
                        break
                    
                    elif msg_type == 'pso_error':
                        error_msg = data.get('data', {}).get('message', 'Unknown error')
                        print(f"\n❌ Error: {error_msg}")
                        break
                    
                    elif msg_type == 'pso_heartbeat':
                        if update_count % 50 == 0:  # Print heartbeat occasionally
                            print(f"  💓 Heartbeat received")
                    
                    else:
                        print(f"  Received: {msg_type}")
                
                except json.JSONDecodeError as e:
                    print(f"  ⚠️ Failed to parse message: {e}")
                except Exception as e:
                    print(f"  ⚠️ Error processing message: {e}")
            
            print(f"\n📊 Total updates received: {update_count}")
            print("✅ Test completed!")
    
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ Connection failed with status {e.status_code}")
        print(f"   Response: {e.headers if hasattr(e, 'headers') else 'N/A'}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    print("=" * 60)
    print("Plate Girder PSO Optimization WebSocket Test")
    print("=" * 60)
    asyncio.run(test_websocket())

