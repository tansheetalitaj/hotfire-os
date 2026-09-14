'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BatteryFull, Bookmark, ChevronLeft, ChevronRight, CirclePower,
  Download, Edit3, ExternalLink, FastForward, FileText, Folder, FolderOpen, Gamepad2,
  HardDrive, Home as HomeIcon, Image, ListVideo, Maximize2, Minus, MonitorPlay, Music2,
  Pause, Play, Plus, RefreshCw, RotateCcw, Save, Search, Settings, SkipBack, SkipForward,
  Trash2, Upload, Video, Volume2, Wifi, X,
} from 'lucide-react';

type AppId = 'calculator' | 'calendar' | 'music' | 'browser' | 'media' | 'terminal' | 'files' | 'settings' | 'game';
type WindowState = { x: number; y: number; width: number; height: number; z: number; minimized: boolean; maximized: boolean };
type FileType = 'folder' | 'text' | 'image' | 'audio' | 'video';
type VirtualFile = { id: string; name: string; type: FileType; parent: string; meta: string; content?: string };
type Preferences = { wallpaper: 'nebula' | 'ember' | 'midnight'; accent: string; clock24: boolean; showSeconds: boolean; skipStartup: boolean; reduceMotion: boolean };
type BrowserTab = { id: string; title: string; address: string; entries: string[]; index: number; reloadKey: number };

type HotFireTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown;
};

declare global {
  interface Document {
    modelContext?: { registerTool(tool: HotFireTool, options?: { signal?: AbortSignal }): void | Promise<void> };
  }
}

const DEFAULT_PREFERENCES: Preferences = {
  wallpaper: 'nebula', accent: '#ff6a1f', clock24: false, showSeconds: false, skipStartup: false, reduceMotion: false,
};

const APPS: { id: AppId; label: string; icon: string; subtitle: string }[] = [
  { id: 'files', label: 'Files', icon: '/hotfire/icons/files.png', subtitle: 'Create, edit and organize' },
  { id: 'browser', label: 'Flare', icon: '/hotfire/icons/browser.png', subtitle: 'Tabbed web browsing' },
  { id: 'terminal', label: 'Terminal', icon: '/hotfire/icons/terminal.png', subtitle: 'Command HotFire' },
  { id: 'calculator', label: 'Calculator', icon: '/hotfire/icons/calculator.png', subtitle: 'Crunch the numbers' },
  { id: 'calendar', label: 'Calendar', icon: '/hotfire/icons/calendar.png', subtitle: 'Plan your time' },
  { id: 'music', label: 'Music', icon: '/hotfire/icons/music.png', subtitle: 'Play local audio' },
  { id: 'media', label: 'Video', icon: '/hotfire/icons/media.png', subtitle: 'Local playlists and controls' },
  { id: 'game', label: 'Ember Rush', icon: '/hotfire/icons/game.png', subtitle: 'A fast HotFire challenge' },
  { id: 'settings', label: 'Settings', icon: '/hotfire/icons/settings.png', subtitle: 'Make HotFire yours' },
];

const INITIAL_FILES: VirtualFile[] = [
  { id: 'documents', name: 'Documents', type: 'folder', parent: 'root', meta: 'Folder' },
  { id: 'pictures', name: 'Pictures', type: 'folder', parent: 'root', meta: 'Folder' },
  { id: 'music-folder', name: 'Music', type: 'folder', parent: 'root', meta: 'Folder' },
  { id: 'videos-folder', name: 'Videos', type: 'folder', parent: 'root', meta: 'Folder' },
  { id: 'welcome', name: 'Welcome to HotFire.txt', type: 'text', parent: 'root', meta: '1 KB', content: 'Welcome to HotFire OS!\n\nFiles you create and edit here are saved in this browser. Open Settings to personalize your desktop.' },
  { id: 'ideas', name: 'Ideas.txt', type: 'text', parent: 'documents', meta: '1 KB', content: 'Build something brilliant today.' },
];

const getApp = (id: AppId) => APPS.find((app) => app.id === id)!;
const safeName = (value: string) => value.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 60);
const formatTime = (seconds: number) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';

