import React from 'react';
import { Button } from 'antd';
import Reportsvg from "../../../assets/Reportsvg.svg";
import Outputsvg from "../../../assets/Outputsvg.svg";

/**
 * @description Renders the right-side output dock with the results and action buttons.
 */
export const OutputDock = ({
  OutputDockComponent,
  output,
  extraState,
  onCreateReport,
  onSaveOutput
}) => {
  return (
    <div className="superMain_right">
      <div className="OutputDock">
        <OutputDockComponent output={output} extraState={extraState} />
        <div className="inputdock-btn">
          <Button onClick={onCreateReport}>
            <img src={Reportsvg} alt="Report" /> Generate Report
          </Button>
          <Button onClick={onSaveOutput}>
            <img src={Outputsvg} alt="Output" /> Save Output
          </Button>
        </div>
      </div>
    </div>
  );
};