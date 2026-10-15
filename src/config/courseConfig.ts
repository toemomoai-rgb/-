// TODO: NEED USER CALIBRATION — geometric test course only, not Yongqing's exam map.
export const courseConfig = {
  name: '直線與直角彎',
  laneWidth: 5.8,
  straight: { minZ: -36, maxZ: 18 },
  exit: { minX: -2.9, maxX: 33, minZ: -36, maxZ: -30.2 },
  startPosition: { x: -0.6, z: 7, heading: 0 },
  paintWidth: 0.1,
  boundaryTolerance: 0.07,
  terrainSize: 180,
};
