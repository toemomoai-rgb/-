import type { Telemetry } from '../simulation/types';
// Generic control prompts only. Coach mnemonics remain unmapped until video calibration.
export const lessonData = {
  parked: { observation: '儀表與排檔', title: '準備好，再慢慢出發', text: '保持煞車，排入 D 前進或 R 倒車。確認周圍後，解除煞車保持，感受車輛緩慢移動。' },
  reverse: { observation: '左右後照鏡', title: '倒車時，把注意力交給車尾', text: '方向盤向右，車尾會往右；向左，車尾會往左。觀察白線與車側距離，慢慢修正。' },
  forward: { observation: '前方道路與左右車側', title: '用視野，建立自己的方向感', text: '觀察車頭與白線的位置。輕轉方向盤，感受車頭移動；放開按鍵不會自動回正。' },
  boundary: { observation: '後照鏡與俯視視角', title: '車輪或車身已碰到道路邊界', text: '先煞停，從後照鏡確認位置。可切換俯視，觀察四輪與白線，再慢慢修正。' },
};
export function currentLesson(t: Telemetry) {
  return t.boundary ? lessonData.boundary : t.gear === 'R' ? lessonData.reverse : t.gear === 'D' ? lessonData.forward : lessonData.parked;
}
