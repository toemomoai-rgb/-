import { courseConfig as course } from '../config/courseConfig';
import type { CarConfig } from '../config/carConfig';
import { localToWorld, wheelPositions } from '../simulation/CarPhysics';
import type { CarState } from '../simulation/types';
export function onRoad(x: number, z: number, margin = 0): boolean {
  const half = course.laneWidth / 2;
  return (x >= -half + margin && x <= half - margin && z >= course.straight.minZ + margin && z <= course.straight.maxZ - margin) ||
    (x >= course.exit.minX + margin && x <= course.exit.maxX - margin && z >= course.exit.minZ + margin && z <= course.exit.maxZ - margin);
}
export function boundaryContacts(state: CarState, config: CarConfig): string[] {
  const labels = ['左前輪', '右前輪', '左後輪', '右後輪'];
  const contacts = wheelPositions(state, config).flatMap((p, i) => onRoad(p.x, p.z, 0.13) ? [] : [labels[i]]);
  // Sample the full body perimeter (including overhangs), not only the center.
  const front = -config.wheelbase - config.frontOverhang;
  const back = config.rearOverhang;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    for (const [x, z] of [[-config.carWidth / 2, front + (back - front) * t], [config.carWidth / 2, front + (back - front) * t], [(t - 0.5) * config.carWidth, front], [(t - 0.5) * config.carWidth, back]]) {
      const p = localToWorld(state, x, z);
      if (!onRoad(p.x, p.z, course.boundaryTolerance)) {
        if (!contacts.includes('車身邊界')) contacts.push('車身邊界');
      }
    }
  }
  return contacts;
}
