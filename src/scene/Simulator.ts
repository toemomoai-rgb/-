import * as THREE from 'three';
import type { CarConfig } from '../config/carConfig';
import { createCarState, localToWorld, stepCar, wheelPositions } from '../simulation/CarPhysics';
import { InputSystem, drivingKeys } from '../simulation/InputSystem';
import { degrees } from '../simulation/SteeringSystem';
import { canShift } from '../simulation/TransmissionSystem';
import type { CarState, Gear, Indicator, Telemetry, View } from '../simulation/types';
import { boundaryContacts } from '../systems/CheckpointSystem';
import { ScoringSystem } from '../systems/ScoringSystem';
import { CarModel } from './CarModel';
import { CameraSystem } from './CameraSystem';
import { createCourse } from './DrivingCourse';
import { MirrorSystem } from './MirrorSystem';

function disposeObject(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>(), textures = new Set<THREE.Texture>();
  root.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        if ('map' in m && m.map instanceof THREE.Texture) textures.add(m.map);
      }
    }
  });
  textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}

export const initialTelemetry: Telemetry = { ...createCarState(), gear: 'P', indicator: null, frontAngle: 0, brake: 1, throttle: 0, paused: false, view: 'driver', boundary: false, contacts: [], lineCrossings: 0 };

export class Simulator {
  readonly input = new InputSystem();
  state = createCarState();
  gear: Gear = 'P';
  indicator: Indicator = null;
  view: View = 'driver';
  paused = false;
  timeScale = 1;
  showTracks = true;
  debug = false;
  transparent = true;
  controlsEnabled = true;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cameras = new CameraSystem();
  private mirrors = new MirrorSystem();
  private car: CarModel;
  private scores = new ScoringSystem();
  private frame = 0;
  private lastTime = 0;
  private lastEmit = 0;
  private resize: ResizeObserver;
  private tracks = new THREE.Group();
  private trackPoints: THREE.Vector3[][] = [[], [], [], []];
  private trackLines: THREE.Line[] = [];
  private prediction = new THREE.Group();
  private diagnostics = new THREE.Group();
  private contextLost = false;
  private temporaryView: View | null = null;

