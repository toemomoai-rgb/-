import type { CarConfig } from '../config/carConfig';
export const radians = (degrees: number) => degrees * Math.PI / 180;
export const degrees = (radiansValue: number) => radiansValue * 180 / Math.PI;
export function steer(current: number, input: number, center: boolean, autoCenter: boolean, dt: number, config: CarConfig): number {
  const max = config.maxSteeringAngle * config.steeringRatio;
  if (center || (autoCenter && input === 0)) {
    const step = config.steeringSpeed * dt;
    return Math.abs(current) <= step ? 0 : current - Math.sign(current) * step;
  }
  return Math.max(-max, Math.min(max, current + input * config.steeringSpeed * dt));
}
export function steeringLabel(angle: number): string {
  if (Math.abs(angle) < 1) return '方向盤已回正';
  const turns = Math.abs(angle) / 360;
  return `向${angle > 0 ? '右' : '左'} ${turns.toFixed(2)} 圈`;
}
