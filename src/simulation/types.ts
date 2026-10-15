export type Gear = 'P' | 'R' | 'N' | 'D';
export type View = 'driver' | 'left' | 'right' | 'top';
export type Indicator = 'left' | 'right' | null;
export interface CarState { x: number; z: number; heading: number; speed: number; steering: number; distance: number }
export interface DriveInput { throttle: number; brake: number; steering: number; center: boolean }
export interface Telemetry extends CarState {
  gear: Gear; indicator: Indicator; frontAngle: number; brake: number; throttle: number;
  paused: boolean; view: View; boundary: boolean; contacts: string[]; lineCrossings: number;
}
