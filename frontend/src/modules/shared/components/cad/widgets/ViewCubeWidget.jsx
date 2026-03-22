import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Hud, Html, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import {
  VC_OFFSET,
  VC_FACE_W,
  VC_EDGE_LENGTH,
  VC_EDGE_W,
  VC_DEPTH,
  VC_CORNER_R,
  VC_COL_EDGE,
  VC_COL_CORNER,
  VC_COL_HOVER,
  VC_LABELS,
  makeLabelTexture,
  snapFromCoord,
  applyCubeQuaternionToOrbitCamera,
  easeInOutCubic,
  getOrbitDistance,
  syncOrbitControlsFromCamera,
  projectOnTrackball,
} from "./viewCubeUtils";
import { useCadSceneContext } from "../context/CadSceneContext";

const VC_ORTHO_SIZE = 3.1;
const CUBE_PX = 150;
const DRAG_THRESHOLD_PX = 5;
const SNAP_MS = 350;

const _qYaw180 = new THREE.Quaternion();
const _axisWorldY = new THREE.Vector3(0, 1, 0);
const _tempPersp = new THREE.PerspectiveCamera();
/** Arcball drag (AIS_ViewCube-style): P₁ and quaternion(P₀→P₁); see projectOnTrackball in viewCubeUtils.js */
const _pTrackballNext = new THREE.Vector3();
const _qArcball = new THREE.Quaternion();

/**
 * Pointer (client) → cube widget local pixels [0,CUBE_PX]² origin top-left of widget square.
 */
function clientToCubeLocal(clientX, clientY, gl, size, cubeCenterPxX, cubeCenterPxY) {
  const rect = gl.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * size.width;
  const y = ((clientY - rect.top) / rect.height) * size.height;
  const half = CUBE_PX / 2;
  return {
    localX: x - (cubeCenterPxX - half),
    localY: y - (cubeCenterPxY - half),
  };
}

/**
 * ViewCubeWidget — 26-piece chamfered navigation cube (AIS_ViewCube-style).
 * Renders inside Drei `Hud` (single WebGL context with main scene).
 */
