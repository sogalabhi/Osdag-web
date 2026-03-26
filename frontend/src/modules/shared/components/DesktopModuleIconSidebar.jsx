import React from "react";
import homeIcon from "../../../assets/homepage/home_default.svg";
import connectionIcon from "../../../assets/homepage/connection.svg";
import tensionIcon from "../../../assets/homepage/tension_member.svg";
import compressionIcon from "../../../assets/homepage/compression_member.svg";
import flexuralIcon from "../../../assets/homepage/flexural_member.svg";
import beamcolumnIcon from "../../../assets/homepage/beam_column.svg";
import trussIcon from "../../../assets/homepage/truss.svg";
import frame2dIcon from "../../../assets/homepage/2d_frame.svg";
import frame3dIcon from "../../../assets/homepage/3d_frame.svg";
import { SIDEBAR_NAV_ITEMS } from "../../../homepage/components/sidebarNavItems";

const ICONS = {
  home: homeIcon,
  connection: connectionIcon,
  tension: tensionIcon,
  compression: compressionIcon,
  flexural: flexuralIcon,
  beamcolumn: beamcolumnIcon,
  truss: trussIcon,
  frame2d: frame2dIcon,
  frame3d: frame3dIcon,
};

const normalize = (value) => (value || "").toLowerCase().replace(/\s+/g, "").replace(/-/g, "");

const DesktopModuleIconSidebar = ({
  active,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  variant = "desktop",
  onItemClick,
}) => {
  const isMobile = variant === "mobile";

  const containerClasses = isMobile
    ? `md:hidden fixed left-0 top-0 h-full z-[80] transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`
    : `hidden md:block fixed left-0 top-1/2 -translate-y-1/2 z-[70] transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%-1.5rem)]"
      }`;

  return (
    <div
      className={containerClasses}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={`w-16 border-r border-osdag-border dark:border-gray-700 bg-white dark:bg-osdag-dark-color shadow-lg flex flex-col items-center py-3 ${
        isMobile ? "h-full" : "max-h-[80vh] rounded-r-xl"
      }`}>
        <nav className="w-full overflow-y-auto flex flex-col items-center gap-2 py-2">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const comingSoon = Boolean(item.comingSoon);
            const isActive = normalize(item.name) === normalize(active);

            return (
              <a
                key={item.name}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                title={comingSoon ? `${item.name} (Under Development)` : item.name}
                onClick={(event) => {
                  if (comingSoon) {
                    event.preventDefault();
                    event.stopPropagation();
                    alert("Module under development");
                    return;
                  }
                  if (onItemClick) {
                    onItemClick(item);
                  }
                }}
                className={`h-11 w-11 rounded-lg flex items-center justify-center transition-colors ${
                  comingSoon
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-osdag-dark-color dark:text-gray-500"
                    : isActive
                      ? "bg-osdag-green dark:bg-osdag-dark-green"
                      : "hover:bg-black/10 dark:hover:bg-black/40"
                }`}
              >
                <img src={ICONS[item.iconKey]} alt={item.name} className="w-7 h-7" />
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default DesktopModuleIconSidebar;
