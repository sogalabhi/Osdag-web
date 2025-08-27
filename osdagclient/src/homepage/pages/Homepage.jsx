import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MainContent from "../components/MainContent";
// import Footer from "../components/Footer";

const Homepage = () => {
  const [showSideBar, setshowSideBar] = useState(false);

  return (
    <div className="min-h-screen antialiased w-full relative">
      <div className="flex lg:h-screen relative z-10">
        {/* Sidebar */}
        {showSideBar && (
          <div className="fixed inset-0 z-40 flex">
            <div className="flex-shrink-0 bg-white dark:bg-osdag-dark-color w-sidebar h-screen border-r border-osdag-border dark:border-gray-700">
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
        <div className="flex-shrink-0 hidden lg:block">
          <Sidebar setshowSideBar={setshowSideBar} active="Home" />
        </div>

        {/* Main Content with background + overlay */}
        <div className="relative flex-1 h-[100vh] flex flex-col min-w-0 overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0 bg-[url('/images/howrah.png')] bg-cover bg-center"></div>

          {/* Dark/Light overlay */}
          <div className="absolute inset-0 bg-white/70 dark:bg-black/40"></div>

          {/* Foreground content */}
          <div className="relative flex-1 flex flex-col min-w-0">
            {/* Header */}
            <Header setshowSideBar={setshowSideBar} />

            {/* Main Content */}
            <div className="flex-1 lg:overflow-y-auto">
              <MainContent />
            </div>

            {/* Footer (optional) */}
            {/* <Footer /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
