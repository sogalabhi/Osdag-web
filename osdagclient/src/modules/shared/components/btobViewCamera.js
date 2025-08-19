import { useMemo, useCallback } from "react";

// Move camera settings outside component to prevent hot reload issues
const CAMERA_SETTINGS = {
  BeamBeamEndPlate: {
    Model: {
      position: [20, -15, 20],
      fov: 30,
      modelPosition: [0, 0, 6],
      modelScale: 0.012,
    },
    Beam: {
      position: [18, 12, 18],
      fov: 35,
      modelPosition: [0, 0, 6],
      modelScale: 0.012,
    },
    Connector: {
      position: [-18, -12, -18],
      fov: 28,
      modelPosition: [0, 0, 4],
      modelScale: 0.012,
    },
  },
  CoverPlateBolted: {
    Model: {
      position: [17, -6, 20],
      fov: 30,
      modelPosition: [0, 0, 10],
      modelScale: 0.015,
    },
    Beam: {
      position: [20, 10, 20],
      fov: 28,
      modelPosition: [0, 0, 10],
      modelScale: 0.015,
    },
    Connector: {
      position: [-20, 15, -20],
      fov: 20,
      modelPosition: [0, 0, 8],
      modelScale: 0.015,
    },
  },
  FinPlate: {
    connectivitySettings: {
      "Column Flange-Beam-Web": {
        Model: {
          position: [-17, 10, 17],
          fov: 49,
          modelPosition: [0, -10, 0],
          modelScale: 0.02,
        },
        Beam: {
          position: [-15, 10, 15],
          fov: 27,
          modelPosition: [0, -10, -7],
          modelScale: 0.02,
        },
        Column: {
          position: [-25, 10, 10],
          fov: 45,
          modelPosition: [0, -10, 0],
          modelScale: 0.02,
        },
        Plate: {
          position: [-20, 0, 0],
          fov: 15,
          modelPosition: [0, -10, -2],
          modelScale: 0.02,
        },
      },
      "Column Web-Beam-Web": {
        Model: {
          position: [-17, 10, 17],
          fov: 49,
          modelPosition: [0, -10, 0],
          modelScale: 0.02,
        },
        Beam: {
          position: [15, 10, 15],
          fov: 30,
          modelPosition: [-5, 2, 10],
          modelScale: 0.02,
        },
        Column: {
          position: [-15, 10, 10],
          fov: 50,
          modelPosition: [0, -10, 0],
          modelScale: 0.02,
        },
        Plate: {
          position: [-15, 5, 15],
          fov: 30,
          modelPosition: [0, 2, 10],
          modelScale: 0.02,
        },
      },
      "Beam-Beam": {
        Model: {
          position: [20, 0, 17],
          fov: 50,
          modelPosition: [0, 0, 10],
          modelScale: 0.02,
        },
        Beam: {
          position: [20, 10, 20],
          fov: 35,
          modelPosition: [-5, 0, 10],
          modelScale: 0.02,
        },
        Column: {
          position: [20, 15, 20],
          fov: 40,
          modelPosition: [0, 0, 10],
          modelScale: 0.02,
        },
        Plate: {
          position: [5, 0, 30],
          fov: 20,
          modelPosition: [0, -2, 10],
          modelScale: 0.02,
        },
      },
    },
  },
  default: {
    Model: {
      position: [12, 10, 12],
      fov: 45,
      modelPosition: [0, -2, 0],
      modelScale: 0.008,
    },
    Beam: {
      position: [10, 8, 10],
      fov: 45,
      modelPosition: [0, 0, 2],
      modelScale: 0.008,
    },
    Connector: {
      position: [-12, 10, -12],
      fov: 40,
      modelPosition: [0, 0, 3],
      modelScale: 0.008,
    },
  },
};

