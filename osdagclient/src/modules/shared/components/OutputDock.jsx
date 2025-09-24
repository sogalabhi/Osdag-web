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
    <div className="p-4 md:p-6">
      {/* This container stacks the output component and the buttons vertically with a gap */}
      <div className="flex flex-col gap-4">

        <OutputDockComponent output={output} extraState={extraState} />

        {/* This container arranges the buttons horizontally, aligns them to the right, and adds a gap */}
        <div className="flex items-center justify-end gap-4 mt-2">
          <Button
            onClick={onCreateReport}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
          >
            <img src={Reportsvg} alt="Report" className="w-5 h-5" />
            Generate Report
          </Button>

          <Button
            onClick={onSaveOutput}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
          >
            <img src={Outputsvg} alt="Output" className="w-5 h-5" />
            Save Output
          </Button>
        </div>

      </div>
    </div>
  );
};