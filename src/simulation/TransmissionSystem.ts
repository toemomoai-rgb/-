import type { Gear } from './types';
export function canShift(current: Gear, next: Gear, speed: number, brake: number): string | null {
  if (current === next) return null;
  if (Math.abs(speed) > 0.05) return '請先煞停車輛，再切換檔位。';
  if (brake < 0.5) return '請先按住空白鍵或開啟「煞車保持」，再換檔。';
  return null;
}
