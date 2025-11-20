import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MainContent from "../components/MainContent";
import mosLogo from '../../assets/homepage/mos_logo.png';
import constructSteelLogo from '../../assets/homepage/constructsteel_logo.png';
import moeLogo from '../../assets/homepage/moe_logo.png';
import InsdagLogo from '../../assets/homepage/insdag_logo.png';
// import fosseeLogo from '../../assets/homepage/fossee_logo.png';
// import Footer from "../components/Footer";

const Homepage = () => {
  const [showSideBar, setshowSideBar] = useState(false);

  return (
    <div className="min-h-screen antialiased w-full relative  bg-white dark:bg-osdag-dark-color">
      <div className="flex lg:h-screen relative z-10">
        {/* Sidebar */}
        {showSideBar && (
          <div className="fixed inset-0 z-40 flex">
            <div className="flex-shrink-0 w-sidebar h-screen border-r border-osdag-border dark:border-gray-700">
              <Sidebar setshowSideBar={setshowSideBar} />
            </div>
            {/* Overlay to close sidebar */}
            {/* 
            <div
              className="fixed inset-0 bg-black bg-opacity-30"
              onClick={() => setshowSideBar(false)}
            /> 
            */}
          </div>
        )}

        {/* Sidebar for large screens */}
        <div className="flex-shrink-0 bg-white dark:bg-osdag-dark-color hidden lg:block">
          <Sidebar setshowSideBar={setshowSideBar} active="Home" />
        </div>

        {/* Main Content with background + overlay */}
        <div className="relative flex-1 h-[100vh] flex flex-col min-w-0 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[url('/images/background_light.svg')] bg-cover bg-center dark:hidden"></div>
            <div className="absolute inset-0 bg-[url('/images/background_dark.svg')] bg-cover bg-center hidden dark:block"></div>
          </div>

          {/* Dark/Light overlay
          <div className="absolute inset-0 bg-white/70 dark:bg-black/40"></div> */}

          {/* Foreground content */}
          <div className="relative flex-1 flex flex-col min-w-0">
            {/* Header */}
            <Header setshowSideBar={setshowSideBar} />

            {/* Main Content */}
            <div className="flex-1 lg:overflow-y-auto">
              <MainContent />
            </div>
            <div className="pointer-events-none absolute bottom-6 left-6 flex flex-wrap items-center gap-4">
              
              <img src={moeLogo} alt="MOE Logo" className="h-[4.2rem] pointer-events-auto" />
              <img src={mosLogo} alt="MOS Logo" className="h-[4.2rem] pointer-events-auto" /> 
              <img src={constructSteelLogo} alt="Construct Steel Logo" className="h-[1.44rem] pointer-events-auto" />
              <img src={InsdagLogo} alt="Insdag Logo" className="h-[4.2rem] pointer-events-auto" />
              {/* <img src={fosseeLogo} alt="FOSSEE Logo" className="h-10 pointer-events-auto" /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
