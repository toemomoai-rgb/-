import type { DriveInput } from './types';
export const drivingKeys = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyC']);
export class InputSystem {
  keys = new Set<string>();
  pointer = new Set<string>();
  brakeHold = true;
  autoCenter = false;
  clear() { this.keys.clear(); this.pointer.clear(); }
  read(): DriveInput {
    const held = (key: string) => this.keys.has(key) || this.pointer.has(key);
    return {
      throttle: held('KeyW') ? 1 : 0,
      brake: this.brakeHold || held('KeyS') || held('Space') ? 1 : 0,
      steering: Number(held('KeyD')) - Number(held('KeyA')),
      center: held('KeyC'),
    };
  }
}
