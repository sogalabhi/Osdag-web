import React from 'react'
import { useState } from 'react';
import { Input, Modal } from 'antd';
import spacingIMG1 from '../assets/cleat_beam.png'
import spacingIMG2 from '../assets/cleat.png'



const placeholderOutput1 = {
	"Cleat Angle": [
		{
			label: "Cleat Angle Designation",
			val: 0
		},
		{
			label: "Height (mm)",
			val: 0
		},
		{
			label: "Shear Yielding Capacity (kN)",
			val: 0
		},
		{
			label: "Block Shear Capacity(kN)",
			val: 0
		},
		{
			label: "Moment Demand (kNm)",
			val: 0	
		},
        {
			label: "Moment Capacity (kNm)",
			val: 0	
		},
		
	],
    Bolt: [
		{
			label: "Diameter (mm)",
			val: 0
		},
		{
			label: "Property Class",
			val: 0
		},
    ],
	"Bolts on Supported Leg": [
		{
			label: "Bolt Columns (nos)",
			val: 0
		},
		{
			label: "Bolt Rows (nos)",
			val: 0
		},
		{
			label: "Bolt Force (kN)",
			val: 0
		},
        {
			label: "Bolt Value (kN)",
			val: 0
		}
	],
	"Bolts on Supporting Leg": [
		{
			label: "Bolt Columns (nos)",
			val: 0
		},
		{
			label: "Bolt Rows (nos)",
			val: 0
		},
		{
			label: "Bolt Force (kN)",
			val: 0
		},
        {
			label: "Bolt Value (kN)",
			val: 0
		},

	]
}

const boltUpperCapacityDetailsPopUpFields = ['Shear Capacity (kN)', 'Bearing Capacity (KN)', 'βₗⱼ', 'βₗ₉' , 'Bolt Value (kN)' , 'Bolt Shear Force (kN)']
const boltLowerCapacityDetailsPopUpFields = ['Shear Capacity (kN)', 'Bearing Capacity (KN)', 'βₗⱼ', 'βₗ₉' , 'Bolt Value (kN)' , 'Bolt Shear Force (kN)']
const boltUpperSpacingDetailsPopUpFields = ['Pitch Distance (mm)', 'End Distance (mm)', 'Gauge Distance 1 (mm)', 'Gauge Distance 2 (mm)','Edge Distance (mm)']
const boltLowerSpacingDetailsPopUpFields = ['Pitch Distance (mm)', 'End Distance (mm)', 'Gauge Distance 1 (mm)', 'Gauge Distance 2 (mm)','Edge Distance (mm)']



