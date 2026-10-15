import * as THREE from 'three';
import type { CarConfig } from '../config/carConfig';
import type { CarState } from '../simulation/types';
import { localToWorld } from '../simulation/CarPhysics';
import { radians } from '../simulation/SteeringSystem';

/** Separate rear-facing cameras rendered every frame. UV reversal is a real mirror reflection. */
export class MirrorSystem {
  cameras = [new THREE.PerspectiveCamera(), new THREE.PerspectiveCamera()];
  targets = [new THREE.WebGLRenderTarget(640, 320), new THREE.WebGLRenderTarget(640, 320)];
  overlayScenes: THREE.Scene[] = [];
  overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  constructor() {
    this.overlayCamera.position.z = 1;
    this.cameras.forEach(camera => { camera.near = 0.04; camera.far = 180; camera.layers.enable(1); });
    this.targets.forEach(target => {
      const scene = new THREE.Scene();
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, toneMapped: false }));
      const uv = plane.geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
      scene.add(plane); this.overlayScenes.push(scene);
    });
  }
  update(state: CarState, config: CarConfig, aspects: number[]) {
    this.cameras.forEach((camera, i) => {
      const side = i === 0 ? -1 : 1;
      const eye = localToWorld(state, side * config.mirrorPosition[0], config.mirrorPosition[2]);
      camera.position.set(eye.x, config.mirrorPosition[1], eye.z);
      const yaw = radians(i === 0 ? config.leftMirrorYaw : config.rightMirrorYaw);
      // Aim back and slightly outward; inner edge retains the car side.
      const aim = localToWorld(state, side * config.mirrorPosition[0] + side * Math.sin(yaw) * 12, config.mirrorPosition[2] + Math.cos(yaw) * 12);
      camera.lookAt(aim.x, config.mirrorPosition[1] - Math.tan(radians(config.mirrorPitch)) * 12, aim.z);
      camera.fov = config.mirrorFov; camera.aspect = aspects[i] || 2.4; camera.updateProjectionMatrix();
    });
  }
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, rects: { x: number; y: number; width: number; height: number }[]) {
    this.cameras.forEach((camera, i) => {
      const rect = rects[i]; if (rect.width <= 0 || rect.height <= 0) return;
      const target = this.targets[i];
      const targetWidth = Math.min(1536, Math.max(480, Math.round(rect.width * renderer.getPixelRatio())));
      const targetHeight = Math.round(targetWidth * rect.height / rect.width);
      if (target.width !== targetWidth || target.height !== targetHeight) target.setSize(targetWidth, targetHeight);
      renderer.setRenderTarget(target);
      renderer.setScissorTest(false); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(null); renderer.setViewport(rect.x, rect.y, rect.width, rect.height);
      renderer.setScissor(rect.x, rect.y, rect.width, rect.height); renderer.setScissorTest(true);
      renderer.clearDepth(); renderer.render(this.overlayScenes[i], this.overlayCamera);
      renderer.setScissorTest(false);
    });
  }
  dispose() {
    this.targets.forEach(t => t.dispose());
    this.overlayScenes.forEach(s => s.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); o.material.dispose(); } }));
  }
}