  constructor(
    private host: HTMLElement,
    private mirrorElements: [HTMLElement, HTMLElement],
    private config: CarConfig,
    private emit: (telemetry: Telemetry) => void,
    private notice: (message: string) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.autoClear = false;
    this.renderer.domElement.setAttribute('aria-label', '即時三維駕駛場地與左右後照鏡');
    this.host.prepend(this.renderer.domElement);
    this.scene.background = new THREE.Color('#dfe8e6');
    this.scene.fog = new THREE.Fog('#dfe8e6', 58, 155);
    this.scene.add(new THREE.HemisphereLight('#f4f7f5', '#a0aa8e', 2.5));
    const sunlight = new THREE.DirectionalLight('#fff2d9', 2.1); sunlight.position.set(-20, 40, 14); this.scene.add(sunlight);
    this.scene.add(createCourse());
    this.car = new CarModel(config); this.scene.add(this.car.root, this.car.collision);
    ['#c69c66', '#c69c66', '#719eaa', '#719eaa'].forEach(color => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(1800 * 3), 3)); geometry.setDrawRange(0, 0);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
      line.frustumCulled = false; this.tracks.add(line); this.trackLines.push(line);
    });
    this.scene.add(this.tracks, this.prediction, this.diagnostics);
    this.resize = new ResizeObserver(() => this.renderer.setSize(this.host.clientWidth, this.host.clientHeight, false));
    this.resize.observe(this.host);
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
    window.addEventListener('keydown', this.keydown); window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.safetyPause); document.addEventListener('visibilitychange', this.visibility);
    this.renderer.domElement.addEventListener('webglcontextlost', this.lost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.restored);
    this.frame = requestAnimationFrame(this.animate);
  }
  private lost = (e: Event) => { e.preventDefault(); this.contextLost = true; this.safetyPause(); this.notice('三維繪圖暫時中斷。恢復後請按繼續；若仍無畫面，請重新整理。'); };
  private restored = () => { this.contextLost = false; };
  private visibility = () => { if (document.hidden) this.safetyPause(); };
  private safetyPause = () => {
    this.paused = true; this.input.clear(); this.input.brakeHold = true;
    this.restoreView(); this.publish();
  };
  private keydown = (event: KeyboardEvent) => {
    if (!this.controlsEnabled) return;
    if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName))) return;
    if (!drivingKeys.has(event.code)) return;
    event.preventDefault(); this.input.keys.add(event.code);
    if (event.repeat) return;
    if (event.code === 'KeyF') this.setGear('D');
    if (event.code === 'KeyR') this.setGear('R');
    if (event.code === 'KeyQ') this.setIndicator('left');
    if (event.code === 'KeyE') this.setIndicator('right');
    if (event.code === 'Digit1') this.setView('driver');
    if (event.code === 'Digit4') this.setView('top');
    if (event.code === 'Digit2' || event.code === 'Digit3') {
      if (this.temporaryView === null) this.temporaryView = this.view;
      this.view = event.code === 'Digit2' ? 'left' : 'right'; this.publish();
    }
  };
  private keyup = (event: KeyboardEvent) => {
    this.input.keys.delete(event.code);
    if (event.code === 'Digit2' || event.code === 'Digit3') {
      if (this.input.keys.has('Digit2')) this.view = 'left';
      else if (this.input.keys.has('Digit3')) this.view = 'right';
      else this.restoreView();
      this.publish();
    }
  };
  private restoreView() { if (this.temporaryView) { this.view = this.temporaryView; this.temporaryView = null; this.publish(); } }
  setView(view: View) { this.temporaryView = null; this.view = view; this.cameras.lookOffset = 0; this.publish(); }
  look(direction: number) { this.cameras.lookOffset = direction * Math.PI / 3; }
  setGear(gear: Gear) {
    const error = canShift(this.gear, gear, this.state.speed, this.input.read().brake);
    if (error) { this.notice(error); return false; }
    this.gear = gear; this.publish(); return true;
  }
  setIndicator(indicator: Indicator) { this.indicator = this.indicator === indicator ? null : indicator; this.publish(); }
  setBrakeHold(hold: boolean) { this.input.brakeHold = hold; this.publish(); }
  togglePause() { this.paused = !this.paused; this.input.clear(); this.publish(); }
  reset() {
    this.state = createCarState(); this.gear = 'P'; this.indicator = null; this.input.clear(); this.input.brakeHold = true;
    this.scores.reset(); this.trackPoints = [[], [], [], []]; this.paused = false;
    this.trackLines.forEach(l => l.geometry.setDrawRange(0, 0)); this.publish();
  }
  configure(config: CarConfig) {
    this.config = config;
    this.scene.remove(this.car.root, this.car.collision); disposeObject(this.car.root); disposeObject(this.car.collision);
    this.car = new CarModel(config); this.scene.add(this.car.root, this.car.collision); this.reset();
  }
  snapshot(): Telemetry {
    const input = this.input.read(), contacts = boundaryContacts(this.state, this.config);
    return { ...this.state, gear: this.gear, indicator: this.indicator, frontAngle: this.state.steering / this.config.steeringRatio,
      brake: input.brake, throttle: input.throttle, paused: this.paused, view: this.view, boundary: contacts.length > 0, contacts, lineCrossings: this.scores.lineCrossings };
  }
  private publish() { this.emit(this.snapshot()); }
  private recordTracks() {
    const points = wheelPositions(this.state, this.config);
    if (this.trackPoints[0].length && this.trackPoints[0].at(-1)!.distanceTo(new THREE.Vector3(points[0].x, 0.055, points[0].z)) < 0.09) return;
    points.forEach((p, i) => {
      const trail = this.trackPoints[i]; trail.push(new THREE.Vector3(p.x, 0.055, p.z)); if (trail.length > 1800) trail.shift();
      const attribute = this.trackLines[i].geometry.getAttribute('position') as THREE.BufferAttribute;
      trail.forEach((v, j) => attribute.setXYZ(j, v.x, v.y, v.z)); attribute.needsUpdate = true;
      this.trackLines[i].geometry.setDrawRange(0, trail.length);
    });
  }
  private updatePrediction() {
    disposeObject(this.prediction); this.prediction.clear();
    if (!this.paused || this.view !== 'top') return;
    let future: CarState = { ...this.state, speed: this.gear === 'R' ? -0.8 : this.gear === 'D' ? 0.8 : 0 };
    const paths: THREE.Vector3[][] = [[], [], [], []];
    for (let j = 0; j <= 90; j++) {
      wheelPositions(future, this.config).forEach((p, i) => paths[i].push(new THREE.Vector3(p.x, 0.08, p.z)));
      // Constant-angle, constant-speed projection. P/N stationary: no hypothetical drive.
      const delta = THREE.MathUtils.degToRad(future.steering / this.config.steeringRatio);
      const travel = future.speed * 0.1, dh = travel / this.config.wheelbase * Math.tan(delta);
      future.x += Math.sin(future.heading + dh / 2) * travel; future.z -= Math.cos(future.heading + dh / 2) * travel; future.heading += dh;
    }
    paths.forEach((path, i) => {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path), new THREE.LineDashedMaterial({ color: i < 2 ? '#bf8b51' : '#588e9c', dashSize: 0.25, gapSize: 0.16 }));
      line.computeLineDistances(); this.prediction.add(line);
    });
  }
  private updateDiagnostics() {
    disposeObject(this.diagnostics); this.diagnostics.clear();
    if (!this.debug || this.view !== 'top') return;
    const points = wheelPositions(this.state, this.config);
    points.forEach(p => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#dc9b45' }));
      dot.position.set(p.x, 0.5, p.z); this.diagnostics.add(dot);
    });
    const center = localToWorld(this.state, 0, -this.config.wheelbase / 2);
    const axes = new THREE.AxesHelper(1.4); axes.position.set(center.x, 0.6, center.z); axes.rotation.y = -this.state.heading; this.diagnostics.add(axes);
    this.mirrors.cameras.forEach(camera => { const helper = new THREE.CameraHelper(camera); this.diagnostics.add(helper); });
    const eye = this.cameras.driver.position;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: '#71a4cc' }));
    dot.position.copy(eye); this.diagnostics.add(dot);
  }
  private animate = (now: number) => {
    this.frame = requestAnimationFrame(this.animate);
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.08) : 0;
    this.lastTime = now;
    if (this.contextLost) return;
    if (!this.paused) {
      let remaining = dt * this.timeScale;
      while (remaining > 0.00001) {
        const step = Math.min(remaining, 1 / 90);
        this.state = stepCar(this.state, this.input.read(), this.gear, step, this.config, this.input.autoCenter); remaining -= step;
      }
      this.scores.update(boundaryContacts(this.state, this.config).length > 0);
      if (Math.abs(this.state.speed) > 0.01) this.recordTracks();
    }
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    this.cameras.update(this.state, this.config, width / height);
    this.car.update(this.state, this.config, this.debug && this.view === 'top', this.transparent && this.view === 'top');
    this.tracks.visible = this.view === 'top' && this.showTracks;
    const hostRect = this.host.getBoundingClientRect();
    const rects = this.mirrorElements.map(element => {
      const r = element.getBoundingClientRect();
      return { x: r.left - hostRect.left, y: hostRect.bottom - r.bottom, width: r.width, height: r.height };
    });
    this.mirrors.update(this.state, this.config, rects.map(r => r.width / r.height));
    // Geometry is rebuilt only at UI sampling rate, not for every render pass.
    if (now - this.lastEmit > 100) {
      this.updatePrediction(); this.updateDiagnostics(); this.publish(); this.lastEmit = now;
    }
    this.renderer.setRenderTarget(null); this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissorTest(false); this.renderer.clear(); this.renderer.render(this.scene, this.cameras.get(this.view));
    this.mirrors.render(this.renderer, this.scene, rects);
  };
  getDebug() {
    return { heading: degrees(this.state.heading), eye: this.cameras.driver.position.toArray() };
  }
  dispose() {
    cancelAnimationFrame(this.frame); this.resize.disconnect();
    window.removeEventListener('keydown', this.keydown); window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.safetyPause); document.removeEventListener('visibilitychange', this.visibility);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.lost); this.renderer.domElement.removeEventListener('webglcontextrestored', this.restored);
    this.mirrors.dispose(); disposeObject(this.scene); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
