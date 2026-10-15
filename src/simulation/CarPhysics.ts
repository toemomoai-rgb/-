import type { CarConfig } from '../config/carConfig';
import { courseConfig } from '../config/courseConfig';
import { radians, steer } from './SteeringSystem';
import type { CarState, DriveInput, Gear } from './types';

export function createCarState(): CarState {
  return { ...courseConfig.startPosition, speed: 0, steering: 0, distance: 0 };
}
export function localToWorld(state: Pick<CarState, 'x' | 'z' | 'heading'>, x: number, z: number) {
  const c = Math.cos(state.heading), s = Math.sin(state.heading);
  return { x: state.x + c * x - s * z, z: state.z + s * x + c * z };
}
export function wheelPositions(state: CarState, config: CarConfig) {
  const halfTrack = config.carWidth / 2 - 0.13;
  return [localToWorld(state, -halfTrack, -config.wheelbase), localToWorld(state, halfTrack, -config.wheelbase), localToWorld(state, -halfTrack, 0), localToWorld(state, halfTrack, 0)];
}

/** Rear-axle kinematic bicycle model; positive steering = right, speed is signed m/s. */
export function stepCar(state: CarState, input: DriveInput, gear: Gear, dt: number, config: CarConfig, autoCenter = false): CarState {
  if (dt <= 0) return { ...state };
  const steering = steer(state.steering, input.steering, input.center, autoCenter, dt, config);
  const direction = gear === 'D' ? 1 : gear === 'R' ? -1 : 0;
  let speed = state.speed;
  const braking = Math.max(0, Math.min(1, input.brake));
  if (gear === 'P') speed = 0;
  else if (braking > 0) {
    speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - 5 * braking * dt);
  } else if (direction) {
    // Idle creep at ~2 km/h; gentle throttle, forward limited to 12, reverse to 7 km/h.
    const target = direction * (input.throttle > 0 ? (gear === 'R' ? 7 : 12) / 3.6 : 0.56);
    const difference = target - speed;
    speed += Math.sign(difference) * Math.min(Math.abs(difference), (input.throttle > 0 ? 0.85 : 0.65) * dt);
  } else {
    speed = Math.sign(speed) * Math.max(0, Math.abs(speed) - 0.12 * dt);
  }
  if (speed === 0) speed = 0; // Normalize reverse braking's IEEE-754 negative zero.
  const travel = gear === 'P' ? 0 : (state.speed + speed) / 2 * dt;
  const delta = radians(steering / config.steeringRatio);
  const change = travel / config.wheelbase * Math.tan(delta);
  const midHeading = state.heading + change / 2;
  return {
    x: state.x + Math.sin(midHeading) * travel,
    z: state.z - Math.cos(midHeading) * travel,
    heading: state.heading + change, speed, steering,
    distance: state.distance + travel,
  };
}
