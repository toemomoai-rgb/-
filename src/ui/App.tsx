import { useEffect, useRef, useState } from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CarFront, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Eye, Gauge, Info, Keyboard, Layers3, Maximize2, MoveUpRight, Pause, Play, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, Sun, TrafficCone, X } from 'lucide-react';
import { loadCarConfig } from '../config/carConfig';
import type { CarConfig } from '../config/carConfig';
import { courseConfig } from '../config/courseConfig';
import { initialTelemetry, Simulator } from '../scene/Simulator';
import { currentLesson } from '../systems/LessonSystem';
import { steeringLabel } from '../simulation/SteeringSystem';
import type { Gear, View } from '../simulation/types';
import CalibrationPanel from './CalibrationPanel';
import SteeringWheel from './SteeringWheel';
import CoachNotebook from './CoachNotebook';

const views: { id: View; label: string; key: string }[] = [
  { id: 'driver', label: '駕駛座', key: '1' }, { id: 'left', label: '左後照鏡', key: '2' },
  { id: 'right', label: '右後照鏡', key: '3' }, { id: 'top', label: '俯視教學', key: '4' },
];
const gearNames: Record<Gear, string> = { P: '停車', R: '倒車', N: '空檔', D: '前進' };

function HoldButton({ code, label, children, sim, className = '' }: { code: string; label: string; children: React.ReactNode; sim: Simulator | null; className?: string }) {
  return <button className={`hold-button ${className}`} aria-label={label} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); sim?.input.pointer.add(code); }}
    onPointerUp={() => sim?.input.pointer.delete(code)} onPointerCancel={() => sim?.input.pointer.delete(code)} onLostPointerCapture={() => sim?.input.pointer.delete(code)}
    onKeyDown={e => { if (e.code === 'Enter') sim?.input.pointer.add(code); }} onKeyUp={e => { if (e.code === 'Enter') sim?.input.pointer.delete(code); }} onBlur={() => sim?.input.pointer.delete(code)}>{children}</button>;
}

