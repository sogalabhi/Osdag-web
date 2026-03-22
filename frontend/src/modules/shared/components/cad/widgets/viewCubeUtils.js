import * as THREE from "three";

/**
 * ViewCube constants and helpers (aligned with reference ViewCube / demo).
 * Used by ViewCubeWidget for geometry, orientation, labels, and snap math.
 */

const _vViewDir = new THREE.Vector3();
const _vUp = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);

/**
 * Ease-in-out cubic for [0,1] → [0,1].
 */
export function easeInOutCubic(t) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Orbit distance — prefers OrbitControls.getDistance when available (three-stdlib).
 */
export function getOrbitDistance(controls) {
  if (!controls) return null;
  if (typeof controls.getDistance === "function") return controls.getDistance();
  return controls.object.position.distanceTo(controls.target);
}

/**
 * After programmatic camera/orbit writes, keep OrbitControls internal state aligned.
 */
export function syncOrbitControlsFromCamera(controls) {
  if (!controls) return;
  controls.update();
}

/**
 * Place orbit camera on sphere around `orbitTarget` so its orientation matches `cubeQuat`
 * (same convention as idle: cube group quaternion mirrors the main camera).
 */
export function applyCubeQuaternionToOrbitCamera(
  camera,
  orbitTarget,
  cubeQuat,
  radius,
  viewDirOut = _vViewDir,
  upOut = _vUp
) {
  viewDirOut.set(0, 0, -1).applyQuaternion(cubeQuat).normalize();
  camera.position.copy(orbitTarget).sub(viewDirOut.clone().multiplyScalar(radius));
  upOut.set(0, 1, 0).applyQuaternion(cubeQuat).normalize();
  camera.up.copy(upOut);
  camera.lookAt(orbitTarget);
}

export const VC_OFFSET = 1.15;
export const VC_FACE_W = 1.58;
export const VC_EDGE_LENGTH = 1.58;
export const VC_EDGE_W = 0.3;
export const VC_DEPTH = 0.26;
export const VC_CORNER_R = 0.3;

export const VC_COL_EDGE = 0xcccccc;
export const VC_COL_CORNER = 0x999999;
export const VC_COL_HOVER = 0x00c8ff;

export const VC_LABELS = {
  "0,1,0": "TOP",
  "0,-1,0": "BOTTOM",
  "0,0,1": "FRONT",
  "0,0,-1": "BACK",
  "1,0,0": "RIGHT",
  "-1,0,0": "LEFT",
};

/**
 * Face label texture (white/light grey background, dark text).
 */
export function makeLabelTexture(text) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  if (text) {
    const fontSize = text.length > 4 ? 17 : 22;
    ctx.fillStyle = "#333333";
    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 2;
    ctx.fillText(text, size / 2, size / 2);
  }

  return new THREE.CanvasTexture(canvas);
}

/**
 * From piece coord [cx, cy, cz], compute target camera position (unit) and up vector
 * for snapping the main camera. Caller multiplies position by radius.
 *
 * `up` matches Three.js / Matrix4.lookAt pole handling (same idea as OrbitControls):
 * world +Y when valid; at ±Y poles use a Z reference that depends on TOP vs BOTTOM
 * (`ny` sign) so lookAt quaternions are not roll-symmetric in a way that confuses
 * the snap animation / OrbitControls sync.
 */
export function snapFromCoord(coord) {
  const [cx, cy, cz] = coord;
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
  const nx = cx / len;
  const ny = cy / len;
  const nz = cz / len;

  const position = new THREE.Vector3(nx, ny, nz);
  // View direction: from camera toward target (camera looks down -Z in local space).
  const forward = position.clone().normalize().negate();
  let up = _worldUp.clone();
  if (Math.abs(forward.dot(_worldUp)) > 0.999) {
    // ±Y pole: TOP uses (0,0,+1), BOTTOM uses (0,0,-1) — distinct roll vs same up for both
    up.set(0, 0, ny > 0 ? 1 : -1);
    if (Math.abs(forward.dot(up)) > 0.999) {
      up.set(1, 0, 0);
    }
  }
  return { position, up };
}

/** 1/√2 — hemisphere vs hyperbola branch (same as OCCT/AIS_ViewCube arcball threshold). */
const _SQRT1_2 = 0.7071067811865476;

/**
 * Map pointer position on the cube widget to a point on the unit sphere (Shoemake arcball).
 * Same math as AIS_ViewCube: inside the circle, points lie on a hemisphere (z from sphere);
 * outside, the hyperbola branch avoids the rim singularity.
 *
 * Drag rotation pairs successive sphere points P₀ → P₁ via
 * `Quaternion.setFromUnitVectors(P₀, P₁)`, then `group.quaternion.premultiply(thatQuat)`,
 * then **P₀ ← P₁** so each move tracks the surface under the cursor (not velocity-based).
 *
 * @param {number} localX - [0, canvasSize] from left of widget square
 * @param {number} localY - [0, canvasSize] from top
 * @param {number} canvasSize - edge length of the hit area (e.g. CUBE_PX)
 * @param {THREE.Vector3} out - written in place (avoids per-move allocation)
 */
export function projectOnTrackball(localX, localY, canvasSize, out) {
  const x = (localX / canvasSize) * 2 - 1;
  const y = -((localY / canvasSize) * 2 - 1);
  const d = Math.sqrt(x * x + y * y);
  if (d <= _SQRT1_2) {
    const z = Math.sqrt(Math.max(0, 1 - d * d));
    out.set(x, y, z).normalize();
  } else {
    out.set(x, y, 0.5 / d).normalize();
  }
  return out;
}
