import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultCarConfig as config, sanitizeConfig } from '../src/config/carConfig';
import { CameraSystem } from '../src/scene/CameraSystem';
import { hoodLandmarks, hoodSurface } from '../src/scene/HoodModel';
import { createCarState } from '../src/simulation/CarPhysics';
import { coachNotes, isActionableNote } from '../src/data/coachNotes';
import type { CoachNote } from '../src/data/coachNotes';
import { localToWorld } from '../src/simulation/CarPhysics';
import { Vector3 } from 'three';

test('default desktop driver framing shows all four hood corners and both washer nozzles above the dash', () => {
  const cameras = new CameraSystem(), state = createCarState();
  cameras.update(state, config, 1145 / 650);
  cameras.driver.updateMatrixWorld(true);
  const landmarks = hoodLandmarks(config);
  for (const point of [...landmarks.corners, ...landmarks.washers]) {
    const world = localToWorld(state, point.x, point.z);
    const projected = new Vector3(world.x, point.y, world.z).project(cameras.driver);
    assert.ok(Math.abs(projected.x) < .98, `horizontal position ${projected.x} must stay in the windshield`);
    // The dashboard starts at 74% of the canvas height: NDC y = -0.48.
    assert.ok(projected.y > -.48 && projected.y < .8, `vertical position ${projected.y} must stay above the dash`);
    assert.ok(projected.z > -1 && projected.z < 1);
  }
});
test('hood and washer dimensions follow the calibrated car, rather than fixed screen pixels', () => {
  const wider = sanitizeConfig({ ...config, carWidth: 1.95, washerSpacing: 1.1, hoodLength: 1.6 });
  const points = hoodLandmarks(wider);
  assert.ok(Math.abs(points.washers[1].x - points.washers[0].x - 1.1) < 1e-8);
  assert.ok(Math.abs(points.corners[2].z - points.corners[0].z - wider.hoodLength) < 1e-8);
  assert.equal(hoodSurface(wider, 0, 0).z, -wider.wheelbase - wider.frontOverhang);
});
test('existing calibration acquires new hood and camera fields without discarding the saved seat', () => {
  const old = sanitizeConfig({ driverEyePosition: [-.34, 1.25, -1.7], driverFov: 63 });
  assert.deepEqual(old.driverEyePosition, [-.34, 1.25, -1.7]);
  assert.equal(old.driverFov, 63);
  assert.equal(old.hoodLength, config.hoodLength);
  assert.equal(old.driverPitch, config.driverPitch);
});
test('unverified user mnemonics never become timed lesson instructions', () => {
  assert.equal(coachNotes.length, 2);
  assert.ok(coachNotes.every(n => !isActionableNote(n)));
  assert.ok(coachNotes.every(n => n.startSeconds === null && n.checkpointId === null));
  const verified: CoachNote = { ...coachNotes[0], source: 'coach-video', verification: 'verified', startSeconds: 12, endSeconds: 18, checkpointId: 'confirmed-course-id', observation: '右後照鏡' };
  assert.equal(isActionableNote(verified), true);
  for (const changed of [{ startSeconds: NaN }, { endSeconds: 10 }, { checkpointId: '' }, { observation: null }, { source: 'user-message' as const }]) {
    assert.equal(isActionableNote({ ...verified, ...changed }), false);
  }
});