export default function App() {
  const host = useRef<HTMLDivElement>(null), left = useRef<HTMLDivElement>(null), right = useRef<HTMLDivElement>(null);
  const sim = useRef<Simulator | null>(null);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [config, setConfig] = useState<CarConfig>(loadCarConfig);
  const [calibration, setCalibration] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [notebook, setNotebook] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const [practice, setPractice] = useState(false);
  const [autoCenter, setAutoCenter] = useState(false);
  const [tracks, setTracks] = useState(true);
  const [transparent, setTransparent] = useState(true);
  const [debug, setDebug] = useState(false);
  const [timeScale, setTimeScale] = useState(1);
  const [hintLevel, setHintLevel] = useState(2);
  const [options, setOptions] = useState(false);
  const initialConfig = useRef(config);

  useEffect(() => {
    try {
      const instance = new Simulator(host.current!, [left.current!, right.current!], initialConfig.current, setTelemetry, setMessage);
      sim.current = instance;
      return () => { instance.dispose(); sim.current = null; };
    } catch (error) { setFailure(`無法啟動三維畫面。請使用支援 WebGL 的桌面瀏覽器並開啟硬體加速。${error instanceof Error ? `（${error.message}）` : ''}`); }
  }, []);
  useEffect(() => { if (!message) return; const timeout = setTimeout(() => setMessage(''), 5500); return () => clearTimeout(timeout); }, [message]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setCalibration(false); setShortcuts(false); setNotebook(false); setOptions(false); } };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);
  useEffect(() => {
    const opened = calibration || shortcuts || notebook;
    if (sim.current) { sim.current.controlsEnabled = !opened; if (opened) sim.current.input.clear(); }
    if (!opened) return;
    const previous = document.activeElement;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]') || []).filter(e => !e.hasAttribute('disabled'));
    focusables()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const elements = focusables(), first = elements[0], last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); if (previous instanceof HTMLElement) previous.focus(); };
  }, [calibration, shortcuts, notebook]);
  // Dialogs are safe places to read and adjust settings, without the vehicle creeping.
  const openDialog = (which: 'calibration' | 'shortcuts' | 'notebook') => {
    if (sim.current && !sim.current.paused) sim.current.togglePause();
    if (which === 'calibration') setCalibration(true); else if (which === 'notebook') setNotebook(true); else setShortcuts(true);
  };
  const lesson = currentLesson(telemetry);
  const brakeHold = sim.current?.input.brakeHold ?? true;
  const speed = Math.abs(telemetry.speed * 3.6);
  const showCabin = telemetry.view === 'driver';
  const changeView = (view: View) => sim.current?.setView(view);

  return <div className="app-shell">
    <aside className="sidebar" inert={calibration || shortcuts || notebook}>
      <a className="brand" href="#" onClick={e => { e.preventDefault(); changeView('driver'); }}><span className="brand-mark"><CarFront size={25} strokeWidth={1.7}/></span><span>永慶駕訓班<small>YONGQING DRIVING</small></span></a>
      <div className="workspace-label">我的駕駛教室 <span>練習版</span></div>
      <nav aria-label="練習導覽"><div className="nav-section-label">開始練習</div>
        <button className={`nav-item ${!practice ? 'active' : ''}`} onClick={() => setPractice(false)}><BookOpen size={18}/><span>基本操作教學</span><ChevronRight size={15}/></button>
        <button className={`nav-item ${practice ? 'active' : ''}`} onClick={() => setPractice(true)}><Compass size={18}/><span>自由練習</span></button>
        <button className="nav-item" onClick={() => openDialog('notebook')}><BookOpen size={18}/><span>教練影片與口訣</span></button>
        <div className="nav-section-label next-section">後續課程</div>
        <div className="nav-unavailable"><TrafficCone size={18}/><span>單項關卡</span><small>準備中</small></div>
        <div className="nav-unavailable"><ShieldCheck size={18}/><span>完整場考</span><small>準備中</small></div>
      </nav>
      <div className="sidebar-tip"><span className="tip-icon"><Sun size={20}/></span><h3>不用趕，慢慢來。</h3><p>先熟悉車子的反應，<br/>每一次修正，都是進步。</p><div className="tip-line"/></div>
      <div className="sidebar-bottom"><span className="online-dot"/>本機練習 · 無需登入<small>核心原型 v0.1</small></div>
    </aside>

    <div className="main-shell" inert={calibration || shortcuts || notebook}><header className="topbar"><div className="breadcrumb">駕駛教室<ChevronRight size={14}/><span>{practice ? '自由練習' : '基本操作教學'}</span></div><div className="header-actions"><button className="notebook-header-button" onClick={() => openDialog('notebook')}><BookOpen size={17}/><span>教練筆記</span></button><button onClick={() => openDialog('shortcuts')}><Keyboard size={17}/><span>操作說明</span></button><span className="header-divider"/><button onClick={() => openDialog('calibration')}><SlidersHorizontal size={17}/><span>視野校正</span></button></div></header>
      <main>
        <div className="page-heading"><div><div className="eyebrow"><span/>從基本開始，建立駕駛感覺</div><h1>{practice ? '留一點空間，自己練習。' : '慢慢練，找到你的方向感。'}</h1><p>熟悉方向盤、感受車身移動，從駕駛座的視角開始。</p></div><div className="course-badge"><span className="badge-icon"><CarFront size={21}/></span><div>自排汽車<small>核心操作練習</small></div></div></div>

        <section className="simulator-card" aria-label="駕駛模擬器">
          <div className="sim-toolbar"><div className="view-tabs" role="tablist" aria-label="觀察視角">{views.map(v => <button role="tab" aria-selected={telemetry.view === v.id} className={telemetry.view === v.id ? 'selected' : ''} key={v.id} onClick={() => changeView(v.id)}>{v.id === 'driver' ? <Eye size={15}/> : v.id === 'top' ? <Layers3 size={15}/> : null}{v.label}<kbd>{v.key}</kbd></button>)}</div><div className="scene-tools"><button title="重新放回起點" aria-label="重新開始" onClick={() => { sim.current?.reset(); setMessage('已回到起點。保持煞車，選擇檔位後再出發。'); }}><RotateCcw size={16}/></button><button className={options ? 'selected' : ''} aria-label="開啟練習設定" onClick={() => setOptions(!options)}><Settings2 size={17}/></button></div></div>

          <div className={`scene-host view-${telemetry.view} ${telemetry.paused ? 'is-paused' : ''}`} ref={host}>
            <div className="scene-topline"><span className="scene-tag"><span/>{courseConfig.name}<i/>測試場地</span><span className="scene-weather"><Sun size={14}/>日間 · 乾燥路面</span></div>
            <div className={`mirror-frame mirror-left ${telemetry.view === 'left' ? 'enlarged' : ''} ${!practice && hintLevel > 1 && telemetry.gear === 'R' ? 'observe-mirror' : ''}`}><div className="mirror-glass" ref={left}/><button aria-label={telemetry.view === 'left' ? '縮小左後照鏡' : '放大左後照鏡'} onClick={() => changeView(telemetry.view === 'left' ? 'driver' : 'left')}><span>左後照鏡</span><Maximize2 size={12}/><kbd>2</kbd></button></div>
            <div className={`mirror-frame mirror-right ${telemetry.view === 'right' ? 'enlarged' : ''} ${!practice && hintLevel > 1 && telemetry.gear === 'R' ? 'observe-mirror' : ''}`}><div className="mirror-glass" ref={right}/><button aria-label={telemetry.view === 'right' ? '縮小右後照鏡' : '放大右後照鏡'} onClick={() => changeView(telemetry.view === 'right' ? 'driver' : 'right')}><span>右後照鏡</span><Maximize2 size={12}/><kbd>3</kbd></button></div>
            {showCabin && <><div className="windshield-pillar pillar-left"/><div className="windshield-pillar pillar-right"/>
              <div className="cockpit"><div className="dashboard-seam"/><div className="dashboard-instruments"><div className="gauge-arc"/><div className="dashboard-signals"><ArrowLeft className={telemetry.indicator === 'left' ? 'signal-active' : ''} size={15}/><span>{gearNames[telemetry.gear]}</span><ArrowRight className={telemetry.indicator === 'right' ? 'signal-active' : ''} size={15}/></div><b>{speed.toFixed(0)}</b><small>km/h</small><div className="instrument-footer"><span>{telemetry.gear}</span><span>{telemetry.brake ? '煞車中' : '低速行駛'}</span></div></div><div className="wheel-position"><SteeringWheel angle={telemetry.steering}/></div><div className="passenger-dash"><div className="air-vent"/><span>YONGQING</span><div className="glovebox"/></div><div className="car-gear-selector"><div className="gear-slot"/><div className="gear-knob">{telemetry.gear}</div><div className="gear-letters">{(['P', 'R', 'N', 'D'] as Gear[]).map(g => <span className={telemetry.gear === g ? 'current' : ''} key={g}>{g}</span>)}</div></div></div>
              <div className="look-controls"><button aria-label="按住看左側車窗" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); sim.current?.look(-1); }} onPointerUp={() => sim.current?.look(0)} onLostPointerCapture={() => sim.current?.look(0)}><ArrowDownLeft size={13}/>看左側車窗</button><button aria-label="按住看右側車窗" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); sim.current?.look(1); }} onPointerUp={() => sim.current?.look(0)} onLostPointerCapture={() => sim.current?.look(0)}>看右側車窗<ArrowUpRight size={13}/></button></div>
            </>}
            {telemetry.view === 'top' && <div className="top-legend"><span><i className="front-track"/>前輪軌跡</span><span><i className="rear-track"/>後輪軌跡</span><small>上方為場地北側 · 軌跡僅於教學俯視顯示</small></div>}
            {(telemetry.view === 'left' || telemetry.view === 'right') && <div className="mirror-enlarged-caption"><Eye size={16}/>觀察車身與白線的相對位置<button onClick={() => changeView('driver')}>返回駕駛座 <kbd>1</kbd></button></div>}
            {telemetry.boundary && <div className="boundary-notice"><Info size={15}/>邊界接觸：{telemetry.contacts.join('、')}</div>}
            {telemetry.paused && <div className="paused-badge"><Pause size={13}/>畫面已暫停</div>}
            {options && <div className="scene-options"><h3>練習設定<button className="icon-button" aria-label="關閉練習設定" onClick={() => setOptions(false)}><X size={15}/></button></h3><label><span>自動回正<small>建議關閉，練習自己回正</small></span><input type="checkbox" checked={autoCenter} onChange={e => { setAutoCenter(e.target.checked); if (sim.current) sim.current.input.autoCenter = e.target.checked; }}/></label><label><span>顯示四輪軌跡<small>僅在俯視教學顯示</small></span><input type="checkbox" checked={tracks} onChange={e => { setTracks(e.target.checked); if (sim.current) sim.current.showTracks = e.target.checked; }}/></label><label><span>半透明車身<small>俯視時觀察輪胎轉向</small></span><input type="checkbox" checked={transparent} onChange={e => { setTransparent(e.target.checked); if (sim.current) sim.current.transparent = e.target.checked; }}/></label><label><span>除錯模式<small>車身框、輪位與鏡頭範圍</small></span><input type="checkbox" checked={debug} onChange={e => { setDebug(e.target.checked); if (sim.current) sim.current.debug = e.target.checked; }}/></label><button className="calibration-link" onClick={() => { setOptions(false); openDialog('calibration'); }}>校正視野與車輛參數<MoveUpRight size={14}/></button></div>}
            {failure && <div className="render-error" role="alert"><Info size={26}/><p>{failure}</p></div>}
          </div>

          <div className="telemetry-strip"><div className="gear-status"><b data-testid="gear">{telemetry.gear}</b><span>{gearNames[telemetry.gear]}</span></div><div className="strip-divider"/><div className="speed-status"><Gauge size={17}/><b data-testid="speed">{speed.toFixed(1)}</b><span>km/h</span></div><div className="strip-divider"/><div className="steering-status"><span className="mini-wheel">◉</span><span data-testid="steering">{steeringLabel(telemetry.steering)}</span><small>{Math.round(telemetry.steering)}°</small></div><div className="telemetry-right"><span className={`brake-dot ${telemetry.brake ? 'on' : ''}`}/><span>{telemetry.brake ? '煞車中' : '煞車已放開'}</span><button className={`indicator-button ${telemetry.indicator === 'left' ? 'signal-active' : ''}`} aria-label="左方向燈 Q" onClick={() => sim.current?.setIndicator('left')}><ArrowLeft size={19}/></button><button className={`indicator-button ${telemetry.indicator === 'right' ? 'signal-active' : ''}`} aria-label="右方向燈 E" onClick={() => sim.current?.setIndicator('right')}><ArrowRight size={19}/></button></div></div>
          <div className="transport-strip"><div className="simulation-speed"><span>練習速度</span>{[.25, .5, 1].map(rate => <button key={rate} className={timeScale === rate ? 'active' : ''} onClick={() => { setTimeScale(rate); if (sim.current) sim.current.timeScale = rate; }}>{rate}×</button>)}</div><span className="transport-note">{telemetry.paused ? '切換俯視，可觀察保持此轉角的預測軌跡' : '放慢一點，更看得懂車身怎麼走'}</span><button className={`pause-button ${telemetry.paused ? 'active' : ''}`} onClick={() => sim.current?.togglePause()}>{telemetry.paused ? <Play size={15}/> : <Pause size={15}/>} {telemetry.paused ? '繼續練習' : '暫停分析'}</button></div>
        </section>

        {telemetry.paused && <section className="analysis-card"><div><Eye size={19}/><b>此刻的車輛狀態</b></div><span>檔位 <b>{telemetry.gear}</b></span><span>方向盤 <b>{telemetry.steering.toFixed(0)}°</b></span><span>前輪 <b>{telemetry.frontAngle.toFixed(1)}°</b></span><span>車身角度 <b>{(telemetry.heading * 180 / Math.PI).toFixed(1)}°</b></span><span>後軸位置 <b>{telemetry.x.toFixed(2)}, {telemetry.z.toFixed(2)} m</b></span><p>如果保持目前方向盤角度，車子接下來會往哪裡？<button onClick={() => changeView('top')}>切換俯視觀察<ArrowUpRight size={14}/></button></p></section>}
        {debug && <section className="debug-card"><code>後軸中心 ({telemetry.x.toFixed(3)}, {telemetry.z.toFixed(3)}) · 車身角度 {(telemetry.heading * 180 / Math.PI).toFixed(2)}° · 前輪轉角 {telemetry.frontAngle.toFixed(2)}° · 方向盤 {telemetry.steering.toFixed(1)}° · 有向速度 {telemetry.speed.toFixed(3)} m/s · 方向盤／前輪 {config.steeringRatio}:1 · 邊界接觸 {telemetry.lineCrossings} 次 · 駕駛鏡頭 {sim.current?.getDebug().eye.map(n => n.toFixed(2)).join(', ')}</code></section>}

        <div className="learning-row">{!practice ? <section className="lesson-card"><div className="lesson-card-top"><span className="small-eyebrow"><span className="lesson-eye"><Eye size={17}/></span>觀察練習</span><div className="hint-select"><label htmlFor="hint-level">提示</label><select id="hint-level" value={hintLevel} onChange={e => setHintLevel(Number(e.target.value))}><option value={1}>簡潔</option><option value={2}>引導</option><option value={3}>詳細</option></select><ChevronDown size={11}/></div></div><h2>{hintLevel === 1 ? `現在觀察：${lesson.observation}` : lesson.title}</h2><p>{hintLevel > 1 ? lesson.text : '慢慢觀察，再決定下一個操作。'}</p><div className="lesson-footer"><span><span className="online-dot"/>現在觀察：{lesson.observation}</span><span>無記號練習<Check size={12}/></span></div>{hintLevel === 3 && <div className="extra-hint">車尾要往哪一邊，就慢慢向那邊轉方向盤。尚未校正實車參考點，不提供固定轉彎時機。</div>}</section> : <section className="lesson-card practice-card"><span className="small-eyebrow"><Compass size={17}/>自由練習</span><h2>把判斷，交還給自己。</h2><p>自由觀察與修正。這個原型只記錄本次邊界接觸，尚未進行正式關卡評分。</p><div className="lesson-footer"><span>本次邊界接觸 <b>{telemetry.lineCrossings}</b> 次</span><span>尚未儲存練習紀錄</span></div></section>}
          <section className="quick-controls"><div className="controls-heading"><Keyboard size={17}/><h2>把操作放慢，就會更清楚。</h2><button aria-label="顯示完整操作說明" onClick={() => openDialog('shortcuts')}><CircleHelp size={16}/></button></div><div className="control-groups"><div className="gear-controls"><span>排檔</span><div>{(['P', 'R', 'N', 'D'] as Gear[]).map(g => <button aria-label={`排入 ${g} ${gearNames[g]}`} key={g} className={telemetry.gear === g ? 'active' : ''} onClick={() => sim.current?.setGear(g)}>{g}</button>)}</div></div><div className="steer-controls"><span>方向盤</span><div><HoldButton code="KeyA" label="按住方向盤左轉 A" sim={sim.current}><ArrowLeft size={16}/><kbd>A</kbd></HoldButton><HoldButton code="KeyC" label="按住方向盤回正 C" sim={sim.current}>回正<kbd>C</kbd></HoldButton><HoldButton code="KeyD" label="按住方向盤右轉 D" sim={sim.current}><ArrowRight size={16}/><kbd>D</kbd></HoldButton></div></div><div className="pedal-controls"><span>踏板</span><div><button className={`brake-button ${brakeHold ? 'active' : ''}`} aria-pressed={brakeHold} onClick={() => sim.current?.setBrakeHold(!brakeHold)}>{brakeHold ? '解除煞車保持' : '煞車保持'}</button><HoldButton className={telemetry.throttle ? 'throttle-active' : ''} code="KeyW" label="按住輕踩油門 W" sim={sim.current}>油門<kbd>W</kbd></HoldButton></div></div></div><p className="control-tip"><Info size={12}/>起步：煞車保持 → 選擇 D 或 R → 解除保持。隨時按 <kbd>Space</kbd> 煞車。</p></section></div>
        <footer className="page-footer"><span><ShieldCheck size={14}/>觀念與操作練習工具</span><p>本模擬器僅作為駕駛觀念與操作順序練習，實際車輛視野、轉向、尺寸與場地可能不同。實際駕駛請以駕訓班教練指導為準。</p><span className="prototype-label">MILESTONE 01</span></footer>
      </main>
    </div>
    {message && <div className="toast" role="status"><Info size={18}/><span>{message}</span><button aria-label="關閉提示" onClick={() => setMessage('')}><X size={15}/></button></div>}
    {notebook && <CoachNotebook onClose={() => setNotebook(false)}/>}
    {calibration && <CalibrationPanel config={config} onApply={next => { setConfig(next); sim.current?.configure(next); if (sim.current && !sim.current.paused) sim.current.togglePause(); }} onClose={() => setCalibration(false)}/>}
    {shortcuts && <div className="modal-backdrop" onClick={() => setShortcuts(false)}><section className="shortcuts modal" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" onClick={e => e.stopPropagation()}><header><div className="modal-icon"><Keyboard size={22}/></div><div><h2 id="shortcuts-title">先熟悉操作，再慢慢出發</h2><p>按住轉向，放開後方向盤會保持原位</p></div><button className="icon-button close" aria-label="關閉操作說明" onClick={() => setShortcuts(false)}><X size={20}/></button></header><div className="shortcut-list">{[['W', '按住，輕踩油門'], ['S / Space', '按住，煞車'], ['A / D', '按住，向左／右轉方向盤'], ['C', '按住，逐漸回正方向盤'], ['R / F', '煞停並保持煞車後，排入 R／D'], ['Q / E', '左／右方向燈，再按一次關閉'], ['1 / 4', '駕駛座／俯視教學'], ['按住 2 / 3', '暫時放大左／右後照鏡']].map(([key, text]) => <div key={key}><kbd>{key}</kbd><span>{text}</span></div>)}</div><div className="shortcut-note"><Info size={16}/><p>不踩油門也會緩慢蠕行。換檔前請先煞停。離開視窗會自動暫停並啟用煞車保持。</p></div><footer><button className="primary-button" onClick={() => setShortcuts(false)}>了解，開始觀察<ArrowRight size={16}/></button></footer></section></div>}
  </div>;
}
