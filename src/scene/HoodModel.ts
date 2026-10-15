import * as THREE from 'three';
import type { CarConfig } from '../config/carConfig';

// TODO: NEED USER CALIBRATION — visible sheet metal and washer positions are provisional.
// No dots, arrows, or arbitrary training markers: these are physical vehicle parts.
export function hoodSurface(config: CarConfig, across: number, depth: number): THREE.Vector3 {
  const front = -config.wheelbase - config.frontOverhang;
  const halfWidth = config.carWidth / 2 * (0.91 + 0.06 * depth);
  const crown = 0.025 * (1 - across * across) * Math.sin(Math.PI * depth);
  return new THREE.Vector3(across * halfWidth, config.hoodHeight - 0.12 * (1 - depth) + crown, front + config.hoodLength * depth);
}

export function hoodLandmarks(config: CarConfig) {
  const washerAcross = config.washerSpacing / config.carWidth / (0.91 + 0.06 * config.washerDepthRatio);
  return {
    corners: [hoodSurface(config, -1, 0), hoodSurface(config, 1, 0), hoodSurface(config, -1, 1), hoodSurface(config, 1, 1)],
    washers: [hoodSurface(config, -washerAcross, config.washerDepthRatio), hoodSurface(config, washerAcross, config.washerDepthRatio)],
  };
}

export function createHood(config: CarConfig, paint: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group(); group.name = '完整引擎蓋';
  const across = [-1, -0.82, -0.45, 0, 0.45, 0.82, 1], rows = 10;
  const vertices: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (const x of across) {
    const point = hoodSurface(config, x, row / rows); vertices.push(point.x, point.y, point.z);
  }
  const columns = across.length;
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns - 1; col++) {
    const a = row * columns + col, b = a + 1, d = a + columns, e = d + 1;
    indices.push(a, d, b, b, d, e);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const panel = new THREE.Mesh(geometry, paint); panel.name = '引擎蓋鈑件'; group.add(panel);

  const seamMaterial = new THREE.LineBasicMaterial({ color: '#8caaa0', transparent: true, opacity: 0.65 });
  const perimeter = [hoodSurface(config, -1, 0), hoodSurface(config, 1, 0), hoodSurface(config, 1, 1), hoodSurface(config, -1, 1), hoodSurface(config, -1, 0)];
  perimeter.forEach(p => { p.y += 0.002; });
  const seam = new THREE.Line(new THREE.BufferGeometry().setFromPoints(perimeter), seamMaterial); seam.name = '引擎蓋邊緣接縫'; group.add(seam);
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 11 }, (_, i) => hoodSurface(config, side * 0.64, 0.08 + i * 0.084));
    points.forEach(p => { p.y += 0.002; });
    const crease = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#b1c7be' })); group.add(crease);
  }

  const rubber = new THREE.MeshStandardMaterial({ color: '#27342e', roughness: 0.85 });
  const metal = new THREE.MeshStandardMaterial({ color: '#66736d', metalness: 0.35, roughness: 0.7 });
  hoodLandmarks(config).washers.forEach((point, i) => {
    const nozzle = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), rubber);
    nozzle.name = i === 0 ? '左雨刷噴頭' : '右雨刷噴頭';
    nozzle.scale.set(1, 0.55, 0.85); nozzle.position.copy(point); nozzle.position.y += 0.009; group.add(nozzle);
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 5), metal);
    hole.position.copy(nozzle.position); hole.position.z -= 0.013; hole.position.y += 0.003; group.add(hole);
  });
  const back = hoodSurface(config, 0, 1);
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(config.carWidth * 0.95, 0.026, 0.11), rubber);
  cowl.name = '擋風玻璃下緣集水槽'; cowl.position.set(0, back.y - 0.015, back.z + 0.06); group.add(cowl);
  for (const side of [-1, 1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(config.carWidth * 0.32, 0.014, 0.02), rubber);
    blade.name = side < 0 ? '左雨刷' : '右雨刷'; blade.position.set(side * config.carWidth * 0.23, back.y + 0.015, back.z + 0.05);
    blade.rotation.y = side * 0.035; group.add(blade);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.011, 0.012), metal);
    arm.position.set(side * config.carWidth * 0.24, back.y + 0.018, back.z + 0.07); arm.rotation.y = side * 0.22; group.add(arm);
  }
  group.traverse(object => { object.layers.set(1); object.layers.enable(2); });
  return group;
}
