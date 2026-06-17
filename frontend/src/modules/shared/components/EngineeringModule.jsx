import React from "react";
import { EngineeringProvider } from "../context/EngineeringContext";
import { EngineeringHeader } from "./EngineeringHeader";
import { EngineeringLayout } from "./EngineeringLayout";
import { EngineeringModals } from "./EngineeringModals";
import { MobileBottomNav } from "./MobileBottomNav";

export const EngineeringModule = ({
  moduleConfig,
  outputConfig,
  title,
}) => {
  return (
    <EngineeringProvider
      moduleConfig={moduleConfig}
      outputConfig={outputConfig}
      title={title}
    >
      <div className="w-full h-screen flex flex-col overflow-hidden">
        <EngineeringHeader />
        <EngineeringLayout />
        <EngineeringModals />
        <MobileBottomNav />
      </div>
    </EngineeringProvider>
  );
};
