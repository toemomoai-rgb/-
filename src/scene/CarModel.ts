import * as THREE from 'three';
import type { CarConfig } from '../config/carConfig';
import type { CarState } from '../simulation/types';
import { radians } from '../simulation/SteeringSystem';
import { createHood } from './HoodModel';

export class CarModel {
  root = new THREE.Group();
  frontPivots: THREE.Group[] = [];
  tires: THREE.Mesh[] = [];
  collision: THREE.BoxHelper;
  private body: THREE.Mesh;
  private paintMaterials: THREE.MeshStandardMaterial[];
  constructor(config: CarConfig) {
    const paint = new THREE.MeshStandardMaterial({ color: '#cedcd9', roughness: 0.38, metalness: 0.22 });
    const hoodPaint = paint.clone();
    const glass = new THREE.MeshStandardMaterial({ color: '#466166', roughness: 0.22, metalness: 0.3 });
    this.paintMaterials = [paint, hoodPaint, glass];
    const tire = new THREE.MeshStandardMaterial({ color: '#303635', roughness: 0.95 });
    const hub = new THREE.MeshStandardMaterial({ color: '#a7b3b0', metalness: 0.5, roughness: 0.4 });
    const bodyCenter = config.rearOverhang - config.carLength / 2;
    this.body = new THREE.Mesh(new THREE.BoxGeometry(config.carWidth, 0.5, config.carLength), paint);
    this.body.position.set(0, 0.56, bodyCenter); this.root.add(this.body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(config.carWidth * 0.85, 0.57, config.wheelbase * 0.72), glass);
    cabin.position.set(0, 1.18, -config.wheelbase * 0.44); this.root.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(config.carWidth * 0.86, 0.08, config.wheelbase * 0.5), paint);
    roof.position.set(0, 1.5, -config.wheelbase * 0.4); this.root.add(roof);
    for (const side of [-1, 1]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.16, 0.28), paint);
      mirror.position.set(side * config.mirrorPosition[0], config.mirrorPosition[1], config.mirrorPosition[2]); this.root.add(mirror);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.19), hub);
      handle.position.set(side * (config.carWidth / 2 + 0.012), 0.85, -1.3); this.root.add(handle);
      for (const z of [-config.wheelbase, 0]) {
        const pivot = new THREE.Group(); pivot.position.set(side * (config.carWidth / 2 - 0.13), 0.29, z);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.22, 16), tire);
        wheel.rotation.z = Math.PI / 2; pivot.add(wheel); this.tires.push(wheel);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.225, 8), hub);
        cap.rotation.z = Math.PI / 2; pivot.add(cap);
        // Visible radial spoke makes wheel rolling perceptible in the top view.
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.045, 0.36), hub); pivot.add(spoke);
        wheel.userData.cap = cap; wheel.userData.spoke = spoke;
        if (z < 0) this.frontPivots.push(pivot);
        this.root.add(pivot);
      }
    }
    const frontZ = -config.wheelbase - config.frontOverhang - 0.01;
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.15, 0.03), new THREE.MeshStandardMaterial({ color: '#f4eed5', emissive: '#514e37', emissiveIntensity: 0.15 }));
      lamp.position.set(side * config.carWidth * 0.32, 0.74, frontZ); this.root.add(lamp);
      const rear = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.03), new THREE.MeshStandardMaterial({ color: '#a4584c' }));
      rear.position.set(side * config.carWidth * 0.32, 0.74, config.rearOverhang + 0.01); this.root.add(rear);
    }
    this.root.traverse(object => { object.layers.set(1); if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    this.root.add(createHood(config, hoodPaint));
    this.collision = new THREE.BoxHelper(this.body, '#d99b56'); this.collision.visible = false;
    this.collision.layers.set(0);
  }
  update(state: CarState, config: CarConfig, debug: boolean, transparent: boolean) {
    this.root.position.set(state.x, 0, state.z); this.root.rotation.y = -state.heading;
    this.frontPivots.forEach(p => { p.rotation.y = -radians(state.steering / config.steeringRatio); });
    this.tires.forEach(t => {
      t.rotation.x = -state.distance / 0.29;
      (t.userData.cap as THREE.Mesh).rotation.x = t.rotation.x;
      (t.userData.spoke as THREE.Mesh).rotation.x = t.rotation.x;
    });
    this.setTransparency(transparent);
    this.collision.visible = debug; if (debug) this.collision.update();
  }
  setTransparency(transparent: boolean) {
    this.paintMaterials.forEach(material => {
      material.transparent = transparent; material.opacity = transparent ? 0.28 : 1;
      material.depthWrite = !transparent;
    });
  }
}
