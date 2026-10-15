import * as THREE from 'three';
import { courseConfig as c } from '../config/courseConfig';

const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z); mesh.receiveShadow = true;
  return mesh;
}
function groundTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#66716d'; ctx.fillRect(0, 0, 128, 128);
  let seed = 42;
  for (let i = 0; i < 5000; i++) {
    seed = (seed * 16807) % 2147483647; const x = seed % 128;
    seed = (seed * 16807) % 2147483647; const y = seed % 128;
    ctx.fillStyle = i % 2 ? '#718079' : '#586761';
    ctx.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(32, 32); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCourse(): THREE.Group {
  const group = new THREE.Group();
  const grass = material('#b9c5a3'), paint = material('#f1f0e4'), curb = material('#c7c8bd');
  const asphalt = new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 1 });
  group.add(box(c.terrainSize, 0.1, c.terrainSize, 0, -0.09, -20, grass));
  const s = c.straight, e = c.exit;
  group.add(box(c.laneWidth, 0.06, s.maxZ - s.minZ, 0, -0.015, (s.maxZ + s.minZ) / 2, asphalt));
  group.add(box(e.maxX - e.minX, 0.06, e.maxZ - e.minZ, (e.maxX + e.minX) / 2, -0.013, (e.maxZ + e.minZ) / 2, asphalt));
  // Real road paint only: no tutorial arrows, points, or checkpoint markers.
  const points = [[-c.laneWidth / 2, s.maxZ], [c.laneWidth / 2, s.maxZ], [c.laneWidth / 2, e.maxZ], [e.maxX, e.maxZ], [e.maxX, e.minZ], [-c.laneWidth / 2, e.minZ]];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const line = box(c.paintWidth, 0.014, Math.hypot(dx, dz), (a[0] + b[0]) / 2, 0.032, (a[1] + b[1]) / 2, paint);
    line.rotation.y = Math.atan2(dx, dz); group.add(line);
  }
  group.add(box(c.laneWidth - 0.25, 0.016, 0.22, 0, 0.035, 11.8, paint));

  // Peripheral, non-instructional scenery provides depth and visual reference.
  const trunk = material('#8b8071'), leaf = material('#718c6d'), leafLight = material('#8aa17d');
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#68775e', transparent: true, opacity: 0.15, depthWrite: false });
  for (let i = 0; i < 18; i++) {
    const x = i < 9 ? -7 - (i % 2) * 0.7 : 8 + (i % 2) * 0.6;
    const z = 16 - (i % 9) * 7.8;
    const tree = new THREE.Group(); tree.position.set(x, 0, z);
    tree.add(box(0.24, 2.7, 0.24, 0, 1.35, 0, trunk));
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.5, 9, 7), i % 2 ? leaf : leafLight);
    foliage.position.y = 3.25; foliage.scale.set(0.85, 1.25, 0.85); foliage.castShadow = true;
    tree.add(foliage);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.05, 18), shadowMat);
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.4, -0.028, 0.1); tree.add(shadow);
    group.add(tree);
  }
  group.add(box(0.22, 0.18, 60, -4.4, 0.06, -8, curb));
  group.add(box(0.22, 0.18, 43, 4.4, 0.06, -6, curb));
  const fence = material('#8e9b92');
  for (let i = 0; i < 24; i++) group.add(box(0.065, 1.0, 0.065, -10, 0.5, 23 - i * 3, fence));
  group.add(box(0.045, 0.045, 70, -10, 0.55, -11, fence), box(0.045, 0.045, 70, -10, 0.95, -11, fence));
  const building = material('#e3e1d4'), roof = material('#81978b'), windows = material('#9eafb0');
  group.add(box(22, 4.2, 8, 7, 2.1, -52, building), box(23, 0.22, 9, 7, 4.3, -52, roof));
  for (let i = 0; i < 7; i++) group.add(box(1.65, 1.35, 0.03, -2 + i * 3, 2.45, -47.98, windows));
  const signCanvas = document.createElement('canvas'); signCanvas.width = 1024; signCanvas.height = 160;
  const context = signCanvas.getContext('2d')!;
  context.fillStyle = '#e3e1d4'; context.fillRect(0, 0, 1024, 160);
  context.fillStyle = '#496354'; context.font = 'bold 70px sans-serif'; context.textAlign = 'center'; context.fillText('駕 駛 練 習 場', 512, 105);
  const signTex = new THREE.CanvasTexture(signCanvas); signTex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: signTex }));
  sign.position.set(7, 3.25, -47.96); group.add(sign);
  return group;
}