export default function Home() {
  const [phase, setPhase] = useState<'boot' | 'welcome' | 'desktop'>('boot');
  const [windows, setWindows] = useState<Partial<Record<AppId, WindowState>>>({});
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState<Date | null>(null);
  const [files, setFiles] = useState<VirtualFile[]>(INITIAL_FILES);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [storageReady, setStorageReady] = useState(false);
  const zCounter = useRef(5);

  useEffect(() => {
    let bootTimer = 0;
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    setNow(new Date());
    try {
      const savedPreferences = window.localStorage.getItem('hotfire-preferences');
      const nextPreferences = savedPreferences ? { ...DEFAULT_PREFERENCES, ...JSON.parse(savedPreferences) } : DEFAULT_PREFERENCES;
      setPreferences(nextPreferences);
      const savedFiles = window.localStorage.getItem('hotfire-files');
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles) as VirtualFile[];
        setFiles(parsed.map((file) => ({ ...file, parent: file.parent || 'root', content: file.content || '' })));
      }
      bootTimer = window.setTimeout(() => setPhase(nextPreferences.skipStartup ? 'desktop' : 'welcome'), nextPreferences.skipStartup ? 450 : 1700);
    } catch {
      bootTimer = window.setTimeout(() => setPhase('welcome'), 1700);
    }
    setStorageReady(true);
    return () => { window.clearTimeout(bootTimer); window.clearInterval(clock); };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try { window.localStorage.setItem('hotfire-files', JSON.stringify(files)); } catch { /* Keep changes in memory. */ }
  }, [files, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    try { window.localStorage.setItem('hotfire-preferences', JSON.stringify(preferences)); } catch { /* Keep changes in memory. */ }
  }, [preferences, storageReady]);

  const openApp = useCallback((id: AppId) => {
    const index = APPS.findIndex((app) => app.id === id);
    const compact = id === 'calculator';
    const roomy = id === 'files' || id === 'media' || id === 'browser';
    zCounter.current += 1;
    setWindows((current) => ({
      ...current,
      [id]: current[id]
        ? { ...current[id]!, minimized: false, z: zCounter.current }
        : { x: 120 + (index % 5) * 32, y: 74 + (index % 3) * 27, width: compact ? 340 : roomy ? 820 : 700, height: compact ? 545 : roomy ? 560 : 510, z: zCounter.current, minimized: false, maximized: false },
    }));
    setLauncherOpen(false);
  }, []);

  const addFile = useCallback((name: string) => {
    const clean = safeName(name);
    if (!clean) throw new Error('A file name is required.');
    let created: VirtualFile | null = null;
    setFiles((current) => {
      const finalName = clean.toLowerCase().endsWith('.txt') ? clean : `${clean}.txt`;
      if (current.some((file) => file.parent === 'root' && file.name.toLowerCase() === finalName.toLowerCase())) throw new Error('That file already exists.');
      created = { id: `note-${Date.now()}`, name: finalName, type: 'text', parent: 'root', meta: '0 KB', content: '' };
      return [...current, created];
    });
    openApp('files');
    return created;
  }, [openApp]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: 'create_text_file', title: 'Create a HotFire text file',
        description: 'Create an empty text file in the visible HotFire Files app.',
        inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 60 } }, required: ['name'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const name = typeof input === 'object' && input && 'name' in input ? String((input as { name: unknown }).name) : '';
          return { created: true, file: addFile(name) };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch { /* WebMCP is optional. */ }
    return () => lifecycle.abort();
  }, [addFile]);

  const focusWindow = (id: AppId) => {
    zCounter.current += 1;
    setWindows((current) => current[id] ? { ...current, [id]: { ...current[id]!, z: zCounter.current } } : current);
  };
  const closeWindow = (id: AppId) => setWindows((current) => { const next = { ...current }; delete next[id]; return next; });
  const updateWindow = (id: AppId, patch: Partial<WindowState>) => setWindows((current) => current[id] ? { ...current, [id]: { ...current[id]!, ...patch } } : current);
  const filteredApps = APPS.filter((app) => `${app.label} ${app.subtitle}`.toLowerCase().includes(search.toLowerCase()));

  if (phase === 'boot') return <BootScreen onSkip={() => setPhase('welcome')} />;
  if (phase === 'welcome') return <WelcomeScreen now={now} onEnter={() => setPhase('desktop')} />;

  const desktopStyle = { '--fire': preferences.accent } as React.CSSProperties;
  return (
    <main className={`desktop wallpaper-${preferences.wallpaper} ${preferences.reduceMotion ? 'reduce-motion' : ''}`} style={desktopStyle} onPointerDown={() => launcherOpen && setLauncherOpen(false)}>
      <header className="topbar">
        <button className="brand-button" aria-label="Open app launcher" onPointerDown={(event) => event.stopPropagation()} onClick={() => setLauncherOpen((open) => !open)}><img src="/hotfire/logo-icon.png" alt="" /><span>HotFire</span></button>
        <div className="workspace-label">DESKTOP 01</div>
        <button className="system-tray" onClick={() => openApp('settings')} aria-label="Open settings">
          <Wifi size={15} /><BatteryFull size={17} />
          <span><strong>{now?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: preferences.showSeconds ? '2-digit' : undefined, hour12: !preferences.clock24 })}</strong>{now?.toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
        </button>
      </header>

      <section className="desktop-icons" aria-label="Desktop applications">
        {APPS.slice(0, 6).map((app) => <button key={app.id} onDoubleClick={() => openApp(app.id)} onClick={() => openApp(app.id)}><img src={app.icon} alt="" /><span>{app.label}</span></button>)}
      </section>
      <section className="desktop-signature" aria-hidden="true"><img src="/hotfire/logo-icon.png" alt="" /><span>HOT<b>FIRE</b></span><small>OPERATING SYSTEM</small></section>

      {launcherOpen && (
        <section className="launcher" onPointerDown={(event) => event.stopPropagation()}>
          <div className="launcher-header"><img src="/hotfire/logo-icon.png" alt="" /><div><strong>HotFire</strong><span>Ready when you are</span></div><button onClick={() => setPhase('boot')} aria-label="Restart HotFire"><CirclePower size={19} /></button></div>
          <label className="launcher-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apps" autoFocus /></label>
          <div className="launcher-grid">{filteredApps.map((app) => <button key={app.id} onClick={() => openApp(app.id)}><img src={app.icon} alt="" /><span>{app.label}</span><small>{app.subtitle}</small></button>)}</div>
        </section>
      )}

      {(Object.entries(windows) as [AppId, WindowState][]).map(([id, state]) => !state.minimized && (
        <WindowFrame key={id} appId={id} state={state} onFocus={() => focusWindow(id)} onClose={() => closeWindow(id)} onMinimize={() => updateWindow(id, { minimized: true })} onMaximize={() => updateWindow(id, { maximized: !state.maximized })} onMove={(x, y) => updateWindow(id, { x, y })}>
          <AppContent id={id} files={files} setFiles={setFiles} openApp={openApp} preferences={preferences} setPreferences={setPreferences} />
        </WindowFrame>
      ))}

      <nav className="dock" aria-label="HotFire dock" onPointerDown={(event) => event.stopPropagation()}>
        <button className={`hotfire-launcher ${launcherOpen ? 'active' : ''}`} onClick={() => setLauncherOpen((open) => !open)} aria-label="App launcher"><img src="/hotfire/logo-icon.png" alt="" /></button><i />
        {APPS.map((app) => { const state = windows[app.id]; return <button key={app.id} className={state ? 'running' : ''} onClick={() => state && !state.minimized ? updateWindow(app.id, { minimized: true }) : openApp(app.id)} aria-label={app.label}><img src={app.icon} alt="" /><span>{app.label}</span></button>; })}
      </nav>
    </main>
  );
}

