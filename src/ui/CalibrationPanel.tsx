import { useState } from 'react';
import { Check, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { defaultCarConfig, sanitizeConfig, saveCarConfig } from '../config/carConfig';
import type { CarConfig } from '../config/carConfig';

interface Props { config: CarConfig; onApply: (config: CarConfig) => void; onClose: () => void }
export default function CalibrationPanel({ config, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<CarConfig>(structuredClone(config));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof CarConfig, value: number) => { setDraft(d => ({ ...d, [key]: value })); setSaved(false); };
  const vector = (key: 'driverEyePosition' | 'mirrorPosition', index: number, value: number) => {
    setDraft(d => { const values = [...d[key]] as [number, number, number]; values[index] = value; return { ...d, [key]: values }; }); setSaved(false);
  };
  const slider = (label: string, value: number, min: number, max: number, step: number, unit: string, change: (v: number) => void) =>
    <label className="range-field" key={label}><span>{label}<b>{value.toFixed(step < 1 ? 2 : 0)}{unit}</b></span><input aria-label={label} type="range" value={value} min={min} max={max} step={step} onChange={e => change(Number(e.target.value))}/></label>;
  return <div className="modal-backdrop" onClick={onClose}><section className="calibration modal" role="dialog" aria-modal="true" aria-labelledby="calibration-title" onClick={e => e.stopPropagation()}>
    <header><div className="modal-icon"><SlidersHorizontal size={22}/></div><div><h2 id="calibration-title">調整成你的駕駛視野</h2><p>校正模式 · 僅儲存在這台瀏覽器</p></div><button className="icon-button close" aria-label="關閉校正面板" onClick={onClose}><X size={20}/></button></header>
    <div className="calibration-scroll"><div className="calibration-note">目前使用示意車輛與測試場地，尚未依教練影片校正。套用設定會將車輛放回起點。</div>
      <h3>駕駛座視野</h3>
      <button className="hood-preset-button" onClick={() => {
        setDraft(d => ({ ...d, driverEyePosition: [...defaultCarConfig.driverEyePosition], driverFov: defaultCarConfig.driverFov, driverPitch: defaultCarConfig.driverPitch })); setSaved(false);
      }}><SlidersHorizontal size={14}/>完整車頭視野預設</button>
      <p className="small-note">讓左右車頭邊角與雨刷噴頭入鏡的觀察設定；仍需依教練車視野校正。</p>
      {slider('視線高度', draft.driverEyePosition[1], .95, 1.65, .01, ' m', v => vector('driverEyePosition', 1, v))}
      {slider('座椅前後位置', draft.driverEyePosition[2], -2.15, -0.9, .01, ' m', v => vector('driverEyePosition', 2, v))}
      {slider('座椅左右位置', draft.driverEyePosition[0], -.6, -.1, .01, ' m', v => vector('driverEyePosition', 0, v))}
      {slider('前方視野 FOV', draft.driverFov, 40, 90, 1, '°', v => set('driverFov', v))}
      {slider('視線向下角度', draft.driverPitch, -4, 18, 1, '°', v => set('driverPitch', v))}
      <h3>引擎蓋與雨刷噴頭</h3>
      {slider('引擎蓋長度', draft.hoodLength, .8, 1.8, .01, ' m', v => set('hoodLength', v))}
      {slider('引擎蓋後緣高度', draft.hoodHeight, .86, 1.1, .01, ' m', v => set('hoodHeight', v))}
      {slider('兩個噴頭間距', draft.washerSpacing, .4, draft.carWidth * .7, .01, ' m', v => set('washerSpacing', v))}
      {slider('噴頭前後位置比例', draft.washerDepthRatio, .55, .93, .01, '', v => set('washerDepthRatio', v))}
      <h3>左右後照鏡</h3>
      {slider('左鏡向外角度', draft.leftMirrorYaw, 0, 35, 1, '°', v => set('leftMirrorYaw', v))}
      {slider('右鏡向外角度', draft.rightMirrorYaw, 0, 35, 1, '°', v => set('rightMirrorYaw', v))}
      {slider('後照鏡俯角', draft.mirrorPitch, 0, 32, 1, '°', v => set('mirrorPitch', v))}
      {slider('後照鏡視野', draft.mirrorFov, 30, 75, 1, '°', v => set('mirrorFov', v))}
      {slider('後照鏡高度', draft.mirrorPosition[1], .9, 1.4, .01, ' m', v => vector('mirrorPosition', 1, v))}
      <h3>車輛與轉向</h3>
      {slider('車身長度', draft.carLength, 4, 5.4, .01, ' m', v => set('carLength', v))}
      {slider('車身寬度', draft.carWidth, 1.5, 2, .01, ' m', v => set('carWidth', v))}
      {slider('軸距', draft.wheelbase, 2.3, 3, .01, ' m', v => set('wheelbase', v))}
      {slider('前輪最大轉角', draft.maxSteeringAngle, 20, 42, 1, '°', v => set('maxSteeringAngle', v))}
      {slider('方向盤轉向比', draft.steeringRatio, 12, 20, 1, ':1', v => set('steeringRatio', v))}
      {slider('方向盤操作速度', draft.steeringSpeed, 100, 480, 10, '°/s', v => set('steeringSpeed', v))}
      <p className="small-note">前懸依車長、軸距與後懸計算。更細的鏡座與車輛尺寸可在 carConfig.ts 調整。</p>
    </div>
    <footer><button className="text-button" onClick={() => { setDraft(structuredClone(defaultCarConfig)); setSaved(false); }}><RotateCcw size={15}/>預設值</button><button className="primary-button" onClick={() => {
      const safe = sanitizeConfig(draft); onApply(safe); setDraft(safe); const ok = saveCarConfig(safe); setSaved(ok); setError(ok ? '' : '已套用，但瀏覽器無法儲存。請允許本機儲存空間。');
    }}>{saved ? <Check size={16}/> : <SlidersHorizontal size={16}/>} {saved ? '已套用並儲存' : '套用並儲存'}</button>{error && <p role="alert">{error}</p>}</footer>
  </section></div>;
}
