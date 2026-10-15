import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultCarConfig as c, sanitizeConfig } from '../src/config/carConfig';
import { createCarState, localToWorld, stepCar, wheelPositions } from '../src/simulation/CarPhysics';
import type { CarState, DriveInput, Gear } from '../src/simulation/types';
import { steer } from '../src/simulation/SteeringSystem';
import { canShift } from '../src/simulation/TransmissionSystem';
import { boundaryContacts, onRoad } from '../src/systems/CheckpointSystem';
import { ScoringSystem } from '../src/systems/ScoringSystem';

const idle: DriveInput = { throttle: 0, brake: 0, steering: 0, center: false };
function drive(gear: Gear, steering: number, seconds = 6, dt = 1 / 120) {
  let state = { ...createCarState(), x: 0, z: 0, steering };
  for (let t = 0; t < seconds - dt / 2; t += dt) state = stepCar(state, idle, gear, dt, c);
  return state;
}
test('D travels forward; R travels backward with equal idle creep distance', () => {
  const forward = drive('D', 0), reverse = drive('R', 0);
  assert.ok(forward.z < -2); assert.ok(reverse.z > 2);
  assert.ok(Math.abs(forward.z + reverse.z) < 1e-8); assert.equal(forward.x, 0);
});
test('forward right/left turn moves the front in the requested direction', () => {
  for (const sign of [-1, 1]) {
    const state = drive('D', sign * 360);
    const front = localToWorld(state, 0, -c.wheelbase);
    assert.ok(front.x * sign > 0.5); assert.ok(state.heading * sign > 0);
  }
});
test('reverse right/left turn moves the rear in the requested direction, front swings out', () => {
  for (const sign of [-1, 1]) {
    const state = drive('R', sign * 360, 3);
    const front = localToWorld(state, 0, -c.wheelbase);
    assert.ok(state.x * sign > 0.02, 'rear axle goes toward steering direction');
    assert.ok(front.x * sign < 0, 'front swings in the opposite direction');
    assert.ok(state.heading * sign < 0);
  }
});
test('bicycle trajectory obeys wheelbase / tan(front angle) turning radius', () => {
  const state = drive('D', 360);
  const radius = c.wheelbase / Math.tan((360 / c.steeringRatio) * Math.PI / 180);
  assert.ok(Math.abs(state.x - radius * (1 - Math.cos(state.heading))) < 0.00001);
  assert.ok(Math.abs(state.z + radius * Math.sin(state.heading)) < 0.00001);
});
test('wheelbase remains constant through turns, no lateral body translation', () => {
  const state = drive('R', -470);
  const wheels = wheelPositions(state, c);
  assert.ok(Math.abs(Math.hypot(wheels[0].x - wheels[2].x, wheels[0].z - wheels[2].z) - c.wheelbase) < 1e-10);
});
test('rear inside wheel travels a tighter radius than front inside wheel', () => {
  const state = drive('D', 360);
  const radius = c.wheelbase / Math.tan((360 / c.steeringRatio) * Math.PI / 180);
  const wheels = wheelPositions(state, c);
  const distanceToCenter = (p: {x:number;z:number}) => Math.hypot(p.x - radius, p.z);
  assert.ok(distanceToCenter(wheels[3]) < distanceToCenter(wheels[1]));
});
test('braking stops forward and reverse travel without changing sign', () => {
  for (const gear of ['D', 'R'] as const) {
    let state = drive(gear, 0);
    for (let i = 0; i < 120; i++) state = stepCar(state, { ...idle, throttle: 1, brake: 1 }, gear, 1 / 120, c);
    assert.equal(state.speed, 0);
    const stopped = stepCar(state, { ...idle, brake: 1 }, gear, 1, c);
    assert.equal(stopped.z, state.z);
  }
});
test('P is stationary; N coasts without powered creep', () => {
  assert.equal(drive('P', 0).distance, 0); assert.equal(drive('N', 0).distance, 0);
  const initial = { ...createCarState(), speed: 1 };
  const neutral = stepCar(initial, idle, 'N', .1, c);
  assert.ok(neutral.speed < 1 && neutral.speed > 0);
});
test('gentle throttle is capped in both gears', () => {
  for (const gear of ['D', 'R'] as const) {
    let state = createCarState();
    for (let i = 0; i < 2400; i++) state = stepCar(state, { ...idle, throttle: 1 }, gear, 1 / 120, c);
    assert.ok(Math.abs(Math.abs(state.speed) * 3.6 - (gear === 'D' ? 12 : 7)) < 1e-8);
  }
});
test('steering stays put on release; centering is gradual and cannot overshoot', () => {
  assert.equal(steer(360, 0, false, false, 1, c), 360);
  assert.equal(steer(360, 0, true, false, 1, c), 110);
  assert.equal(steer(5, 0, true, false, 1, c), 0);
  assert.equal(steer(-360, 0, false, true, 1, c), -110);
  assert.equal(steer(0, 1, false, false, 10, c), c.maxSteeringAngle * c.steeringRatio);
});
test('shifts require stopping AND brake; zero brake cannot switch even while stationary', () => {
  assert.notEqual(canShift('D', 'R', 1, 1), null);
  assert.notEqual(canShift('P', 'D', 0, 0), null);
  assert.equal(canShift('D', 'R', 0, 1), null);
});
test('frame-rate independent trajectory within 2 cm at 30 vs 120 Hz', () => {
  const slow = drive('R', 450, 8, 1 / 30), fast = drive('R', 450, 8, 1 / 120);
  assert.ok(Math.hypot(slow.x - fast.x, slow.z - fast.z) < .02);
});
test('boundary detection catches wheel and body contacts with center still on road', () => {
  const safe = createCarState(); assert.deepEqual(boundaryContacts(safe, c), []);
  const wheelContact: CarState = { ...safe, x: 2.2 };
  assert.ok(onRoad(wheelContact.x, wheelContact.z));
  assert.ok(boundaryContacts(wheelContact, c).includes('右前輪'));
  const overhangContact = { ...safe, x: 0, z: 17.5 };
  assert.ok(boundaryContacts(overhangContact, c).includes('車身邊界'));
});
test('boundary counts contact episodes, not per-frame repeated errors', () => {
  const scores = new ScoringSystem();
  for (const contact of [false, true, true, true, false, true]) scores.update(contact);
  assert.equal(scores.lineCrossings, 2); scores.reset(); assert.equal(scores.lineCrossings, 0);
});
test('invalid stored calibration is clamped, derived dimensions remain consistent', () => {
  const safe = sanitizeConfig({ carWidth: 99, driverFov: NaN, driverEyePosition: [Infinity, -20, -99], carLength: 4, wheelbase: 3 });
  assert.equal(safe.carWidth, 2); assert.equal(safe.driverFov, c.driverFov);
  assert.equal(safe.driverEyePosition[1], .95);
  assert.ok(safe.frontOverhang > 0);
  assert.equal(safe.wheelbase + safe.frontOverhang + safe.rearOverhang, safe.carLength);
});