function BootScreen({ onSkip }: { onSkip: () => void }) {
  return <main className="boot-screen"><div className="boot-glow" /><img src="/hotfire/logo-icon.png" alt="HotFire" className="boot-mark" /><div className="boot-wordmark">HOT<span>FIRE</span></div><p>Igniting your workspace</p><div className="boot-loader"><i /></div><button onClick={onSkip}>Skip startup</button></main>;
}

function WelcomeScreen({ now, onEnter }: { now: Date | null; onEnter: () => void }) {
  const hour = now?.getHours() ?? 18;
  return <main className="welcome-screen"><div className="welcome-aurora" /><img src="/hotfire/logo-icon.png" alt="HotFire" /><p>{hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}</p><h1>Welcome to HotFire</h1><span>{now?.toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span><button onClick={onEnter}>Enter desktop <ArrowRight size={17} /></button></main>;
}

function WindowFrame({ appId, state, onFocus, onClose, onMinimize, onMaximize, onMove, children }: { appId: AppId; state: WindowState; onFocus: () => void; onClose: () => void; onMinimize: () => void; onMaximize: () => void; onMove: (x: number, y: number) => void; children: React.ReactNode }) {
  const drag = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const app = getApp(appId);
  return (
    <section className={`app-window ${state.maximized ? 'maximized' : ''}`} style={state.maximized ? { zIndex: state.z } : { left: state.x, top: state.y, width: state.width, height: state.height, zIndex: state.z }} onPointerDown={onFocus}>
      <div className="window-titlebar" onDoubleClick={(event) => { if ((event.target as HTMLElement).closest('.window-actions')) return; onMaximize(); }} onPointerDown={(event) => { if (state.maximized || (event.target as HTMLElement).closest('.window-actions')) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { startX: event.clientX, startY: event.clientY, x: state.x, y: state.y }; }} onPointerMove={(event) => { if (!drag.current) return; onMove(Math.max(0, drag.current.x + event.clientX - drag.current.startX), Math.max(44, drag.current.y + event.clientY - drag.current.startY)); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="window-name"><img src={app.icon} alt="" /><span>{app.label}</span></div>
        <div className="window-actions" onPointerDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><button type="button" onClick={onMinimize} aria-label="Minimize" title="Minimize"><Minus size={15} /></button><button type="button" onClick={onMaximize} aria-label={state.maximized ? 'Restore' : 'Maximize'} title={state.maximized ? 'Restore' : 'Maximize'}><Maximize2 size={13} /></button><button type="button" className="close" onClick={onClose} aria-label="Close" title="Close"><X size={16} /></button></div>
      </div>
      <div className="window-content">{children}</div>
    </section>
  );
}

function AppContent({ id, files, setFiles, openApp, preferences, setPreferences }: { id: AppId; files: VirtualFile[]; setFiles: React.Dispatch<React.SetStateAction<VirtualFile[]>>; openApp: (id: AppId) => void; preferences: Preferences; setPreferences: React.Dispatch<React.SetStateAction<Preferences>> }) {
  if (id === 'calculator') return <CalculatorApp />;
  if (id === 'calendar') return <CalendarApp />;
  if (id === 'music') return <AudioPlayerApp />;
  if (id === 'media') return <VideoPlayerApp />;
  if (id === 'browser') return <BrowserApp />;
  if (id === 'terminal') return <TerminalApp openApp={openApp} files={files} />;
  if (id === 'settings') return <SettingsApp preferences={preferences} setPreferences={setPreferences} />;
  if (id === 'game') return <EmberRushApp />;
  return <FilesApp files={files} setFiles={setFiles} />;
}

function CalculatorApp() {
  const [display, setDisplay] = useState('0');
  const press = (key: string) => {
    if (key === 'C') return setDisplay('0');
    if (key === '⌫') return setDisplay((value) => value.length > 1 ? value.slice(0, -1) : '0');
    if (key === '=') { try { const safe = display.replace(/×/g, '*').replace(/÷/g, '/'); if (/^[0-9+\-*/.() ]+$/.test(safe)) setDisplay(String(Function(`"use strict"; return (${safe})`)())); } catch { setDisplay('Error'); } return; }
    setDisplay((value) => value === '0' || value === 'Error' ? key : value + key);
  };
  return <div className="calculator-app"><div className="calc-mode">STANDARD</div><output>{display}</output><div className="calc-grid">{['C','⌫','(',')','7','8','9','÷','4','5','6','×','1','2','3','-','0','.','=','+'].map((key) => <button key={key} className={key === '=' ? 'equals' : /[÷×+\-]/.test(key) ? 'operator' : ''} onClick={() => press(key)}>{key}</button>)}</div></div>;
}

function CalendarApp() {
  const [cursor, setCursor] = useState(new Date());
  const today = new Date();
  const days = useMemo(() => { const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate(); return [...Array(first.getDay()).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]; }, [cursor]);
  return <div className="calendar-app"><aside><div className="calendar-today"><strong>{today.getDate()}</strong><span>{today.toLocaleDateString([], { weekday: 'long' })}</span></div><h3>Today</h3><div className="agenda-item"><i />12:30<span>Focus time</span></div><div className="agenda-item"><i />18:00<span>Evening reset</span></div></aside><section><header><div><small>{cursor.getFullYear()}</small><h2>{cursor.toLocaleDateString([], { month: 'long' })}</h2></div><div><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft /></button><button onClick={() => setCursor(new Date())}>Today</button><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight /></button></div></header><div className="calendar-grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <b key={day}>{day}</b>)}{days.map((day, index) => <span key={`${day}-${index}`} className={day === today.getDate() && cursor.getMonth() === today.getMonth() && cursor.getFullYear() === today.getFullYear() ? 'today' : ''}>{day}</span>)}</div></section></div>;
}

function AudioPlayerApp() {
  const [source, setSource] = useState('');
  const [name, setName] = useState('');
  const ownedUrl = useRef('');
  useEffect(() => () => { if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); }, []);
  const choose = (file?: File) => { if (!file) return; if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current); ownedUrl.current = URL.createObjectURL(file); setSource(ownedUrl.current); setName(file.name); };
  return <div className="local-media audio"><div className="media-stage">{source ? <><img src="/hotfire/logo-icon.png" alt="" className="album-art" /><div className="sound-bars">{[1,2,3,4,5,6,7,8,9].map((bar) => <i key={bar} />)}</div></> : <div className="empty-media"><Music2 /><h2>Your sound. Your space.</h2><p>Choose an audio file. It stays on this device.</p></div>}</div><footer><div><small>NOW PLAYING</small><strong>{name || 'No track selected'}</strong></div>{source && <audio src={source} controls autoPlay />}<label><Plus size={17} /> Choose audio<input type="file" accept="audio/*" onChange={(event) => choose(event.target.files?.[0])} /></label></footer></div>;
}

function VideoPlayerApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ownedUrls = useRef<string[]>([]);
  const [playlist, setPlaylist] = useState<{ name: string; url: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(.8);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const current = playlist[currentIndex];
  useEffect(() => () => ownedUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  useEffect(() => { const video = videoRef.current; if (video) { video.volume = volume; video.playbackRate = speed; } }, [volume, speed, currentIndex]);
  const choose = (chosen: FileList | null) => {
    if (!chosen?.length) return;
    const additions = Array.from(chosen).map((file) => { const url = URL.createObjectURL(file); ownedUrls.current.push(url); return { name: file.name, url }; });
    setPlaylist((items) => { if (!items.length) setCurrentIndex(0); return [...items, ...additions]; });
  };
  const toggle = async () => { const video = videoRef.current; if (!video) return; if (video.paused) await video.play(); else video.pause(); };
  const jump = (amount: number) => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + amount)); };
  const moveTrack = (amount: number) => { if (!playlist.length) return; setCurrentIndex((index) => (index + amount + playlist.length) % playlist.length); setTime(0); setPlaying(false); };
  const fullscreen = () => videoRef.current?.requestFullscreen?.();
  const pictureInPicture = async () => { const video = videoRef.current as HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> }; if (video?.requestPictureInPicture) await video.requestPictureInPicture(); };
  return <div className="video-player-app">
    <div className="video-main">
      <div className="video-stage">{current ? <video ref={videoRef} key={current.url} src={current.url} onClick={toggle} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); event.currentTarget.volume = volume; event.currentTarget.playbackRate = speed; void event.currentTarget.play(); }} onEnded={() => loop ? void videoRef.current?.play() : moveTrack(1)} /> : <div className="empty-media"><MonitorPlay /><h2>HotFire Video</h2><p>Add one video or a whole playlist from your device.</p><label className="primary-upload"><Upload size={17} /> Add videos<input type="file" accept="video/*" multiple onChange={(event) => choose(event.target.files)} /></label></div>}</div>
      <div className="video-controls">
        <input className="timeline" aria-label="Video position" type="range" min="0" max={duration || 0} step=".1" value={Math.min(time, duration || 0)} onChange={(event) => { const next = Number(event.target.value); setTime(next); if (videoRef.current) videoRef.current.currentTime = next; }} />
        <div className="control-row"><button onClick={() => moveTrack(-1)} aria-label="Previous video"><SkipBack /></button><button onClick={() => jump(-10)} aria-label="Back 10 seconds"><RotateCcw /></button><button className="main-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause /> : <Play />}</button><button onClick={() => jump(10)} aria-label="Forward 10 seconds"><FastForward /></button><button onClick={() => moveTrack(1)} aria-label="Next video"><SkipForward /></button><span>{formatTime(time)} / {formatTime(duration)}</span><Volume2 size={16} /><input aria-label="Volume" type="range" min="0" max="1" step=".05" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /><select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{[.5,.75,1,1.25,1.5,2].map((value) => <option key={value} value={value}>{value}×</option>)}</select><button className={loop ? 'active-control' : ''} onClick={() => setLoop((value) => !value)} title="Loop">Loop</button><button onClick={pictureInPicture} title="Picture in picture">PiP</button><button onClick={fullscreen} title="Fullscreen"><Maximize2 /></button></div>
      </div>
    </div>
    <aside className="video-playlist"><header><div><ListVideo /><strong>Playlist</strong></div><label><Plus /> Add<input type="file" accept="video/*" multiple onChange={(event) => choose(event.target.files)} /></label></header>{playlist.length ? playlist.map((item, index) => <button key={item.url} className={index === currentIndex ? 'selected' : ''} onClick={() => { setCurrentIndex(index); setTime(0); }}><Video /><span>{item.name}</span><small>{index === currentIndex ? 'Now playing' : `Track ${index + 1}`}</small></button>) : <p>Your playlist is empty.</p>}</aside>
  </div>;
}

