import { OrbitControls, useTexture } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { useEffect, useState, useMemo, useRef } from "react";
import * as THREE from "three";
import AxisHelperWidget from "../utils/AxisHelperWidget";

function Model({ modelPaths, selectedView, selectedViews = null, cameraSettings, hoverDict = {}, onHoverLabel, onHoverEnd }) {
  // Log props when component receives them
  console.log('=== [btobRender] Model component rendered ===');
  console.log('[btobRender] Props received:', {
    hasModelPaths: !!modelPaths,
    modelPathsKeys: modelPaths ? Object.keys(modelPaths) : [],
    hoverDict,
    hoverDictKeys: Object.keys(hoverDict || {}),
    hoverDictEntries: Object.entries(hoverDict || {}),
    hoverDictSize: Object.keys(hoverDict || {}).length,
  });
  
  const [parsedModels, setParsedModels] = useState(null);
  const [hoveredMeshId, setHoveredMeshId] = useState(null);
  const activeMeshRef = useRef(null); // Track which mesh should be active based on renderOrder
  const hoveredMeshDataRef = useRef(null); // Store the hover data for the currently hovered mesh
  const pendingEventsRef = useRef(new Map()); // Track pending events by renderOrder
  const rafScheduledRef = useRef(false); // Track if we've already scheduled a RAF
  const texture = useTexture("/texture.png");
  texture.needsUpdate = true;

  // Get model position, scale, orthographic view, and connectivity from camera settings
  const GRID_VIEWS = [
    "XY", "YZ", "ZX", "ANGLE1", "ANGLE2", "ANGLE3", "ANGLE4", "ANGLE5", "ANGLE6"
  ];
  // Use selectedViews array if provided, otherwise use selectedView as single item
  const activeViews = selectedViews && Array.isArray(selectedViews) ? selectedViews : [selectedView];
  const primaryView = activeViews[0] || selectedView;
  const useGridCenteredPosition = GRID_VIEWS.includes(primaryView);
  const modelPosition = useGridCenteredPosition ? [0, 0, 0] : (cameraSettings?.modelPosition || [0, -4, 0]);
  const modelScale = cameraSettings?.modelScale || 0.008;
  const orthographicView = cameraSettings?.orthographicView || null;
  const connectivity = cameraSettings?.connectivity || null;

  // Check if we're in the specific FinPlate Column Web-Beam-Web case
  const isColumnWebBeamWeb = connectivity === "Column Web-Beam-Web";

  // Helper function to check if a part should be shown based on selected views
  const shouldShowPart = (partName) => {
    // If Model is selected, show all parts
    if (activeViews.includes("Model")) {
      return true;
    }
    // Map view names to part names
    const viewToPartMap = {
      "Beam": ["Beam"],
      "Column": ["Column"],
      // Plate view should show both Plate and Bolt/Bolts (for Fin Plate connections)
      "Plate": ["Plate", "Bolt", "Bolts"],
      "Connector": ["Connector", "cleatAngle", "SeatedAngle", "EndPlate"],
      "CleatAngle": ["cleatAngle"],
      "SeatedAngle": ["SeatedAngle"],
      "EndPlate": ["EndPlate"],
      "Member": ["Member"],
    };
    
    // Check if any selected view maps to this part
    for (const view of activeViews) {
      const mappedParts = viewToPartMap[view] || [];
      if (mappedParts.includes(partName) || mappedParts.some(p => partName.toLowerCase().includes(p.toLowerCase()))) {
        return true;
      }
    }
    return false;
  };

  // Helper function to get render order for proper z-indexing
  const getRenderOrder = (partName) => {
    const lower = partName.toLowerCase();
    // Structural members (Beam, Column) render first (lower z-index)
    if (lower.includes("beam") || lower.includes("column") || lower.includes("member")) {
      return 0;
    }
    // Plates, connectors, and endplates render on top (higher z-index)
    if (lower.includes("plate") || lower.includes("endplate") || lower.includes("cleat") || lower.includes("seated") || lower.includes("connector")) {
      return 1;
    }
    // Bolts and welds render on top
    if (lower.includes("bolt") || lower.includes("weld")) {
      return 2;
    }
    return 0;
  };

  // Separate useEffect to log hoverDict changes
  useEffect(() => {
    console.log('=== [btobRender] hoverDict changed ===');
    console.log('[btobRender] hoverDict value:', hoverDict);
    console.log('[btobRender] hoverDict type:', typeof hoverDict);
    console.log('[btobRender] hoverDict is object:', hoverDict && typeof hoverDict === 'object');
    console.log('[btobRender] hoverDict keys:', hoverDict ? Object.keys(hoverDict) : 'N/A');
    console.log('[btobRender] hoverDict entries:', hoverDict ? Object.entries(hoverDict) : 'N/A');
    if (hoverDict && typeof hoverDict === 'object') {
      console.log('[btobRender] hoverDict JSON:', JSON.stringify(hoverDict, null, 2));
    }
  }, [hoverDict]);

  useEffect(() => {
    console.log('=== [btobRender] Model loading useEffect triggered ===');
    console.log('[btobRender] useEffect - hoverDict:', hoverDict);
    console.log('[btobRender] hasModelPaths:', !!modelPaths);
    if (!modelPaths) {
      console.log('[btobRender] modelPaths is missing, skipping model load');
      return;
    }
    
    // Log hoverDict on model load
    console.log('[btobRender] Model loading - hoverDict:', hoverDict);
    console.log('[btobRender] hoverDict keys:', Object.keys(hoverDict || {}));
    console.log('[btobRender] hoverDict entries:', Object.entries(hoverDict || {}));
    
    try {
      const stlLoader = new STLLoader();
      const parsedData = {};
      const partsGroup = new THREE.Group();
      const partKeys = new Set([
        "Member",
        "Endplate",
        "Beam",
        "Column",
        "Plate",
        "Weld",
        "Welds",
        "Bolt",
        "Bolts",
        "cleatAngle",
        "SeatedAngle",
        "Connector"
      ]);

      Object.entries(modelPaths).forEach(([key, dataUrl]) => {
        try {
          if (typeof dataUrl === 'string' && dataUrl.startsWith('data:application/octet-stream;base64,')) {
            const base64 = dataUrl.split(',')[1];
            const binary = atob(base64);
            const arrayBuffer = new ArrayBuffer(binary.length);
            const bytes = new Uint8Array(arrayBuffer);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const geometry = stlLoader.parse(arrayBuffer);
            const colorMap = {
              // requested colors
              beam: '#868664',
              column: '#484836',
              plate: '#2f2f23',
              weld_left: '#ff0000',
              weld_right: '#ff0000',
              // map to canonical keys used by sections
              Member: '#808080',
              Endplate: '#2f2f23',
              Beam: '#868664',
              Column: '#484836',
              Plate: '#2f2f23',
              Weld: '#ff0000',
              Welds: '#ff0000',
              // fallbacks/others
              Bolt: '#996633',
              Bolts: '#996633',
              cleatAngle: '#2f2f23',
              Model: '#999999',
              seatedAngle: '#2f2f23',
            };
            const material = new THREE.MeshStandardMaterial({
              color: colorMap[key] ?? colorMap[key?.toLowerCase?.()] ?? '#888888',
              metalness: 0.3,
              roughness: 0.5,
              side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = key;
            // Attach hover label metadata with improved key matching
            const lowerKey = key?.toLowerCase?.();
            const capitalizedKey = key?.charAt(0).toUpperCase() + key?.slice(1).toLowerCase();
            const hoverLabel = (
              hoverDict?.[key] || 
              hoverDict?.[lowerKey] || 
              hoverDict?.[capitalizedKey] ||
              (lowerKey?.endsWith('s') && hoverDict?.[key.slice(0, -1)]) || // Try singular if plural
              (!lowerKey?.endsWith('s') && hoverDict?.[key + 's']) || // Try plural if singular
              key
            );
            mesh.userData.hoverLabel = hoverLabel;
            
            // Debug: log hover label resolution for each mesh
            console.log(`[btobRender] Mesh "${key}":`, {
              key,
              lowerKey,
              capitalizedKey,
              resolvedHoverLabel: hoverLabel,
              hoverDictHasKey: !!hoverDict?.[key],
              hoverDictHasLower: !!hoverDict?.[lowerKey],
            });
            
            parsedData[key] = mesh;

            // Accumulate per-part meshes into a single group (exclude merged Model)
            if (partKeys.has(key)) {
              partsGroup.add(mesh);
            }
          } else if (typeof dataUrl === 'string' && dataUrl.includes('v ')) {
            // Fallback: legacy OBJ text
            const objLoader = new OBJLoader();
            parsedData[key] = objLoader.parse(dataUrl);
          }
        } catch (e) {
          console.warn(`[btobRender] Failed to load section ${key}:`, e);
        }
      });

      // If we have a merged Model and also per-part meshes, show parts in place of Model
      if (parsedData.Model && partsGroup.children.length > 0) {
        // Prefer per-part colored group for Model view
        parsedData.Model = partsGroup;
      } else if (!parsedData.Model && partsGroup.children.length > 0) {
        // If no merged Model exists, still expose parts under Model key for existing render paths
        parsedData.Model = partsGroup;
      }

      setParsedModels(parsedData);
      
      // Log all hover label mappings after parsing
      console.log('[btobRender] Model parsing complete - Hover label mappings:');
      const hoverMappings = {};
      Object.entries(parsedData).forEach(([key, obj]) => {
        let hoverLabel = key;
        if (obj?.userData?.hoverLabel) {
          hoverLabel = obj.userData.hoverLabel;
        } else if (obj?.name) {
          hoverLabel = obj.name;
        } else if (obj?.type === 'Group' && obj.children?.length > 0) {
          // For groups, check first child
          const firstChild = obj.children[0];
          hoverLabel = firstChild?.userData?.hoverLabel || firstChild?.name || key;
        }
        hoverMappings[key] = hoverLabel;
        console.log(`  "${key}" ->`, hoverLabel);
      });
      console.log('[btobRender] Complete hover mappings object:', hoverMappings);
      console.log('[btobRender] Total meshes/groups parsed:', Object.keys(parsedData).length);
    } catch (error) {
      console.error('Error parsing model data:', error);
    }
  }, [modelPaths, hoverDict]);

  const getGeometry = (obj) => {
    let g;
    obj.traverse((c) => {
      if (c.type === "Mesh") {
        // Debug: log each mesh encountered in traversal
        try {
        } catch (e) { }
        c.material.map = texture;
        c.material.needsUpdate = true;
        g = c.geometry;
      }
    });
    if (!g) console.warn("No geometry found in object:", obj);
    return g;
  };

  // Extract all meshes under an object; used for Model where we want per-part colors
  const getMeshes = (obj) => {
    const meshes = [];
    if (!obj) return meshes;
    obj.traverse((c) => {
      if (c.type === "Mesh" && c.geometry) {
        // Preserve the original mesh name - this is critical for hoverDict lookup
        const meshName = c.name || "";
        const label = c.userData?.hoverLabel || meshName;
        
        // Debug: log mesh names being extracted
        if (meshName.toLowerCase().includes('bolt')) {
          console.log(`[btobRender] Extracting Bolt mesh:`, {
            meshName,
            label,
            userDataHoverLabel: c.userData?.hoverLabel,
            parentName: c.parent?.name
          });
        }
        
        meshes.push({ name: meshName, geometry: c.geometry, hoverLabel: label });
      }
    });
    if (meshes.length === 0) console.warn("No meshes found in object:", obj);
    return meshes;
  };

  // All geometry definitions
  const geometryModel = useMemo(
    () => (parsedModels?.Model ? getGeometry(parsedModels.Model) : null),
    [parsedModels, texture]
  );
  const modelMeshes = useMemo(
    () => (parsedModels?.Model ? getMeshes(parsedModels.Model) : []),
    [parsedModels, hoverDict] // Include hoverDict so meshes update when it changes
  );
  // Part color map (dark mode hex values provided)
  const partColors = useMemo(() => ({
    Member: '#808080',
    Endplate: '#2f2f23',
    Beam: "#868664",
    Column: "#484836",
    Plate: "#2f2f23",
    Weld: "#ff0000",
    weld_left: "#ff0000",
    weld_right: "#ff0000",
  }), []);
  const geometryBeam = useMemo(
    () => (parsedModels?.Beam ? getGeometry(parsedModels.Beam) : null),
    [parsedModels, texture]
  );
  const geometryColumn = useMemo(
    () => (parsedModels?.Column ? getGeometry(parsedModels.Column) : null),
    [parsedModels, texture]
  );
  const geometryPlate = useMemo(
    () => (parsedModels?.Plate ? getGeometry(parsedModels.Plate) : null),
    [parsedModels, texture]
  );
  const geometryConnector = useMemo(
    () =>
      parsedModels?.Connector ? getGeometry(parsedModels.Connector) : null,
    [parsedModels, texture]
  );

  const geometryCleatAngle = useMemo(
    () => (parsedModels?.cleatAngle ? getGeometry(parsedModels.cleatAngle) : null),
    [parsedModels, texture]
  );

  // Tension Member specific geometries
  const geometryMember = useMemo(
    () => (parsedModels?.Member ? getGeometry(parsedModels.Member) : null),
    [parsedModels, texture]
  );
  const geometryEndplate = useMemo(
    () => (parsedModels?.Endplate ? getGeometry(parsedModels.Endplate) : null),
    [parsedModels, texture]
  );
  const geometrySeatedAngle = useMemo(
    () => (parsedModels?.SeatedAngle ? getGeometry(parsedModels.SeatedAngle) : null),
    [parsedModels, texture]
  );

  if (!parsedModels) {
    return null;
  }

  return (
    <group name="scene">
      {/* Lighting to ensure visibility */}
      <ambientLight intensity={2.0} />
      <directionalLight position={[5, 5, 5]} intensity={2.0} />
      <directionalLight position={[-5, -5, -5]} intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -10]} intensity={1.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1.0} />
      <AxisHelperWidget orthographicView={orthographicView} />

      {/* Model Section - render each subpart with its own color (used for Model view or multi-select) */}
      {((activeViews.includes("Model") || GRID_VIEWS.includes(primaryView) || activeViews.length > 1) && modelMeshes.length > 0) && (
        <>
          {modelMeshes.map((m, idx) => {
            const name = m.name || "";
            const lower = name.toLowerCase();
            // Filter: only show parts that match selected views
            if (!shouldShowPart(name)) {
              return null;
            }
            let color = partColors[name] || partColors[lower] || "#6b7280";
            if (!partColors[name] && !partColors[lower] && lower.startsWith("weld")) {
              color = partColors.Weld;
            }
            const meshId = `${name}-${idx}`;
            const isHovered = hoveredMeshId === meshId;
            const renderOrder = getRenderOrder(name);
            
            return (
              <group key={meshId}>
                <mesh
                  geometry={m.geometry}
                  scale={modelScale}
                  rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
                  position={modelPosition}
                  renderOrder={renderOrder}
                  userData={{ 
                    // Prioritize hoverDict (which includes backend values) over stored m.hoverLabel
                    // Try multiple key variations for better matching
                    hoverLabel: (
                      hoverDict?.[name] || 
                      hoverDict?.[lower] || 
                      hoverDict?.[name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()] ||
                      (name.toLowerCase().endsWith('s') && hoverDict?.[name.slice(0, -1)]) || // Try singular if plural
                      (!name.toLowerCase().endsWith('s') && hoverDict?.[name + 's']) || // Try plural if singular
                      m.hoverLabel
                    ) || name, 
                    renderOrder,
                    meshName: name
                  }}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    
                    // Resolve hover label with improved key matching
                    // ALWAYS check hoverDict first - it has the latest backend values
                    const meshName = e.object?.userData?.meshName || name || m.name || "hello";
                    const lowerName = meshName?.toLowerCase?.();
                    const capitalizedName = meshName?.charAt(0).toUpperCase() + meshName?.slice(1).toLowerCase();
                    
                    // Try multiple key variations in hoverDict first
                    let resolvedLabel = null;
                    if (hoverDict && typeof hoverDict === 'object' && Object.keys(hoverDict).length > 0) {
                      // Try exact match first
                      resolvedLabel = hoverDict[meshName];
                      
                      // Try lowercase
                      if (!resolvedLabel) {
                        resolvedLabel = hoverDict[lowerName];
                      }
                      
                      // Try capitalized (first letter uppercase, rest lowercase)
                      if (!resolvedLabel) {
                        resolvedLabel = hoverDict[capitalizedName];
                      }
                      
                      // Try singular if plural (e.g., "Bolts" -> "Bolt")
                      if (!resolvedLabel && lowerName?.endsWith('s') && lowerName.length > 1) {
                        const singular = meshName.slice(0, -1);
                        resolvedLabel = hoverDict[singular] || hoverDict[singular.toLowerCase()];
                      }
                      
                      // Try plural if singular (e.g., "Bolt" -> "Bolts")
                      if (!resolvedLabel && !lowerName?.endsWith('s')) {
                        const plural = meshName + 's';
                        resolvedLabel = hoverDict[plural] || hoverDict[plural.toLowerCase()];
                      }
                      
                      // Debug logging for Bolt specifically
                      if (lowerName?.includes('bolt') && !resolvedLabel) {
                        console.log(`⚠️ [btobRender] Bolt hover resolution failed for "${meshName}":`, {
                          meshName,
                          lowerName,
                          capitalizedName,
                          hoverDictKeys: Object.keys(hoverDict),
                          availableBoltKeys: Object.keys(hoverDict).filter(k => k.toLowerCase().includes('bolt')),
                          hoverDictBolt: hoverDict['Bolt'],
                          hoverDictBolts: hoverDict['Bolts'],
                          hoverDictBoltLower: hoverDict['bolt'],
                        });
                      }
                    }
                    
                    // Fallback to stored label or mesh name only if hoverDict lookup failed
                    // IMPORTANT: Don't use m.hoverLabel as fallback if it doesn't match the mesh name
                    // (e.g., if Bolt mesh has Plate's label stored)
                    if (!resolvedLabel) {
                      const storedLabel = e.object?.userData?.hoverLabel || m.hoverLabel;
                      // Only use stored label if it seems to match this mesh (contains mesh name or vice versa)
                      if (storedLabel && (
                        storedLabel.toLowerCase().includes(lowerName) || 
                        lowerName.includes(storedLabel.toLowerCase()) ||
                        storedLabel === name
                      )) {
                        resolvedLabel = storedLabel;
                      } else {
                        // Use mesh name as final fallback
                        resolvedLabel = name;
                      }
                    }
                    
                    // Final safety check: if resolved label contains Plate info but mesh is Bolt, try harder
                    if (lowerName?.includes('bolt') && resolvedLabel?.toLowerCase().includes('plate') && !resolvedLabel?.toLowerCase().includes('bolt')) {
                      console.warn(`⚠️ [btobRender] Bolt mesh "${meshName}" resolved to Plate label "${resolvedLabel}", forcing Bolt lookup`);
                      // Force Bolt lookup
                      resolvedLabel = hoverDict?.['Bolt'] || hoverDict?.['Bolts'] || hoverDict?.['bolt'] || hoverDict?.['bolts'] || name;
                    }
                    
                    // Debug logging for hover resolution - always log Bolt hovers
                    const isBoltMesh = lowerName?.includes('bolt');
                    if (isBoltMesh || (!window._hoverDebugCount || window._hoverDebugCount < 5)) {
                      if (!isBoltMesh) window._hoverDebugCount = (window._hoverDebugCount || 0) + 1;
                      console.log(`🔍 [btobRender] Hover on "${meshName}" (Model view, renderOrder: ${renderOrder}):`, {
                        meshName,
                        lowerName,
                        capitalizedName,
                        renderOrder,
                        hoverDictExists: !!hoverDict,
                        hoverDictKeys: Object.keys(hoverDict),
                        hoverDictHasExact: !!hoverDict?.[meshName],
                        hoverDictHasLower: !!hoverDict?.[lowerName],
                        hoverDictHasCapitalized: !!hoverDict?.[capitalizedName],
                        exactValue: hoverDict?.[meshName],
                        lowerValue: hoverDict?.[lowerName],
                        resolvedLabel,
                        storedUserDataLabel: e.object?.userData?.hoverLabel,
                        mHoverLabel: m.hoverLabel,
                        mName: m.name
                      });
                    }
                    
                    const label = resolvedLabel;
                    const nx = e?.nativeEvent?.clientX;
                    const ny = e?.nativeEvent?.clientY;
                    
                    // Store this event with its renderOrder for processing
                    // Use meshId as part of key to avoid overwriting events with same renderOrder
                    const eventKey = `${renderOrder}-${meshId}`;
                    pendingEventsRef.current.set(eventKey, {
                      label,
                      x: nx,
                      y: ny,
                      meshId,
                      renderOrder,
                      meshObject: e.object // Store the mesh object
                    });
                    
                    // Debug: log Bolt events specifically
                    if (lowerName?.includes('bolt')) {
                      console.log(`🔵 [btobRender] Bolt event stored:`, {
                        meshName,
                        meshId,
                        renderOrder,
                        label,
                        eventKey,
                        pendingEventsCount: pendingEventsRef.current.size
                      });
                    }
                    
                    // Update active mesh reference if this has higher priority
                    const currentActive = activeMeshRef.current;
                    const currentRenderOrder = currentActive?.userData?.renderOrder ?? -1;
                    
                    if (renderOrder > currentRenderOrder || currentActive === null) {
                      activeMeshRef.current = e.object;
                      hoveredMeshDataRef.current = { label, x: nx, y: ny };
                    }
                    
                    // Use requestAnimationFrame to batch process all events and pick the highest priority
                    // This ensures that even if multiple meshes fire events in the same frame,
                    // only the highest priority one will be processed
                    if (!rafScheduledRef.current) {
                      rafScheduledRef.current = true;
                      requestAnimationFrame(() => {
                        // Find the highest priority event among all pending events
                        let highestPriority = -1;
                        let highestPriorityEvent = null;
                        
                        // Debug: log all pending events
                        if (pendingEventsRef.current.size > 0) {
                          console.log(`[btobRender] Processing ${pendingEventsRef.current.size} pending hover events:`, 
                            Array.from(pendingEventsRef.current.entries()).map(([key, evt]) => ({
                              eventKey: key,
                              renderOrder: evt.renderOrder,
                              meshId: evt.meshId,
                              label: evt.label,
                              meshName: evt.meshObject?.userData?.meshName
                            }))
                          );
                        }
                        
                        // Find highest priority event by comparing renderOrder values
                        pendingEventsRef.current.forEach((eventData, eventKey) => {
                          if (eventData.renderOrder > highestPriority) {
                            highestPriority = eventData.renderOrder;
                            highestPriorityEvent = eventData;
                          }
                        });
                        
                        // Process the highest priority event (regardless of which mesh triggered this frame)
                        if (highestPriorityEvent) {
                          // Debug: log which event was selected
                          console.log(`[btobRender] Selected highest priority event:`, {
                            renderOrder: highestPriority,
                            meshId: highestPriorityEvent.meshId,
                            label: highestPriorityEvent.label,
                            meshName: highestPriorityEvent.meshObject?.userData?.meshName
                          });
                          
                          if (onHoverLabel && typeof onHoverLabel === 'function') {
                            onHoverLabel(highestPriorityEvent.label, highestPriorityEvent.x, highestPriorityEvent.y);
                          }
                          if (hoveredMeshId !== highestPriorityEvent.meshId) {
                            setHoveredMeshId(highestPriorityEvent.meshId);
                          }
                          // Update active mesh reference to the highest priority mesh
                          if (highestPriorityEvent.meshObject) {
                            activeMeshRef.current = highestPriorityEvent.meshObject;
                          }
                          hoveredMeshDataRef.current = {
                            label: highestPriorityEvent.label,
                            x: highestPriorityEvent.x,
                            y: highestPriorityEvent.y
                          };
                        }
                        
                        // Clear processed events and reset RAF flag
                        pendingEventsRef.current.clear();
                        rafScheduledRef.current = false;
                      });
                    }
                  }}
                  onPointerOut={(e) => {
                    // Only clear if this was the active mesh
                    if (activeMeshRef.current === e.object) {
                      activeMeshRef.current = null;
                      hoveredMeshDataRef.current = null;
                      if (hoveredMeshId === meshId) {
                        if (onHoverEnd && typeof onHoverEnd === 'function') {
                          onHoverEnd();
                        }
                        setHoveredMeshId(null);
                      }
                    }
                  }}
                >
                  <meshPhysicalMaterial
                    attach="material"
                    color={color}
                    metalness={0.3}
                    roughness={0.4}
                    opacity={1.0}
                    transparent={false}
                    clearcoat={0.8}
                    clearcoatRoughness={0.2}
                    emissive={isHovered ? "#8cc480" : undefined}
                    emissiveIntensity={isHovered ? 0.2 : 0}
                    depthWrite={!isHovered}
                  />
                </mesh>
                <primitive
                  object={
                    new THREE.LineSegments(
                      new THREE.EdgesGeometry(m.geometry, 15),
                      new THREE.LineBasicMaterial({ color: isHovered ? "#9fda90" : "black", linewidth: isHovered ? 2 : 1 })
                    )
                  }
                  scale={modelScale}
                  rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
                  position={modelPosition}
                />
              </group>
            );
          })}
        </>
      )}

      {/* Beam Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Beam") && !activeViews.includes("Model") && activeViews.length === 1 && geometryBeam && (
        <>
          <mesh
            geometry={geometryBeam}
            scale={modelScale}
            position={modelPosition}
            rotation={[Math.PI / -2, 0, 0]}
            renderOrder={0}
          >
            <meshPhysicalMaterial
              color={partColors.Beam}
              attach="material"
              metalness={0.25}
              roughness={0.3}
              opacity={1.0}
              transparent={true}
              transmission={0.008}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryBeam, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={modelPosition}
          />
        </>
      )}

      {/* Column Section - Keep existing material */}
      {selectedView === "Column" && geometryColumn && (
        <>
          <mesh
            geometry={geometryColumn}
            scale={modelScale}
            position={modelPosition}
            rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
            renderOrder={0}
          >
            <meshPhysicalMaterial
              color={partColors.Column}
              attach="material"
              metalness={0.25}
              roughness={0.3}
              opacity={1.0}
              transparent={true}
              transmission={0.008}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryColumn, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
            position={modelPosition}
          />
        </>
      )}

      {/* Plate Section - Blue Solid Material */}
      {selectedView === "Plate" && geometryPlate && (
        <>
          <mesh
            geometry={geometryPlate}
            scale={modelScale}
            position={modelPosition}
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              attach="material"
              color="#2E5A87"
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryPlate, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={modelPosition}
          />
        </>
      )}

      {/* FIXED: CleatAngle Section - only show if single selection (not multi-select) */}
      {activeViews.includes("CleatAngle") && !activeViews.includes("Model") && activeViews.length === 1 && geometryCleatAngle && (
        <>
          <mesh
            geometry={geometryCleatAngle}
            scale={modelScale}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]} // Slightly offset
            rotation={[Math.PI / -2, 0, 0]}
            renderOrder={1}
          >
            <meshPhysicalMaterial
              attach="material"
              color="#2E5A87"
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryCleatAngle, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]}
          />
        </>
      )}

      {/* FIXED: SeatedAngle Section - only show if single selection (not multi-select) */}
      {activeViews.includes("SeatedAngle") && !activeViews.includes("Model") && activeViews.length === 1 && geometrySeatedAngle && (
        <>
          <mesh
            geometry={geometrySeatedAngle}
            scale={modelScale}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]} // Slightly offset
            rotation={[Math.PI / -2, 0, 0]}
            renderOrder={1}
          >
            <meshPhysicalMaterial
              attach="material"
              color="#2E5A87"
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometrySeatedAngle, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]}
          />
        </>
      )}
      {/* Connector Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Connector") && !activeViews.includes("Model") && activeViews.length === 1 && geometryConnector && (
        <>
          <mesh
            geometry={geometryConnector}
            scale={modelScale}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]} // Slightly offset
            rotation={[Math.PI / -2, 0, 0]}
            renderOrder={1}
          >
            <meshPhysicalMaterial
              attach="material"
              color="#2E5A87"
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryConnector, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]}
          />
        </>
      )}

      {/* Member Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Member") && !activeViews.includes("Model") && activeViews.length === 1 && geometryMember && (
        <>
          <mesh
            geometry={geometryMember}
            scale={0.008}
            position={[0, 0, 4]}
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              color="#808080"
              attach="material"
              metalness={0.25}
              roughness={0.3}
              opacity={1.0}
              transparent={true}
              transmission={0.008}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          {/* Member outline */}
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryMember, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={0.008}
            rotation={[Math.PI / -2, 0, 0]}
            position={[0, 0, 4]}
          />
        </>
      )}

      {/* EndPlate Section - only show if single selection (not multi-select) */}
      {(activeViews.includes("EndPlate") || activeViews.includes("Endplate")) && !activeViews.includes("Model") && activeViews.length === 1 && geometryEndplate && (
        <>
          <mesh
            geometry={geometryEndplate}
            scale={0.008}
            position={[0, 0, 4]}
            rotation={[Math.PI / -2, 0, 0]}
            renderOrder={1}
          >
            <meshPhysicalMaterial
              attach="material"
              map={texture}
              metalness={0.25}
              roughness={0.1}
              opacity={1.0}
              transparent={true}
              transmission={0.99}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          {/* Endplate outline */}
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryEndplate, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={0.008}
            rotation={[Math.PI / -2, 0, 0]}
            position={[0, 0, 4]}
          />
        </>
      )}

      {/* Controls */}
      <OrbitControls enableDamping={false} target={[0, 0, 0]} />
    </group>
  );
}

export default Model;