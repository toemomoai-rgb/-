import * as THREE from 'three';
import type { CarConfig } from '../config/carConfig';
import type { CarState, View } from '../simulation/types';
import { localToWorld } from '../simulation/CarPhysics';

export class CameraSystem {
  driver = new THREE.PerspectiveCamera(63, 1, 0.045, 200);
  top = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 150);
  lookOffset = 0;
  constructor() {
    this.driver.layers.enable(2);
    this.top.layers.enable(1);
    this.top.up.set(0, 0, -1);
  }
  update(state: CarState, config: CarConfig, aspect: number) {
    const [x, y, z] = config.driverEyePosition;
    const eye = localToWorld(state, x, z);
    this.driver.position.set(eye.x, y, eye.z);
    const heading = state.heading + this.lookOffset;
    this.driver.lookAt(eye.x + Math.sin(heading) * 30, y - 1.1, eye.z - Math.cos(heading) * 30);
    this.driver.fov = config.driverFov; this.driver.aspect = aspect; this.driver.updateProjectionMatrix();
    const center = localToWorld(state, 0, -config.wheelbase / 2);
    this.top.position.set(center.x, 32, center.z); this.top.lookAt(center.x, 0, center.z);
    this.top.left = -11 * aspect; this.top.right = 11 * aspect; this.top.top = 11; this.top.bottom = -11;
    this.top.updateProjectionMatrix();
  }
  get(view: View) { return view === 'top' ? this.top : this.driver; }
}