const ViewCubeWidget = ({ controlsRef = null }) => {
  const { camera: mainCamera } = useThree();
  const { orbitTarget } = useCadSceneContext();

  const controlsRefBox = useRef(controlsRef);
  controlsRefBox.current = controlsRef;

  const orbitTargetRef = useRef(orbitTarget);
  const mainCameraRef = useRef(mainCamera);
  useEffect(() => {
    orbitTargetRef.current = orbitTarget;
  }, [orbitTarget]);
  mainCameraRef.current = mainCamera;

  useEffect(() => {
    return () => {
      const c = controlsRefBox.current?.current;
      if (c) c.enabled = true;
    };
  }, []);

  const cubeGroupRef = useRef(null);
  const piecesRef = useRef([]);
  const snapTargetRef = useRef(null);
  const dragDistRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hoveredRef = useRef(null);
  const radiusFrozenRef = useRef(null);

  const meshes = useMemo(() => {
    const allPieces = [];

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          const sum = Math.abs(x) + Math.abs(y) + Math.abs(z);
          const type = sum === 1 ? "face" : sum === 2 ? "edge" : "corner";

          let geo;
          if (type === "face") {
            geo = new THREE.BoxGeometry(VC_FACE_W, VC_FACE_W, VC_DEPTH);
          } else if (type === "edge") {
            geo = new THREE.BoxGeometry(VC_EDGE_W, VC_EDGE_LENGTH, VC_DEPTH);
          } else {
            geo = new THREE.CylinderGeometry(VC_CORNER_R, VC_CORNER_R, VC_DEPTH, 3);
            geo.rotateX(Math.PI / 2);
          }

          let mat;
          if (type === "face") {
            const key = `${x},${y},${z}`;
            const label = VC_LABELS[key] || "";
            mat = new THREE.MeshStandardMaterial({
              map: makeLabelTexture(label),
              roughness: 0.3,
              metalness: 0.05,
              emissive: new THREE.Color(0x000000),
            });
          } else {
            mat = new THREE.MeshStandardMaterial({
              color: type === "edge" ? VC_COL_EDGE : VC_COL_CORNER,
              roughness: 0.5,
              emissive: new THREE.Color(0x000000),
            });
          }

          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(x * VC_OFFSET, y * VC_OFFSET, z * VC_OFFSET);
          mesh.userData = { type, coord: [x, y, z] };

          if (type === "face") {
            if (y !== 0 && x === 0 && z === 0) {
              mesh.up.set(0, 0, y > 0 ? -1 : 1);
            }
          } else if (type === "edge") {
            if (x === 0) mesh.up.set(1, 0, 0);
            else if (y === 0) mesh.up.set(0, 1, 0);
            else if (z === 0) mesh.up.set(0, 0, 1);
          }

          const outward = new THREE.Vector3(x, y, z).normalize().multiplyScalar(100);
          mesh.lookAt(outward);

          allPieces.push(mesh);
        }
      }
    }

    piecesRef.current = allPieces;
    return allPieces;
  }, []);

  useEffect(
    () => () => {
      meshes.forEach((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        const mat = obj.material;
        if (mat) {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        }
      });
      piecesRef.current = [];
    },
    [meshes]
  );

  const setHover = useCallback((mesh, on) => {
    if (!mesh?.material?.emissive) return;
    mesh.material.emissive.set(on ? VC_COL_HOVER : 0x000000);
  }, []);

  const applyFlip180 = useCallback(() => {
    const cg = cubeGroupRef.current;
    if (!cg) return;

    const ot = orbitTargetRef.current;
    const targetVec =
      Array.isArray(ot) && ot.length === 3
        ? new THREE.Vector3(ot[0], ot[1], ot[2])
        : new THREE.Vector3(0, 0, 0);

    const ctrl = controlsRefBox.current?.current;
    const radius = ctrl
      ? getOrbitDistance(ctrl) ?? ctrl.object.position.distanceTo(ctrl.target)
      : mainCameraRef.current.position.distanceTo(targetVec);

    const fromQuat = cg.quaternion.clone();
    _qYaw180.setFromAxisAngle(_axisWorldY, Math.PI);
    const toQuat = fromQuat.clone();
    toQuat.premultiply(_qYaw180);

    snapTargetRef.current = {
      startTimeMs: performance.now(),
      fromQuat,
      toQuat,
      lookAt: targetVec.clone(),
      radius,
    };
  }, []);

  /** Mirror cube group orientation to main orbit camera (call after each arcball step + in useFrame while dragging). */
  const syncDragFromCube = useCallback(() => {
    const group = cubeGroupRef.current;
    if (!group) return;
    const controls = controlsRefBox.current?.current;
    if (controls) {
      const orbitTargetVec = controls.target;
      const radius =
        radiusFrozenRef.current ??
        getOrbitDistance(controls) ??
        controls.object.position.distanceTo(orbitTargetVec);
      applyCubeQuaternionToOrbitCamera(
        controls.object,
        orbitTargetVec,
        group.quaternion,
        radius
      );
      syncOrbitControlsFromCamera(controls);
    } else {
      const ot = orbitTargetRef.current;
      const targetVec =
        Array.isArray(ot) && ot.length === 3
          ? new THREE.Vector3(ot[0], ot[1], ot[2])
          : new THREE.Vector3(0, 0, 0);
      const radius =
        radiusFrozenRef.current ?? mainCameraRef.current.position.distanceTo(targetVec);
      applyCubeQuaternionToOrbitCamera(
        mainCameraRef.current,
        targetVec,
        group.quaternion,
        radius
      );
    }
  }, []);

  const handleFaceSnap = useCallback((coord) => {
    const ot = orbitTargetRef.current;
    const target =
      Array.isArray(ot) && ot.length === 3
        ? new THREE.Vector3(ot[0], ot[1], ot[2])
        : new THREE.Vector3(0, 0, 0);
    const cam = mainCameraRef.current;
    const radius = cam.position.distanceTo(target);
    const { position, up } = snapFromCoord(coord);
    const targetPosition = position.clone().multiplyScalar(radius).add(target);
    _tempPersp.position.copy(targetPosition);
    _tempPersp.up.copy(up);
    _tempPersp.lookAt(target);
    const toQuat = _tempPersp.quaternion.clone();
    const group = cubeGroupRef.current;
    if (!group) return;
    const fromQuat = group.quaternion.clone();

    const ctrl = controlsRefBox.current?.current;
    if (ctrl) ctrl.enabled = false;

    snapTargetRef.current = {
      startTimeMs: performance.now(),
      fromQuat,
      toQuat,
      lookAt: target.clone(),
      radius,
    };
  }, []);

  useFrame(() => {
    const group = cubeGroupRef.current;
    if (!group) return;

    const snap = snapTargetRef.current;
    if (snap) {
      const elapsed = performance.now() - snap.startTimeMs;
      const t = Math.min(1, elapsed / SNAP_MS);
      const eased = easeInOutCubic(t);
      group.quaternion.slerpQuaternions(snap.fromQuat, snap.toQuat, eased);

      const controls = controlsRefBox.current?.current;
      if (controls) {
        controls.target.copy(snap.lookAt);
        applyCubeQuaternionToOrbitCamera(
          controls.object,
          controls.target,
          group.quaternion,
          snap.radius
        );
        syncOrbitControlsFromCamera(controls);
      } else {
        const ot = orbitTargetRef.current;
        const targetVec =
          Array.isArray(ot) && ot.length === 3
            ? new THREE.Vector3(ot[0], ot[1], ot[2])
            : new THREE.Vector3(0, 0, 0);
        applyCubeQuaternionToOrbitCamera(
          mainCameraRef.current,
          targetVec,
          group.quaternion,
          snap.radius
        );
      }

      if (t >= 1) {
        group.quaternion.copy(snap.toQuat);
        const controlsDone = controlsRefBox.current?.current;
        if (controlsDone) {
          controlsDone.target.copy(snap.lookAt);
          applyCubeQuaternionToOrbitCamera(
            controlsDone.object,
            controlsDone.target,
            group.quaternion,
            snap.radius
          );
          syncOrbitControlsFromCamera(controlsDone);
          // Match lookAt/controls.update() quaternion (may differ slightly from slerp toQuat roll).
          group.quaternion.copy(controlsDone.object.quaternion);
          controlsDone.enabled = true;
          syncOrbitControlsFromCamera(controlsDone);
        } else {
          const ot = orbitTargetRef.current;
          const targetVec =
            Array.isArray(ot) && ot.length === 3
              ? new THREE.Vector3(ot[0], ot[1], ot[2])
              : new THREE.Vector3(0, 0, 0);
          applyCubeQuaternionToOrbitCamera(
            mainCameraRef.current,
            targetVec,
            group.quaternion,
            snap.radius
          );
          group.quaternion.copy(mainCameraRef.current.quaternion);
        }
        snapTargetRef.current = null;
      }
    } else if (isDraggingRef.current) {
      syncDragFromCube();
    } else {
      group.quaternion.copy(mainCameraRef.current.quaternion);
    }
  });

  return (
    <Hud renderPriority={1}>
      <ViewCubeHudScene
        cubeGroupRef={cubeGroupRef}
        meshes={meshes}
        controlsRefBox={controlsRefBox}
        orbitTargetRef={orbitTargetRef}
        mainCameraRef={mainCameraRef}
        snapTargetRef={snapTargetRef}
        dragDistRef={dragDistRef}
        isDraggingRef={isDraggingRef}
        hoveredRef={hoveredRef}
        radiusFrozenRef={radiusFrozenRef}
        setHover={setHover}
        applyFlip180={applyFlip180}
        handleFaceSnap={handleFaceSnap}
        syncDragFromCube={syncDragFromCube}
      />
    </Hud>
  );
};