function BrowserApp() {
  const makeTab = (): BrowserTab => ({ id: `tab-${Date.now()}-${Math.random()}`, title: 'New tab', address: '', entries: [], index: -1, reloadKey: 0 });
  const [tabs, setTabs] = useState<BrowserTab[]>([makeTab()]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [bookmarks, setBookmarks] = useState<{ title: string; url: string }[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  useEffect(() => { try { const saved = window.localStorage.getItem('flare-bookmarks'); if (saved) setBookmarks(JSON.parse(saved)); } catch { /* Optional storage. */ } }, []);
  useEffect(() => { try { window.localStorage.setItem('flare-bookmarks', JSON.stringify(bookmarks)); } catch { /* Optional storage. */ } }, [bookmarks]);
  const active = tabs.find((tab) => tab.id === activeId) || tabs[0];
  const url = active.entries[active.index] || '';
  const updateActive = (updater: (tab: BrowserTab) => BrowserTab) => setTabs((current) => current.map((tab) => tab.id === activeId ? updater(tab) : tab));
  const normalize = (value: string) => /^https?:\/\//i.test(value) ? value : (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value) ? `https://${value}` : `https://www.google.com/search?igu=1&q=${encodeURIComponent(value)}`);
  const navigate = (raw = active.address) => { const value = raw.trim(); if (!value) return; const nextUrl = normalize(value); updateActive((tab) => ({ ...tab, title: value.slice(0, 28), address: value, entries: [...tab.entries.slice(0, tab.index + 1), nextUrl], index: tab.index + 1 })); };
  const goHistory = (delta: number) => updateActive((tab) => { const index = Math.max(0, Math.min(tab.entries.length - 1, tab.index + delta)); return { ...tab, index, address: tab.entries[index] || '' }; });
  const addTab = () => { const next = makeTab(); setTabs((current) => [...current, next]); setActiveId(next.id); };
  const closeTab = (id: string) => setTabs((current) => { if (current.length === 1) return [{ ...current[0], title: 'New tab', address: '', entries: [], index: -1 }]; const index = current.findIndex((tab) => tab.id === id); const next = current.filter((tab) => tab.id !== id); if (id === activeId) setActiveId(next[Math.max(0, index - 1)].id); return next; });
  const bookmark = () => { if (!url || bookmarks.some((item) => item.url === url)) return; setBookmarks((items) => [...items, { title: active.title || url, url }]); };
  return <div className="browser-app">
    <div className="browser-tabs">{tabs.map((tab) => <button key={tab.id} className={tab.id === activeId ? 'active' : ''} onClick={() => setActiveId(tab.id)}><img src="/hotfire/icons/browser.png" alt="" /><span>{tab.title}</span><i role="button" aria-label={`Close ${tab.title}`} onClick={(event) => { event.stopPropagation(); closeTab(tab.id); }}><X /></i></button>)}<button className="new-tab" onClick={addTab} aria-label="New tab"><Plus /></button></div>
    <form className="browser-toolbar" onSubmit={(event) => { event.preventDefault(); navigate(); }}><button type="button" disabled={active.index <= 0} onClick={() => goHistory(-1)} aria-label="Back"><ArrowLeft /></button><button type="button" disabled={active.index >= active.entries.length - 1} onClick={() => goHistory(1)} aria-label="Forward"><ArrowRight /></button><button type="button" onClick={() => updateActive((tab) => ({ ...tab, reloadKey: tab.reloadKey + 1 }))} aria-label="Reload"><RefreshCw /></button><button type="button" onClick={() => updateActive((tab) => ({ ...tab, title: 'New tab', address: '', entries: [], index: -1 }))} aria-label="Home"><HomeIcon /></button><label><Search /><input value={active.address} onChange={(event) => updateActive((tab) => ({ ...tab, address: event.target.value }))} placeholder="Search or enter an address" /></label><button className={bookmarks.some((item) => item.url === url) ? 'bookmarked' : ''} type="button" onClick={bookmark} aria-label="Bookmark page"><Bookmark /></button><button type="button" onClick={() => setShowLibrary((value) => !value)} aria-label="Bookmarks and history"><ListVideo /></button><button className="go" type="submit">Go</button></form>
    {showLibrary && <aside className="browser-library"><header><strong>Flare library</strong><button onClick={() => setShowLibrary(false)}><X /></button></header><h4>Bookmarks</h4>{bookmarks.length ? bookmarks.map((item) => <div key={item.url}><button onClick={() => { updateActive((tab) => ({ ...tab, address: item.url })); navigate(item.url); setShowLibrary(false); }}>{item.title}</button><button aria-label="Remove bookmark" onClick={() => setBookmarks((items) => items.filter((entry) => entry.url !== item.url))}><Trash2 /></button></div>) : <p>No bookmarks yet.</p>}<h4>Recent in this tab</h4>{active.entries.slice().reverse().map((entry) => <button key={entry} onClick={() => { updateActive((tab) => ({ ...tab, address: entry })); navigate(entry); setShowLibrary(false); }}>{entry}</button>)}</aside>}
    {url ? <div className="browser-frame"><iframe key={`${url}-${active.reloadKey}`} src={url} title="Flare browser page" sandbox="allow-forms allow-scripts allow-same-origin" /><button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}><ExternalLink /> Open externally</button></div> : <div className="flare-home"><img src="/hotfire/logo-icon.png" alt="" /><h2>Flare</h2><p>Fast paths to the places you love.</p><div><button onClick={() => navigate('wikipedia.org')}>Wikipedia</button><button onClick={() => navigate('example.com')}>Example</button><button onClick={() => navigate('openai.com')}>OpenAI</button></div><small>Some sites block embedded browsers. Use “Open externally” when a page refuses to load.</small></div>}
  </div>;
}

function TerminalApp({ openApp, files }: { openApp: (id: AppId) => void; files: VirtualFile[] }) {
  const [lines, setLines] = useState(['HotFire Terminal 2.0', 'Type “help” to see available commands.', '']);
  const [input, setInput] = useState('');
  const run = () => {
    const command = input.trim(); if (!command) return;
    const [verb, ...args] = command.split(/\s+/); let output = '';
    if (verb === 'help') output = 'help  date  clear  ls  whoami  echo [text]  open [app]';
    else if (verb === 'date') output = new Date().toString();
    else if (verb === 'whoami') output = 'hotfire-user';
    else if (verb === 'ls') output = files.filter((file) => file.parent === 'root').map((file) => file.name).join('   ');
    else if (verb === 'echo') output = args.join(' ');
    else if (verb === 'open' && APPS.some((app) => app.id === args[0])) { openApp(args[0] as AppId); output = `Opening ${args[0]}…`; }
    else if (verb === 'clear') { setLines([]); setInput(''); return; }
    else output = `Command not found: ${verb}. Try “help”.`;
    setLines((current) => [...current, `hotfire@desktop:~$ ${command}`, output, '']); setInput('');
  };
  return <div className="terminal-app" onClick={(event) => (event.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}><div className="terminal-lines">{lines.map((line, index) => <div key={index}>{line || '\u00a0'}</div>)}</div><label><span>hotfire@desktop:~$</span><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && run()} autoFocus aria-label="Terminal command" /></label></div>;
}

function FilesApp({ files, setFiles }: { files: VirtualFile[]; setFiles: React.Dispatch<React.SetStateAction<VirtualFile[]>> }) {
  const [folderId, setFolderId] = useState('root');
  const [history, setHistory] = useState(['root']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const selected = files.find((file) => file.id === selectedId);
  const currentFiles = files.filter((file) => file.parent === folderId && file.name.toLowerCase().includes(query.toLowerCase()));
  const folderName = folderId === 'root' ? 'Home' : files.find((file) => file.id === folderId)?.name || 'Home';
  const navigateFolder = (id: string) => { setFolderId(id); setHistory((items) => [...items.slice(0, historyIndex + 1), id]); setHistoryIndex((index) => index + 1); setSelectedId(null); };
  const travel = (delta: number) => { const next = historyIndex + delta; if (next < 0 || next >= history.length) return; setHistoryIndex(next); setFolderId(history[next]); setSelectedId(null); };
  const create = (type: 'text' | 'folder') => {
    const clean = safeName(name); if (!clean) return setMessage('Enter a name first.');
    const finalName = type === 'text' && !clean.toLowerCase().endsWith('.txt') ? `${clean}.txt` : clean;
    if (files.some((file) => file.parent === folderId && file.name.toLowerCase() === finalName.toLowerCase())) return setMessage('That name is already in this folder.');
    const file: VirtualFile = { id: `${type}-${Date.now()}`, name: finalName, type, parent: folderId, meta: type === 'folder' ? 'Folder' : '0 KB', content: type === 'text' ? '' : undefined };
    setFiles((items) => [...items, file]); setName(''); setMessage(`${file.name} created`); setSelectedId(file.id); setDraft(file.content || '');
  };
  const open = (file: VirtualFile) => { if (file.type === 'folder') navigateFolder(file.id); else { setSelectedId(file.id); setDraft(file.content || ''); } };
  const save = () => { if (!selected || selected.type !== 'text') return; setFiles((items) => items.map((file) => file.id === selected.id ? { ...file, content: draft, meta: `${Math.max(1, Math.ceil(new Blob([draft]).size / 1024))} KB` } : file)); setMessage(`${selected.name} saved`); };
  const rename = () => { if (!selected) return; const nextName = window.prompt('Rename item', selected.name); const clean = safeName(nextName || ''); if (!clean) return; setFiles((items) => items.map((file) => file.id === selected.id ? { ...file, name: clean } : file)); setMessage('Item renamed'); };
  const remove = () => { if (!selected || !window.confirm(`Delete “${selected.name}” and anything inside it?`)) return; const ids = new Set([selected.id]); let changed = true; while (changed) { changed = false; files.forEach((file) => { if (ids.has(file.parent) && !ids.has(file.id)) { ids.add(file.id); changed = true; } }); } setFiles((items) => items.filter((file) => !ids.has(file.id))); setSelectedId(null); setMessage('Item deleted'); };
  const download = () => { if (!selected || selected.type !== 'text') return; const url = URL.createObjectURL(new Blob([selected.content || ''], { type: 'text/plain' })); const link = document.createElement('a'); link.href = url; link.download = selected.name; link.click(); URL.revokeObjectURL(url); };
  const importFiles = async (list: FileList | null) => { if (!list?.length) return; const additions: VirtualFile[] = []; for (const file of Array.from(list)) { const isText = file.type.startsWith('text/') || file.name.endsWith('.txt'); additions.push({ id: `import-${Date.now()}-${Math.random()}`, name: file.name, type: isText ? 'text' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'text', parent: folderId, meta: `${Math.max(1, Math.ceil(file.size / 1024))} KB`, content: isText ? await file.text() : 'Imported file metadata. Binary content stays on your device.' }); } setFiles((items) => [...items, ...additions]); setMessage(`${additions.length} item${additions.length === 1 ? '' : 's'} imported`); };
  const iconFor = (type: FileType) => type === 'folder' ? <Folder /> : type === 'image' ? <Image /> : type === 'audio' ? <Music2 /> : type === 'video' ? <Video /> : <FileText />;
  const quickFolder = (name: string) => files.find((file) => file.parent === 'root' && file.type === 'folder' && file.name === name)?.id;
  return <div className="files-app"><aside><strong>PLACES</strong><button className={folderId === 'root' ? 'selected' : ''} onClick={() => navigateFolder('root')}><HomeIcon /> Home</button>{['Documents','Pictures','Music','Videos'].map((item) => <button key={item} className={folderId === quickFolder(item) ? 'selected' : ''} onClick={() => { const id = quickFolder(item); if (id) navigateFolder(id); }}>{item === 'Pictures' ? <Image /> : item === 'Music' ? <Music2 /> : item === 'Videos' ? <Video /> : <FolderOpen />}{item}</button>)}<strong>STORAGE</strong><button><HardDrive /> HotFire Drive</button><div className="storage-bar"><i /></div><small>{files.length} virtual items saved locally</small></aside><section>
    <header className="file-toolbar"><div><button disabled={historyIndex === 0} onClick={() => travel(-1)}><ArrowLeft /></button><button disabled={historyIndex === history.length - 1} onClick={() => travel(1)}><ArrowRight /></button><button onClick={() => navigateFolder('root')}><HomeIcon /></button><span>/ {folderName}</span></div><label className="file-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folder" /></label></header>
    <div className="file-create"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create('text')} placeholder="Name a new item" /><button onClick={() => create('text')}><FileText /> New file</button><button onClick={() => create('folder')}><Folder /> New folder</button><label><Upload /> Import<input type="file" multiple onChange={(event) => importFiles(event.target.files)} /></label></div>
    {message && <output>{message}</output>}<div className="file-workspace"><div className="file-grid">{currentFiles.map((file) => <button key={file.id} className={file.id === selectedId ? 'selected' : ''} onClick={() => { setSelectedId(file.id); setDraft(file.content || ''); }} onDoubleClick={() => open(file)}>{iconFor(file.type)}<span>{file.name}</span><small>{file.meta}</small></button>)}{!currentFiles.length && <div className="empty-folder"><FolderOpen /><span>This folder is empty.</span></div>}</div>
    {selected && <aside className="file-inspector"><header><div>{iconFor(selected.type)}<strong>{selected.name}</strong></div><button onClick={() => setSelectedId(null)}><X /></button></header>{selected.type === 'text' ? <textarea value={draft} onChange={(event) => setDraft(event.target.value)} aria-label={`Edit ${selected.name}`} /> : <div className="file-preview">{iconFor(selected.type)}<p>{selected.type === 'folder' ? 'Double-click to open this folder.' : 'This browser-safe file manager stores imported binary metadata only.'}</p></div>}<footer>{selected.type === 'text' && <><button className="primary" onClick={save}><Save /> Save</button><button onClick={download}><Download /> Export</button></>}<button onClick={rename}><Edit3 /> Rename</button><button className="danger" onClick={remove}><Trash2 /> Delete</button></footer></aside>}
    </div></section></div>;
}

function SettingsApp({ preferences, setPreferences }: { preferences: Preferences; setPreferences: React.Dispatch<React.SetStateAction<Preferences>> }) {
  const patch = (next: Partial<Preferences>) => setPreferences((current) => ({ ...current, ...next }));
  return <div className="settings-app"><aside><img src="/hotfire/icons/settings.png" alt="" /><h2>Settings</h2><p>Personalize your HotFire desktop.</p><button className="selected"><Settings /> Personalization</button></aside><section><header><small>HOTFIRE SETTINGS</small><h2>Make it feel like yours</h2></header><div className="setting-group"><h3>Wallpaper</h3><div className="wallpaper-options">{(['nebula','ember','midnight'] as const).map((wallpaper) => <button key={wallpaper} className={`${wallpaper} ${preferences.wallpaper === wallpaper ? 'selected' : ''}`} onClick={() => patch({ wallpaper })}><i /><span>{wallpaper}</span></button>)}</div></div><div className="setting-group"><h3>Accent color</h3><div className="accent-options">{['#ff6a1f','#ff3d5a','#8b5cf6','#24a8ff','#29c77f'].map((accent) => <button key={accent} className={preferences.accent === accent ? 'selected' : ''} style={{ background: accent }} onClick={() => patch({ accent })} aria-label={`Use ${accent}`} />)}<input type="color" value={preferences.accent} onChange={(event) => patch({ accent: event.target.value })} aria-label="Custom accent color" /></div></div><div className="setting-group toggles"><h3>Desktop behavior</h3><Toggle label="Use 24-hour clock" checked={preferences.clock24} onChange={(clock24) => patch({ clock24 })} /><Toggle label="Show seconds in the clock" checked={preferences.showSeconds} onChange={(showSeconds) => patch({ showSeconds })} /><Toggle label="Skip welcome screen on startup" checked={preferences.skipStartup} onChange={(skipStartup) => patch({ skipStartup })} /><Toggle label="Reduce visual motion" checked={preferences.reduceMotion} onChange={(reduceMotion) => patch({ reduceMotion })} /></div><button className="reset-settings" onClick={() => setPreferences(DEFAULT_PREFERENCES)}><RotateCcw /> Restore defaults</button></section></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
}

function EmberRushApp() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(20);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [target, setTarget] = useState(12);
  const [best, setBest] = useState(0);
  useEffect(() => { try { setBest(Number(window.localStorage.getItem('ember-rush-best')) || 0); } catch { /* Optional storage. */ } }, []);
  useEffect(() => { if (!playing) return; const timer = window.setInterval(() => setTime((value) => { if (value <= 1) { setPlaying(false); return 0; } return value - 1; }), 1000); return () => window.clearInterval(timer); }, [playing]);
  useEffect(() => { if (!playing && time === 0 && score > best) { setBest(score); try { window.localStorage.setItem('ember-rush-best', String(score)); } catch { /* Optional storage. */ } } }, [playing, time, score, best]);
  const start = () => { setScore(0); setStreak(0); setTime(20); setTarget(Math.floor(Math.random() * 25)); setPlaying(true); };
  const hit = (index: number) => { if (!playing) return; if (index === target) { setScore((value) => value + 10 + streak * 2); setStreak((value) => value + 1); setTarget((current) => { let next = Math.floor(Math.random() * 25); while (next === current) next = Math.floor(Math.random() * 25); return next; }); } else setStreak(0); };
  return <div className="ember-game"><header><div><Gamepad2 /><span>EMBER RUSH</span></div><div><small>SCORE</small><strong>{score}</strong><small>BEST</small><strong>{best}</strong><small>TIME</small><strong>{time}s</strong></div></header><section className="ember-board">{Array.from({ length: 25 }, (_, index) => <button key={index} className={playing && index === target ? 'target' : ''} onClick={() => hit(index)} aria-label={playing && index === target ? 'Catch the ember' : 'Empty tile'}>{playing && index === target && <img src="/hotfire/logo-icon.png" alt="" />}</button>)}</section><footer><div><strong>{playing ? `${streak}× streak` : time === 0 ? `Final score: ${score}` : 'Catch the moving flame!'}</strong><span>Hit the bright HotFire mark before time runs out.</span></div><button onClick={start}>{playing ? 'Restart' : time === 0 ? 'Play again' : 'Start game'}</button></footer></div>;
}