const OutputDockCleat = ({ output = {}}) => {

	const [spacingModel1, setSpacingModel1] = useState(false);
	const [detailsModel1, setDetailsModel1] = useState(false);
	const [spacingModel2, setSpacingModel2] = useState(false);
	const [detailsModel2, setDetailsModel2] = useState(false);
	


	const handleDialog = (type, modelIndex) => {
		if (type === "Spacing") {
		  modelIndex === 1 ? setSpacingModel1(true) : setSpacingModel2(true);
		} else if (type === "Capacity") {
		  modelIndex === 1 ? setDetailsModel1(true) : setDetailsModel2(true);
		}
	  };


		return (
			//  <div>
				<h5>Output Dock</h5>
			// 	<div className='subMainBody scroll-data'>
			// 	{(output && Object.keys(output).length) ? Object.keys(output).map((key, index) => {
			// 		return (
			// 			<>
			// 				<div key={index}>
			// 					<h3>{key}</h3>
			// 					<div >
			// 						{Object.values(output[key]).map((elm, index1) => {
			// 							if (
			// 								(key === "Bolts on Supported Leg" && (boltUpperCapacityDetailsPopUpFields.includes(elm.label) || boltUpperSpacingDetailsPopUpFields.includes(elm.label))) ||
			// 								(key === "Bolts on Supporting Leg" && (boltLowerCapacityDetailsPopUpFields.includes(elm.label) || boltLowerSpacingDetailsPopUpFields.includes(elm.label)))
			// 							) {
			// 								return null;
			// 							}
			// 							return (
			// 								<div key={index1} className='component-grid'>
			// 									<div>
			// 										<h4>{elm.label}</h4>
			// 									</div>
			// 									<div>
			// 										<Input
			// 											type="text"
			// 											style={{ color: 'rgb(0 0 0 / 67%)', fontSize: '12px', fontWeight: '500' }}
			// 											name={`${key}_${elm.lable}`}
			// 											value={elm.val}
			// 											disabled
			// 										/>
			// 									</div>
			// 									{(key !== "Weld" && index1 == (Object.values(output[key])?.length-1)) &&
			// 									<>
			// 									<div>
			// 										<h4>{key == "Bolt" ? "Spacing" : "Capacity"}</h4>
			// 									</div>
			// 									<div>
			// 										<Input className='btn' 
			// 										type="button" 
			// 										value={key == "Bolt" ? "Spacing" : "Capacity"} 
			// 										onClick={() => handleDialog(key === "Bolt" ? "Spacing" : "Capacity")}/>
			// 									</div> 
			// 									</>}
			// 								</div>
			// 							);
			// 						})}
			// 					</div>
			// 				</div>
			// 				{
			// 					(key === "Bolt") &&
			// 					<div style={{marginTop: '7px', marginBottom: '7px'}}>
			// 						<h4>Section Details</h4>
			// 						<div className='component-grid'>
			// 							<div>
			// 								<h4>Capacity</h4>
			// 							</div>
			// 							<div>
			// 								<Input className='btn' 
			// 								type="button" 
			// 								value={"Capacity"} 
			// 								onClick={() => handleDialog("Capacity")}/>
			// 							</div> 
			// 						</div>
			// 					</div>
			// 				}
			// 			</>);
			// 	}) :
			// 		<div>
			// 			{Object.keys(placeholderOutput1).map((key, index) => {
			// 				return (
			// 					<>
			// 						<div key={index}>
			// 							<h3>{key}</h3>
			// 							<div >
			// 								{Object.values(placeholderOutput1[key]).map((elm, index1) => {
			// 									if (
			// 										(key === "Bolts on Supported Leg" && (boltUpperCapacityDetailsPopUpFields.includes(elm.label) || boltUpperSpacingDetailsPopUpFields.includes(elm.label))) ||
			// 										(key === "Bolts on Supporting Leg" && (boltLowerCapacityDetailsPopUpFields.includes(elm.label) || boltLowerSpacingDetailsPopUpFields.includes(elm.label)))
			// 									) {
			// 										return null;
			// 									}
			// 									return (
			// 										<div key={index1} className='component-grid' style={{userSelect: 'none'}}>
			// 											<div>
			// 												<h4>{elm.label}</h4>
			// 											</div>
			// 											<div>
			// 												<Input
			// 													type="text"
			// 													style={{ color: 'rgb(0 0 0 / 67%)', fontSize: '12px', fontWeight: '500' }}
			// 													name={`${key}_${elm.lable}`}
			// 													value={' '}
			// 													disabled
			// 												/>
			// 											</div>
			// 											{(key !== "Weld" && index1 == (Object.values(placeholderOutput[key])?.length-1)) &&
			// 											<>
			// 											<div>
			// 												<h4>{key == "Bolt" ? "Spacing" : "Capacity"}</h4>
			// 											</div>
			// 											<div>
			// 												<Input
			// 													className='btn'
			// 													type="button"
			// 													value={key === "Bolt" ? "Spacing" : "Capacity"}
			// 													// onClick={() => handleDialog(key === "Bolt" ? "Spacing" : "Capacity")}
			// 													disabled
			// 												/>

			// 											</div> 
			// 											</>}
			// 										</div>
			// 									);
			// 								})}
			// 							</div>
			// 						</div>
			// 						{
			// 					(key === "Plate") &&
			// 					<div style={{marginTop: '7px', marginBottom: '7px'}}>
			// 						<h4>Section Details</h4>
			// 						<div className='component-grid'>
			// 							<div>
			// 								<h4>Capacity</h4>
			// 							</div>
			// 							<div>
			// 								<Input className='btn' 
			// 								type="button" 
			// 								value={"Capacity"} 
			// 								disabled
			// 								/>
			// 							</div> 
			// 						</div>
			// 					</div>
			// 				}
			// 					</>);
			// 			})}
			// 		</div>}
			// </div>

			//     <Modal 
			// 	open={spacingModel1}
			// 	onCancel={() => setSpacingModel1(false)}
			// 	footer={null}
			// 	width= {'40vh'}>
			// 		<>
			// 		<div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 			<span>Shear Capacity (kN)</span>
            //             <Input style={{ width: '80px' }} value="30.43" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>Bearing Capacity (kN)</span>
            //             <Input style={{ width: '80px' }} value="31.32" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>βₗⱼ</span>
            //             <Input style={{ width: '80px' }} value="1.0" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>βₗ₉</span>
            //             <Input style={{ width: '80px' }} value="30.43" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>Bolt Shear Force (kN)</span>
            //             <Input style={{ width: '80px' }} value="27.52" readOnly />
            //         </div>
			// 	</div>
            

					
			//     </>
					
			// 	</Modal>

			// 	<Modal
			// 	open={detailsModel1}
			// 	onCancel={() => setDetailsModel1(false)}
			// 	footer={null}
			// 	width={'50vh'}
			// 	>
			// 	<>
			// 		<div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
			// 		<span>Note: Representative Image for Spacing Details</span>
					
			// 		<div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
			// 			<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Pitch Distance (mm)</span>
			// 				<Input style={{ width: '80px' }} value="60" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>End Distance (mm)</span>
			// 				<Input style={{ width: '80px' }} value="15" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Gauge Distance 1 (mm)</span>
			// 				<Input style={{ width: '80px' }} value="25.0" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Gauge Distance 2 (mm)</span>
			// 				<Input style={{ width: '80px' }} value="0.0" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Edge Distance (mm)</span>
			// 				<Input style={{ width: '80px' }} value="25.0" readOnly />
			// 			</div>
			// 			</div>

			// 			<div>
			// 			<img src={spacingIMG1} alt="Spacing Details Diagram" style={{ width: '150px', height: 'auto' }} />
			// 			</div>
			// 		</div>
			// 		</div>
			// 	</>
			// 	</Modal>



			// 	<Modal
			// 	open={spacingModel2}
			// 	onCancel={() => setSpacingModel2(false)}
			// 	footer={null}
			// 	width= {'40vh'}>
			// 		<>
			// 		<div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 			<span>Shear Capacity (kN)</span>
            //             <Input style={{ width: '80px' }} value="30.43" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>Bearing Capacity (kN)</span>
            //             <Input style={{ width: '80px' }} value="31.32" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>βₗⱼ</span>
            //             <Input style={{ width: '80px' }} value="1.0" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>βₗ₉</span>
            //             <Input style={{ width: '80px' }} value="30.43" readOnly />
            //         </div>
			// 		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            //             <span>Bolt Shear Force (kN)</span>
            //             <Input style={{ width: '80px' }} value="27.52" readOnly />
            //         </div>
			// 	</div>
            

					
			//     </>
					
			// 	</Modal>
			// 	<Modal
			// 	open={detailsModel2}
			// 	footer={null}
			// 	width={'50vh'}
			// 	>
			// 	<>
			// 		<div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
			// 		<span>Note: Representative Image for Spacing Details</span>
					
			// 		<div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
			// 			<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Pitch Distance (mm)</span>
			// 				<Input style={{ width: '80px' }} value="60" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>End Distance (mm)</span>
			// 				<Input style={{ width: '80px' }} value="15" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Gauge Distance 1 (mm)</span>
			// 				<Input style={{ width: '80px' }} value="25.0" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Gauge Distance 2 (mm)</span>
			// 				<Input style={{ width: '80px' }} value="0.0" readOnly />
			// 			</div>
			// 			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
			// 				<span>Edge Distance (mm)</span>
			// 				<Input style={{ width: '80px' }} value="25.0" readOnly />
			// 			</div>
			// 			</div>

			// 			<div>
			// 			<img src={spacingIMG2} alt="Spacing Details Diagram" style={{ width: '150px', height: 'auto' }} />
			// 			</div>
			// 		</div>
			// 		</div>
			// 	</>
			// 	</Modal>
			
			// </div>
			

		)


	}

	export default OutputDockCleat;
				