function ViewCubeHudScene({
  cubeGroupRef,
  meshes,
  controlsRefBox,
  orbitTargetRef,
  mainCameraRef,
  snapTargetRef,
  dragDistRef,
  isDraggingRef,
  hoveredRef,
  radiusFrozenRef,
  setHover,
  applyFlip180,
  handleFaceSnap,
  syncDragFromCube,
}) {
  const { size, gl } = useThree();
  const pointerDownMeshRef = useRef(null);
  /** P₀ on the virtual unit sphere at press / previous move (incremental arcball). */
  const dragSpherePrevRef = useRef(new THREE.Vector3());
  const lastClientRef = useRef({ x: 0, y: 0 });
  const pointerCaptureRef = useRef(null);

  const layout = useMemo(() => {
    const worldPerPixel = (2 * VC_ORTHO_SIZE) / CUBE_PX;
    const worldW = worldPerPixel * size.width;
    const worldH = worldPerPixel * size.height;
    const left = -worldW / 2;
    const right = worldW / 2;
    const top = worldH / 2;
    const bottom = -worldH / 2;

    const margin = 15;
    const marginTop = 80;
    const cubeHalfPx = CUBE_PX / 2;
    const pixelX = size.width - margin - cubeHalfPx;
    const pixelY = marginTop + cubeHalfPx;
    const worldX = left + (pixelX / size.width) * (right - left);
    const worldY = top - (pixelY / size.height) * (top - bottom);

    /**
     * Approximate half-extent of the 26-piece mesh in HUD world units (much smaller than
     * the 150px layout box). Keeps toolbar/hint visually tight to the cube, not floating high.
     */
    const CUBE_MESH_HALF_WORLD = 1.35;
    const gapPx = 4;
    const gapWorld = gapPx * worldPerPixel;
    const btnPx = 32;
    const btnWorld = btnPx * worldPerPixel;
    const gapBetweenPx = 4;
    const gapBetweenWorld = gapBetweenPx * worldPerPixel;
    /** Vertical stack: ↻, +, − (same column, above cube mesh). */
    const toolbarStackWorldH = 3 * btnWorld + 2 * gapBetweenWorld;
    const toolbarCenterY = CUBE_MESH_HALF_WORLD + gapWorld + toolbarStackWorldH / 2;
    const hintLinePx = 14;
    const hintWorld = hintLinePx * worldPerPixel;
    const hintCenterY = -(CUBE_MESH_HALF_WORLD + gapWorld + hintWorld / 2);

    return {
      left,
      right,
      top,
      bottom,
      worldX,
      worldY,
      worldPerPixel,
      toolbarCenterY,
      hintCenterY,
      cubeCenterPxX: pixelX,
      cubeCenterPxY: pixelY,
    };
  }, [size.width, size.height]);

  const onPointerMove = useCallback(
    (e) => {
      e.stopPropagation();
      const mesh = e.object;
      if (mesh !== hoveredRef.current) {
        setHover(hoveredRef.current, false);
        hoveredRef.current = mesh;
        setHover(mesh, true);
      }

      if (e.buttons === 0) {
        isDraggingRef.current = false;
        return;
      }

      if (pointerDownMeshRef.current) {
        const { localX, localY } = clientToCubeLocal(
          e.clientX,
          e.clientY,
          gl,
          size,
          layout.cubeCenterPxX,
          layout.cubeCenterPxY
        );
        projectOnTrackball(localX, localY, CUBE_PX, _pTrackballNext);

        const p0 = dragSpherePrevRef.current;
        if (p0.distanceToSquared(_pTrackballNext) > 1e-8) {
          // AIS arcball: rotation that takes P₀ → P₁; world-first with premultiply
          _qArcball.setFromUnitVectors(p0, _pTrackballNext);
          const cg = cubeGroupRef.current;
          if (cg) {
            cg.quaternion.premultiply(_qArcball);
          }
          p0.copy(_pTrackballNext);
          // Immediate mirror to main camera (same frame as pointer; not only on useFrame)
          syncDragFromCube();
        }

        const last = lastClientRef.current;
        dragDistRef.current += Math.hypot(e.clientX - last.x, e.clientY - last.y);
        lastClientRef.current = { x: e.clientX, y: e.clientY };
        isDraggingRef.current = true;
      }
    },
    [
      cubeGroupRef,
      dragDistRef,
      gl,
      hoveredRef,
      isDraggingRef,
      layout.cubeCenterPxX,
      layout.cubeCenterPxY,
      setHover,
      size,
      syncDragFromCube,
    ]
  );

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      if (e.target?.setPointerCapture) {
        e.target.setPointerCapture(e.pointerId);
        pointerCaptureRef.current = { element: e.target, pointerId: e.pointerId };
      }
      pointerDownMeshRef.current = e.object;
      dragDistRef.current = 0;
      isDraggingRef.current = true;
      snapTargetRef.current = null;

      const { localX, localY } = clientToCubeLocal(
        e.clientX,
        e.clientY,
        gl,
        size,
        layout.cubeCenterPxX,
        layout.cubeCenterPxY
      );
      projectOnTrackball(localX, localY, CUBE_PX, dragSpherePrevRef.current);
      lastClientRef.current = { x: e.clientX, y: e.clientY };

      const ctrl = controlsRefBox.current?.current;
      if (ctrl) {
        radiusFrozenRef.current =
          getOrbitDistance(ctrl) ?? ctrl.object.position.distanceTo(ctrl.target);
      } else {
        const ot = orbitTargetRef.current;
        const targetVec =
          Array.isArray(ot) && ot.length === 3
            ? new THREE.Vector3(ot[0], ot[1], ot[2])
            : new THREE.Vector3(0, 0, 0);
        radiusFrozenRef.current = mainCameraRef.current.position.distanceTo(targetVec);
      }
    },
    [
      controlsRefBox,
      dragDistRef,
      gl,
      isDraggingRef,
      layout.cubeCenterPxX,
      layout.cubeCenterPxY,
      mainCameraRef,
      orbitTargetRef,
      snapTargetRef,
      radiusFrozenRef,
      size,
    ]
  );

  const endDrag = useCallback(() => {
    const cap = pointerCaptureRef.current;
    if (cap?.element?.releasePointerCapture) {
      try {
        cap.element.releasePointerCapture(cap.pointerId);
      } catch {
        /* already released */
      }
    }
    pointerCaptureRef.current = null;
    pointerDownMeshRef.current = null;
    isDraggingRef.current = false;
    radiusFrozenRef.current = null;
  }, [isDraggingRef, radiusFrozenRef]);

  const finishPointerInteraction = useCallback(() => {
    const mesh = pointerDownMeshRef.current;
    if (!mesh) return;
    if (mesh.userData?.coord && dragDistRef.current <= DRAG_THRESHOLD_PX) {
      const { coord } = mesh.userData;
      const key = coord.join(",");
      const name = VC_LABELS[key] || key;
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log(
          `ViewCube → ${mesh.userData.type.toUpperCase()} [${coord.join(", ")}] (${name})`
        );
      }
      handleFaceSnap(coord);
    }
    pointerDownMeshRef.current = null;
    endDrag();
  }, [dragDistRef, endDrag, handleFaceSnap]);

  useEffect(() => {
    window.addEventListener("pointerup", finishPointerInteraction);
    window.addEventListener("pointercancel", finishPointerInteraction);
    return () => {
      window.removeEventListener("pointerup", finishPointerInteraction);
      window.removeEventListener("pointercancel", finishPointerInteraction);
    };
  }, [finishPointerInteraction]);

  const onPointerLeave = useCallback(
    (e) => {
      setHover(hoveredRef.current, false);
      hoveredRef.current = null;
      if (e.buttons === 0) endDrag();
    },
    [endDrag, hoveredRef, setHover]
  );

  return (
    <>
      <OrthographicCamera
        makeDefault
        left={layout.left}
        right={layout.right}
        top={layout.top}
        bottom={layout.bottom}
        near={0.1}
        far={100}
        position={[0, 0, 10]}
      />
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={0.6} />

      <group position={[layout.worldX, layout.worldY, 0]}>
        <Html
          position={[0, layout.toolbarCenterY, 0]}
          transform
          style={{ pointerEvents: "auto" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <button
              type="button"
              aria-label="Rotate view 180 degrees — show opposite side"
              title="Rotate 180° (back ↔ front)"
              onClick={(ev) => {
                ev.stopPropagation();
                applyFlip180();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid rgba(0,0,0,0.18)",
                background: "rgba(245,245,245,0.95)",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              ↻
            </button>
            <button
              type="button"
              aria-label="Zoom in on model"
              title="Zoom in on model"
              onClick={(ev) => {
                ev.stopPropagation();
                document.dispatchEvent(
                  new CustomEvent("cad-camera-action", { detail: "zoom-in" })
                );
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.18)",
                background: "rgba(245,245,245,0.95)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out on model"
              title="Zoom out on model"
              onClick={(ev) => {
                ev.stopPropagation();
                document.dispatchEvent(
                  new CustomEvent("cad-camera-action", { detail: "zoom-out" })
                );
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.18)",
                background: "rgba(245,245,245,0.95)",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              −
            </button>
          </div>
        </Html>

        <group
          ref={cubeGroupRef}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerLeave={onPointerLeave}
        >
          {meshes.map((mesh) => (
            <primitive key={mesh.uuid} object={mesh} />
          ))}
        </group>

        <Html position={[0, layout.hintCenterY, 0]} transform style={{ pointerEvents: "none" }}>
          <div
            style={{
              fontSize: 10,
              color: "rgba(80, 80, 80, 0.95)",
              textAlign: "center",
              marginTop: 4,
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            Drag to rotate view
          </div>
        </Html>
      </group>
    </>
  );
}

export default ViewCubeWidget;
