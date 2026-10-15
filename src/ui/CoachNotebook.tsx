import { useEffect, useRef, useState } from 'react';
import { BookOpen, ExternalLink, Film, Info, X } from 'lucide-react';
import { coachNotes, isActionableNote, schoolVideoUrl } from '../data/coachNotes';

const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export default function CoachNotebook({ onClose }: { onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="coach-notebook modal" role="dialog" aria-modal="true" aria-labelledby="coach-title" onClick={e => e.stopPropagation()}>
      <header><div className="modal-icon"><BookOpen size={22}/></div><div><h2 id="coach-title">教練影片與口訣</h2><p>先保留原文，再依影片核對觀察位置與操作時機。</p></div><button className="icon-button close" aria-label="關閉教練筆記" onClick={onClose}><X size={20}/></button></header>
      <div className="coach-scroll">
        <div className="coach-source-notice"><Info size={17}/><p>以下兩則口訣來自你先前提供的文字，尚未與教練影片核對；目前不會觸發轉向提示。真實關卡與路線仍待影片確認。</p></div>
        <div className="coach-notes-list">{coachNotes.map(note => <article className="coach-note" key={note.id}>
          <div><span>{note.title} · {note.gear}</span><small>{isActionableNote(note) ? '影片已核對' : '待影片核對'}</small></div>
          <blockquote>「{note.quote}」</blockquote>
          <dl><div><dt>來源</dt><dd>{note.source === 'user-message' ? '你提供的原文' : note.source === 'coach-video' ? '教練實車影片' : '駕訓班官方影片'}</dd></div>
            <div><dt>影片時間</dt><dd>{note.startSeconds === null ? '尚未確認' : timeLabel(note.startSeconds)}</dd></div>
            <div><dt>適用關卡</dt><dd>{note.checkpointId ?? '尚未對應'}</dd></div>
            <div><dt>觀察位置</dt><dd>{note.observation ?? '尚未確認'}</dd></div></dl>
        </article>)}</div>
        <h3><Film size={17}/>對照你的教練影片</h3>
        <p className="coach-video-note">可以載入電腦裡的 MP4，在遊戲內播放與對照。影片只在你的瀏覽器播放，不會上傳到公開網站；載入影片不會自動產生逐字稿。</p>
        <input ref={input} type="file" accept="video/*,.mp4" aria-label="選擇本機教練影片" onChange={e => {
          const file = e.target.files?.[0]; if (!file) return;
          if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) { setError('請選擇 MP4 或其他瀏覽器支援的影片。'); return; }
          setVideoUrl(URL.createObjectURL(file)); setFileName(file.name); setError('');
        }} hidden/>
        <button className="hood-preset-button" onClick={() => input.current?.click()}><Film size={15}/>{videoUrl ? '更換教練影片' : '選擇電腦中的教練影片'}</button>
        {error && <p className="coach-error" role="alert">{error}</p>}
        {videoUrl && <div className="coach-video"><video src={videoUrl} controls playsInline preload="metadata" aria-label="本機教練影片" onError={() => setError('瀏覽器無法播放這個影片格式，請改用 H.264 編碼的 MP4。')}/><p>{fileName}</p></div>}
        <a className="school-video-link" href={schoolVideoUrl} target="_blank" rel="noreferrer">開啟永慶官方場考影片<ExternalLink size={14}/></a>
      </div>
      <footer><p className="small-note">目前仍是測試場地，尚未完成永慶實際場地重建。</p><button className="primary-button" onClick={onClose}>回到駕駛練習</button></footer>
    </section>
  </div>;
}