// Orthographic view positions - distance adjusted for good view
const ORTHOGRAPHIC_VIEWS = {
  XY: { position: [0, 0, 25], fov: 45 }, // Looking down Z-axis
  YZ: { position: [25, 0, 0], fov: 45 }, // Looking along X-axis
  ZX: { position: [0, 25, 0], fov: 45 }, // Looking down Y-axis

  ANGLE1: { position: [15, 10, 20], fov: 45 },   // Diagonal top-right view
  ANGLE2: { position: [-15, 12, 18], fov: 45 },  // Diagonal top-left view
  ANGLE3: { position: [20, -8, 15], fov: 45 },   // Bottom-right angled view
  ANGLE4: { position: [-12, -15, 22], fov: 45 }, // Bottom-left elevated view
  ANGLE5: { position: [8, 18, -20], fov: 45 },   // High angle from behind
  ANGLE6: { position: [-20, 5, -15], fov: 45 },  // Side angle from behind
};

export default function useViewCamera(
  moduleName,
  selectedView,
  connectivity = null,
  orthographicView = null
) {
  // Use useCallback to prevent unnecessary re-renders (MUST BE CALLED FIRST!)
  const getCameraSettings = useCallback(() => {
    // Check for orthographic view override first
    if (orthographicView && ORTHOGRAPHIC_VIEWS[orthographicView]) {
      const orthoSettings = ORTHOGRAPHIC_VIEWS[orthographicView];

      // Get the base settings to preserve model positioning
      const baseSettings = getBaseSettings();

      return {
        ...baseSettings,
        position: orthoSettings.position,
        fov: orthoSettings.fov,
        isOrthographic: true,
        orthographicView,
      };
    }

    function getBaseSettings() {
      // CHECK FOR LIVE OVERRIDE FROM CONSOLE INSIDE THE CALLBACK!
      if (
        typeof window !== "undefined" &&
        window.LIVE_CAMERA_SETTINGS &&
        window.LIVE_CAMERA_SETTINGS[moduleName]
      ) {
        const liveSettings = window.LIVE_CAMERA_SETTINGS[moduleName];

        // Handle FinPlate connectivity-specific settings
        if (
          moduleName === "FinPlate" &&
          connectivity &&
          liveSettings.connectivitySettings
        ) {
          const connectivitySettings =
            liveSettings.connectivitySettings[connectivity];
          if (connectivitySettings && connectivitySettings[selectedView]) {
            console.log(
              "Using LIVE camera override for:",
              moduleName,
              connectivity,
              selectedView
            );
            return connectivitySettings[selectedView];
          }
        }

        // Handle regular settings
        if (liveSettings[selectedView]) {
          console.log(
            "Using LIVE camera override for:",
            moduleName,
            selectedView
          );
          return liveSettings[selectedView];
        }
      }

      // Get base module settings
      const moduleSettings =
        CAMERA_SETTINGS[moduleName] || CAMERA_SETTINGS.default;

      // Handle FinPlate connectivity-specific settings
      if (
        moduleName === "FinPlate" &&
        connectivity &&
        moduleSettings.connectivitySettings
      ) {
        const connectivitySettings =
          moduleSettings.connectivitySettings[connectivity];

        if (connectivitySettings) {
          const viewSettings =
            connectivitySettings[selectedView] || connectivitySettings.Model;

          // Log if using fallback view for connectivity
          if (!connectivitySettings[selectedView]) {
            console.warn(
              `Camera settings not found for view: ${selectedView} in connectivity: ${connectivity}, using Model view`
            );
          }

          return viewSettings;
        } else {
          console.warn(
            `Camera settings not found for connectivity: ${connectivity}, using default FinPlate settings`
          );
        }
      }

      // Default handling for non-FinPlate modules or when no connectivity is provided
      const viewSettings = moduleSettings[selectedView] || moduleSettings.Model;

      // Log warning if using fallback
      if (!CAMERA_SETTINGS[moduleName]) {
        console.warn(
          `Camera settings not found for module: ${moduleName}, using default settings`
        );
      }

      if (!CAMERA_SETTINGS[moduleName]?.[selectedView]) {
        console.warn(
          `Camera settings not found for view: ${selectedView} in module: ${moduleName}, using Model view`
        );
      }

      return viewSettings;
    }

    return getBaseSettings();
  }, [moduleName, selectedView, connectivity, orthographicView]);

  // Memoize the result to prevent unnecessary recalculations
  return useMemo(() => getCameraSettings(), [getCameraSettings]);
}
