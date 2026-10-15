export interface CarConfig {
  carLength: number;
  carWidth: number;
  wheelbase: number;
  frontOverhang: number;
  rearOverhang: number;
  maxSteeringAngle: number;
  steeringRatio: number;
  driverEyePosition: [number, number, number];
  mirrorPosition: [number, number, number];
  driverFov: number;
  mirrorFov: number;
  leftMirrorYaw: number;
  rightMirrorYaw: number;
  mirrorPitch: number;
  steeringSpeed: number;
}

// TODO: NEED USER CALIBRATION — illustrative sedan, NOT a measured school vehicle.
// Coordinates: rear axle origin, +x right, +y up, -z forward. Angles in degrees.
export const defaultCarConfig: CarConfig = {
  carLength: 4.5, carWidth: 1.74, wheelbase: 2.6,
  frontOverhang: 1.0, rearOverhang: 0.9,
  maxSteeringAngle: 34, steeringRatio: 16,
  driverEyePosition: [-0.34, 1.25, -1.7],
  mirrorPosition: [0.99, 1.06, -2.0],
  driverFov: 63, mirrorFov: 49,
  leftMirrorYaw: 18, rightMirrorYaw: 18, mirrorPitch: 14,
  steeringSpeed: 250,
};

const storageKey = 'yongqing.calibration.v1';
const inRange = (v: unknown, fallback: number, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;

export function sanitizeConfig(raw: Partial<CarConfig>): CarConfig {
  const d = defaultCarConfig;
  const length = inRange(raw.carLength, d.carLength, 4, 5.4);
  const wheelbase = inRange(raw.wheelbase, d.wheelbase, 2.3, 3);
  const rear = inRange(raw.rearOverhang, d.rearOverhang, 0.6, 0.95);
  const eye = Array.isArray(raw.driverEyePosition) ? raw.driverEyePosition : d.driverEyePosition;
  const mirror = Array.isArray(raw.mirrorPosition) ? raw.mirrorPosition : d.mirrorPosition;
  const width = inRange(raw.carWidth, d.carWidth, 1.5, 2.0);
  return {
    carLength: length, carWidth: width, wheelbase, rearOverhang: rear,
    frontOverhang: length - wheelbase - rear,
    maxSteeringAngle: inRange(raw.maxSteeringAngle, d.maxSteeringAngle, 20, 42),
    steeringRatio: inRange(raw.steeringRatio, d.steeringRatio, 12, 20),
    driverEyePosition: [inRange(eye[0], d.driverEyePosition[0], -0.6, -0.1), inRange(eye[1], d.driverEyePosition[1], 0.95, 1.65), inRange(eye[2], d.driverEyePosition[2], -2.15, -1.1)],
    mirrorPosition: [Math.max(width / 2 + 0.04, inRange(mirror[0], d.mirrorPosition[0], 0.8, 1.2)), inRange(mirror[1], d.mirrorPosition[1], 0.9, 1.4), inRange(mirror[2], d.mirrorPosition[2], -2.4, -1.7)],
    driverFov: inRange(raw.driverFov, d.driverFov, 40, 90),
    mirrorFov: inRange(raw.mirrorFov, d.mirrorFov, 30, 75),
    leftMirrorYaw: inRange(raw.leftMirrorYaw, d.leftMirrorYaw, 0, 35),
    rightMirrorYaw: inRange(raw.rightMirrorYaw, d.rightMirrorYaw, 0, 35),
    mirrorPitch: inRange(raw.mirrorPitch, d.mirrorPitch, 0, 32),
    steeringSpeed: inRange(raw.steeringSpeed, d.steeringSpeed, 100, 480),
  };
}

export function loadCarConfig(): CarConfig {
  try { return sanitizeConfig(JSON.parse(localStorage.getItem(storageKey) || '{}')); }
  catch { return { ...defaultCarConfig }; }
}
export function saveCarConfig(config: CarConfig): boolean {
  try { localStorage.setItem(storageKey, JSON.stringify(config)); return true; }
  catch { return false; }
}
