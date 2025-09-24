import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Outlet,
  RouterProvider,
} from "react-router-dom";

import { Worker } from "@react-pdf-viewer/core";

import { GlobalProvider } from "./context/GlobalState";
import { ModuleProvider } from "./context/ModuleState";
import { UserProvider } from "./context/UserState";

// User components
import UserAccount from "./Auth/UserAccount";
import LoginPage from "./Auth/LoginPage";

// Homepage components
import Homepage from "./homepage/pages/Homepage";
import SelectModulePage from "./homepage/pages/SelectModulePage";

// Shear connection modules
import FinPlate from "./modules/shearConnection/finPlate/FinPlate";
import CleatAngle from "./modules/shearConnection/cleatAngle/CleatAngle";
import EndPlate from "./modules/shearConnection/endPlate/EndPlate";
import SeatedPlate from "./modules/shearConnection/seatAngle/SeatedPlate";

// Tension members modules
import BoltedToEnd from "./modules/TensionMembers/BoltedToEnd/BoltedToEnd";

// Beam modules
import SimplySupportedBeam from "./modules/flexuralMember/simplySupportedBeam";
import BeamBeamEndPlate from "./modules/beamBeamEndPlate/BeamBeamEndPlate";

// Cover plate modules
import CoverPlateBolted from "./modules/coverPlateBolted/CoverPlateBolted";
import CoverPlateWelded from "./modules/coverPlateWelded/CoverPlateWelded";

import "./App.css";

let renderedOnce = false;

function App() {
  let loggedIn = false;
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<Root loggedIn={loggedIn} />}>
        {/* Root and home routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<Homepage />} />
        <Route path="/user" element={<UserAccount />} />
        <Route path="/:moduleName" element={<SelectModulePage />} />

        {/* Design routes grouped with dynamic designType */}
        <Route path="/design/:designType/shear/fin_plate/:projectId?" element={<FinPlate />} />
        <Route path="/design/:designType/shear/end_plate/:projectId?" element={<EndPlate />} />
        <Route path="/design/:designType/shear/seatAngle/:projectId?" element={<SeatedPlate />} />
        <Route path="/design/:designType/shear/cleat_angle/:projectId?" element={<CleatAngle />} />
        <Route path="/design/:designType/beam-to-beam-splice/cover_plate_bolted/:projectId?" element={<CoverPlateBolted />} />
        <Route path="/design/:designType/beam-to-beam-splice/cover_plate_welded/:projectId?" element={<CoverPlateWelded />} />
        <Route path="/design/:designType/beam-to-beam-splice/end_plate/:projectId?" element={<BeamBeamEndPlate />} />
        <Route path="/design/:designType/simply_supported_beam/:projectId?" element={<SimplySupportedBeam />} />
        <Route path="/design/:designType/bolted_to_end_gusset/:projectId?" element={<BoltedToEnd />} />
      </Route>
    )
  );

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
      <UserProvider>
        <GlobalProvider>
          <ModuleProvider>
            <div className="app">
              <RouterProvider router={router} />
            </div>
          </ModuleProvider>
        </GlobalProvider>
      </UserProvider>
    </Worker>
  );
}

const Root = () => {
  return <Outlet />;
};
export default App;