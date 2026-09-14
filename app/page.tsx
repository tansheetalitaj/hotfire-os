'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BatteryFull, ChevronLeft, ChevronRight, CirclePower,
  FileText, Folder, FolderOpen, Grid2X2, HardDrive, Home as HomeIcon, Image, Maximize2,
  Minus, MonitorPlay, Music2, Plus, Search, TerminalSquare, Video, Wifi, X,
} from 'lucide-react';

type AppId = 'calculator' | 'calendar' | 'music' | 'browser' | 'media' | 'terminal' | 'files';
type WindowState = { x: number; y: number; width: number; height: number; z: number; minimized: boolean; maximized: boolean };
type VirtualFile = { id: string; name: string; type: 'folder' | 'text' | 'image' | 'audio' | 'video'; meta: string };

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

const APPS: { id: AppId; label: string; icon: string; subtitle: string }[] = [
  { id: 'files', label: 'Files', icon: '/hotfire/icons/files.ico', subtitle: 'Browse your workspace' },
  { id: 'browser', label: 'Flare', icon: '/hotfire/icons/browser.ico', subtitle: 'Explore the web' },
  { id: 'terminal', label: 'Terminal', icon: '/hotfire/icons/terminal.ico', subtitle: 'Command HotFire' },
  { id: 'calculator', label: 'Calculator', icon: '/hotfire/icons/calculator.ico', subtitle: 'Crunch the numbers' },
  { id: 'calendar', label: 'Calendar', icon: '/hotfire/icons/calendar.ico', subtitle: 'Plan your time' },
  { id: 'music', label: 'Music', icon: '/hotfire/icons/music.ico', subtitle: 'Play local audio' },
  { id: 'media', label: 'Media', icon: '/hotfire/icons/media.ico', subtitle: 'Watch local video' },
];

const INITIAL_FILES: VirtualFile[] = [
  { id: 'documents', name: 'Documents', type: 'folder', meta: '3 items' },
  { id: 'pictures', name: 'Pictures', type: 'folder', meta: '8 items' },
  { id: 'music', name: 'Music', type: 'folder', meta: 'Local audio' },
  { id: 'videos', name: 'Videos', type: 'folder', meta: 'Local video' },
  { id: 'welcome', name: 'Welcome to HotFire.txt', type: 'text', meta: '1 KB' },
];

const getApp = (id: AppId) => APPS.find((app) => app.id === id)!;

export default function Home() {
  const [phase, setPhase] = useState<'boot' | 'welcome' | 'desktop'>('boot');
  const [windows, setWindows] = useState<Partial<Record<AppId, WindowState>>>({});
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [now, setNow] = useState<Date | null>(null);
  const [files, setFiles] = useState<VirtualFile[]>(INITIAL_FILES);
  const zCounter = useRef(5);

  useEffect(() => {
    const bootTimer = window.setTimeout(() => setPhase('welcome'), 1700);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    setNow(new Date());
    try {
      const saved = window.localStorage.getItem('hotfire-files');
      if (saved) setFiles(JSON.parse(saved));
    } catch { /* Browser storage may be unavailable. */ }
    return () => { window.clearTimeout(bootTimer); window.clearInterval(clock); };
  }, []);

  const openApp = useCallback((id: AppId) => {
    const index = APPS.findIndex((app) => app.id === id);
    zCounter.current += 1;
    setWindows((current) => ({
      ...current,
      [id]: current[id]
        ? { ...current[id]!, minimized: false, z: zCounter.current }
        : { x: 150 + (index % 4) * 34, y: 82 + (index % 3) * 28, width: id === 'calculator' ? 340 : 720, height: id === 'calculator' ? 545 : 500, z: zCounter.current, minimized: false, maximized: false },
    }));
    setLauncherOpen(false);
  }, []);

  const addFile = useCallback((name: string) => {
    const cleanName = name.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 60);
    if (!cleanName) throw new Error('A file name is required.');
    let created: VirtualFile | null = null;
    setFiles((current) => {
      const finalName = cleanName.toLowerCase().endsWith('.txt') ? cleanName : `${cleanName}.txt`;
      if (current.some((file) => file.name.toLowerCase() === finalName.toLowerCase())) throw new Error('That file already exists.');
      created = { id: `note-${Date.now()}`, name: finalName, type: 'text', meta: '0 KB' };
      const next = [...current, created];
      try { window.localStorage.setItem('hotfire-files', JSON.stringify(next)); } catch { /* Keep in session. */ }
      return next;
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
        name: 'create_text_file',
        title: 'Create a HotFire text file',
        description: 'Create an empty text file in the visible HotFire Files app.',
        inputSchema: { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 60 } }, required: ['name'], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const name = typeof input === 'object' && input && 'name' in input ? String((input as { name: unknown }).name) : '';
          const file = addFile(name);
          return { created: true, file };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch { /* WebMCP is optional and still experimental. */ }
    return () => lifecycle.abort();
  }, [addFile]);

  const focusWindow = (id: AppId) => {
    zCounter.current += 1;
    setWindows((current) => current[id] ? { ...current, [id]: { ...current[id]!, z: zCounter.current } } : current);
  };

  const closeWindow = (id: AppId) => setWindows((current) => { const next = { ...current }; delete next[id]; return next; });
  const updateWindow = (id: AppId, patch: Partial<WindowState>) => setWindows((current) => current[id] ? { ...current, [id]: { ...current[id]!, ...patch } } : current);
  const filteredApps = APPS.filter((app) => app.label.toLowerCase().includes(search.toLowerCase()));

  if (phase === 'boot') return <BootScreen onSkip={() => setPhase('welcome')} />;
  if (phase === 'welcome') return <WelcomeScreen now={now} onEnter={() => setPhase('desktop')} />;

  return (
    <main className="desktop" onPointerDown={() => launcherOpen && setLauncherOpen(false)}>
      <header className="topbar">
        <button className="brand-button" aria-label="Open app launcher" onPointerDown={(event) => event.stopPropagation()} onClick={() => setLauncherOpen((open) => !open)}>
          <img src="/hotfire/logo-icon.png" alt="" /><span>HotFire</span>
        </button>
        <div className="workspace-label">DESKTOP 01</div>
        <button className="system-tray" onClick={() => openApp('calendar')} aria-label="Open calendar">
          <Wifi size={15} /><BatteryFull size={17} />
          <span><strong>{now?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>{now?.toLocaleDateString([], { day: '2-digit', month: 'short' })}</span>
        </button>
      </header>

      <section className="desktop-icons" aria-label="Desktop applications">
        {APPS.slice(0, 5).map((app) => <button key={app.id} onDoubleClick={() => openApp(app.id)} onClick={() => openApp(app.id)}><img src={app.icon} alt="" /><span>{app.label}</span></button>)}
      </section>

      <section className="desktop-signature" aria-hidden="true"><img src="/hotfire/logo-icon.png" alt="" /><span>HOT<b>FIRE</b></span><small>OPERATING SYSTEM</small></section>

      {launcherOpen && (
        <section className="launcher" onPointerDown={(event) => event.stopPropagation()}>
          <div className="launcher-header"><img src="/hotfire/logo-icon.png" alt="" /><div><strong>HotFire</strong><span>Ready when you are</span></div><button onClick={() => setPhase('boot')} aria-label="Restart HotFire"><CirclePower size={19} /></button></div>
          <label className="launcher-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apps" autoFocus /></label>
          <div className="launcher-grid">
            {filteredApps.map((app) => <button key={app.id} onClick={() => openApp(app.id)}><img src={app.icon} alt="" /><span>{app.label}</span></button>)}
          </div>
        </section>
      )}

      {(Object.entries(windows) as [AppId, WindowState][]).map(([id, state]) => !state.minimized && (
        <WindowFrame key={id} appId={id} state={state} onFocus={() => focusWindow(id)} onClose={() => closeWindow(id)} onMinimize={() => updateWindow(id, { minimized: true })} onMaximize={() => updateWindow(id, { maximized: !state.maximized })} onMove={(x, y) => updateWindow(id, { x, y })}>
          <AppContent id={id} files={files} addFile={addFile} openApp={openApp} />
        </WindowFrame>
      ))}

      <nav className="dock" aria-label="HotFire dock" onPointerDown={(event) => event.stopPropagation()}>
        <button className={`hotfire-launcher ${launcherOpen ? 'active' : ''}`} onClick={() => setLauncherOpen((open) => !open)} aria-label="App launcher"><img src="/hotfire/logo-icon.png" alt="" /></button>
        <i />
        {APPS.map((app) => {
          const state = windows[app.id];
          return <button key={app.id} className={state ? 'running' : ''} onClick={() => state && !state.minimized ? updateWindow(app.id, { minimized: true }) : openApp(app.id)} aria-label={app.label}><img src={app.icon} alt="" /><span>{app.label}</span></button>;
        })}
      </nav>
    </main>
  );
}

function BootScreen({ onSkip }: { onSkip: () => void }) {
  return <main className="boot-screen"><div className="boot-glow" /><img src="/hotfire/logo-icon.png" alt="HotFire" className="boot-mark" /><div className="boot-wordmark">HOT<span>FIRE</span></div><p>Igniting your workspace</p><div className="boot-loader"><i /></div><button onClick={onSkip}>Skip startup</button></main>;
}

function WelcomeScreen({ now, onEnter }: { now: Date | null; onEnter: () => void }) {
  return <main className="welcome-screen"><div className="welcome-aurora" /><img src="/hotfire/logo-icon.png" alt="HotFire" /><p>{now?.getHours() && now.getHours() < 12 ? 'GOOD MORNING' : now?.getHours() && now.getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}</p><h1>Welcome to HotFire</h1><span>{now?.toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long' })}</span><button onClick={onEnter}>Enter desktop <ArrowRight size={17} /></button></main>;
}

function WindowFrame({ appId, state, onFocus, onClose, onMinimize, onMaximize, onMove, children }: { appId: AppId; state: WindowState; onFocus: () => void; onClose: () => void; onMinimize: () => void; onMaximize: () => void; onMove: (x: number, y: number) => void; children: React.ReactNode }) {
  const drag = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const app = getApp(appId);
  return (
    <section className={`app-window ${state.maximized ? 'maximized' : ''}`} style={state.maximized ? { zIndex: state.z } : { left: state.x, top: state.y, width: state.width, height: state.height, zIndex: state.z }} onPointerDown={onFocus}>
      <div className="window-titlebar" onDoubleClick={onMaximize} onPointerDown={(event) => { if (state.maximized) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { startX: event.clientX, startY: event.clientY, x: state.x, y: state.y }; }} onPointerMove={(event) => { if (!drag.current) return; onMove(Math.max(0, drag.current.x + event.clientX - drag.current.startX), Math.max(44, drag.current.y + event.clientY - drag.current.startY)); }} onPointerUp={() => { drag.current = null; }}>
        <div className="window-name"><img src={app.icon} alt="" /><span>{app.label}</span></div>
        <div className="window-actions"><button onClick={onMinimize} aria-label="Minimize"><Minus size={15} /></button><button onClick={onMaximize} aria-label="Maximize"><Maximize2 size={13} /></button><button className="close" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      </div>
      <div className="window-content">{children}</div>
    </section>
  );
}

function AppContent({ id, files, addFile, openApp }: { id: AppId; files: VirtualFile[]; addFile: (name: string) => VirtualFile | null; openApp: (id: AppId) => void }) {
  if (id === 'calculator') return <CalculatorApp />;
  if (id === 'calendar') return <CalendarApp />;
  if (id === 'music') return <LocalMediaApp mode="audio" />;
  if (id === 'media') return <LocalMediaApp mode="video" />;
  if (id === 'browser') return <BrowserApp />;
  if (id === 'terminal') return <TerminalApp openApp={openApp} files={files} />;
  return <FilesApp files={files} addFile={addFile} />;
}

function CalculatorApp() {
  const [display, setDisplay] = useState('0');
  const press = (key: string) => {
    if (key === 'C') return setDisplay('0');
    if (key === '⌫') return setDisplay((value) => value.length > 1 ? value.slice(0, -1) : '0');
    if (key === '=') {
      try { const safe = display.replace(/×/g, '*').replace(/÷/g, '/'); if (/^[0-9+\-*/.() ]+$/.test(safe)) setDisplay(String(Function(`"use strict"; return (${safe})`)())); } catch { setDisplay('Error'); }
      return;
    }
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

function LocalMediaApp({ mode }: { mode: 'audio' | 'video' }) {
  const [source, setSource] = useState('');
  const [name, setName] = useState('');
  const choose = (file?: File) => { if (!file) return; if (source) URL.revokeObjectURL(source); setSource(URL.createObjectURL(file)); setName(file.name); };
  return <div className={`local-media ${mode}`}><div className="media-stage">{source ? mode === 'audio' ? <><img src="/hotfire/logo-icon.png" alt="" className="album-art" /><div className="sound-bars">{[1,2,3,4,5,6,7,8,9].map((bar) => <i key={bar} />)}</div></> : <video src={source} controls autoPlay /> : <div className="empty-media">{mode === 'audio' ? <Music2 /> : <MonitorPlay />}<h2>{mode === 'audio' ? 'Your sound. Your space.' : 'Your screen. Your story.'}</h2><p>Choose a file from this device. It stays in your browser.</p></div>}</div><footer><div><small>NOW PLAYING</small><strong>{name || (mode === 'audio' ? 'No track selected' : 'No video selected')}</strong></div>{source && mode === 'audio' && <audio src={source} controls autoPlay />}<label><Plus size={17} /> Choose {mode === 'audio' ? 'audio' : 'video'}<input type="file" accept={mode === 'audio' ? 'audio/*' : 'video/*'} onChange={(event) => choose(event.target.files?.[0])} /></label></footer></div>;
}

function BrowserApp() {
  const [address, setAddress] = useState('');
  const [src, setSrc] = useState('');
  const navigate = () => { const value = address.trim(); if (!value) return; setSrc(/^https?:\/\//i.test(value) ? value : `https://www.google.com/search?igu=1&q=${encodeURIComponent(value)}`); };
  return <div className="browser-app"><form onSubmit={(event) => { event.preventDefault(); navigate(); }}><button type="button" onClick={() => setSrc('')} aria-label="Back"><ArrowLeft size={17} /></button><button type="button" aria-label="Forward"><ArrowRight size={17} /></button><label><Search size={16} /><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Search or enter an address" /></label><button className="go" type="submit">Go</button></form>{src ? <div className="browser-frame"><iframe src={src} title="Flare browser page" sandbox="allow-forms allow-scripts allow-same-origin" /><button onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}>Open in a new tab</button></div> : <div className="flare-home"><img src="/hotfire/logo-icon.png" alt="" /><h2>Flare</h2><p>Where do you want to go?</p><div><button onClick={() => { setAddress('wikipedia.org'); setSrc('https://www.wikipedia.org/'); }}>Wikipedia</button><button onClick={() => { setAddress('example.com'); setSrc('https://example.com/'); }}>Example</button><button onClick={() => { setAddress('openai.com'); setSrc('https://openai.com/'); }}>OpenAI</button></div><small>Some websites do not permit embedded browsing. Use “Open in a new tab” when needed.</small></div>}</div>;
}

function TerminalApp({ openApp, files }: { openApp: (id: AppId) => void; files: VirtualFile[] }) {
  const [lines, setLines] = useState(['HotFire Terminal 1.0', 'Type “help” to see available commands.', '']);
  const [input, setInput] = useState('');
  const run = () => {
    const command = input.trim(); if (!command) return;
    const [verb, ...args] = command.split(/\s+/); let output = '';
    if (verb === 'help') output = 'help  date  clear  ls  whoami  echo [text]  open [app]';
    else if (verb === 'date') output = new Date().toString();
    else if (verb === 'whoami') output = 'hotfire-user';
    else if (verb === 'ls') output = files.map((file) => file.name).join('   ');
    else if (verb === 'echo') output = args.join(' ');
    else if (verb === 'open' && APPS.some((app) => app.id === args[0])) { openApp(args[0] as AppId); output = `Opening ${args[0]}…`; }
    else if (verb === 'clear') { setLines([]); setInput(''); return; }
    else output = `Command not found: ${verb}. Try “help”.`;
    setLines((current) => [...current, `hotfire@desktop:~$ ${command}`, output, '']); setInput('');
  };
  return <div className="terminal-app" onClick={(event) => (event.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}><div className="terminal-lines">{lines.map((line, index) => <div key={index}>{line || '\u00a0'}</div>)}</div><label><span>hotfire@desktop:~$</span><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && run()} autoFocus aria-label="Terminal command" /></label></div>;
}

function FilesApp({ files, addFile }: { files: VirtualFile[]; addFile: (name: string) => VirtualFile | null }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const create = () => { try { const result = addFile(name); if (result) { setMessage(`${result.name} created`); setName(''); } } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create file'); } };
  const iconFor = (type: VirtualFile['type']) => type === 'folder' ? <Folder /> : type === 'image' ? <Image /> : type === 'audio' ? <Music2 /> : type === 'video' ? <Video /> : <FileText />;
  return <div className="files-app"><aside><strong>PLACES</strong><button className="selected"><HomeIcon /> Home</button><button><FolderOpen /> Documents</button><button><Image /> Pictures</button><button><Music2 /> Music</button><button><Video /> Videos</button><strong>STORAGE</strong><button><HardDrive /> HotFire Drive</button><div className="storage-bar"><i /></div><small>12.4 GB of 32 GB used</small></aside><section><header><div><button><ArrowLeft /></button><button><ArrowRight /></button><span><HomeIcon /> / Home</span></div><label><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && create()} placeholder="New text file" /><button onClick={create}><Plus /> Create</button></label></header>{message && <output>{message}</output>}<div className="file-grid">{files.map((file) => <button key={file.id}>{iconFor(file.type)}<span>{file.name}</span><small>{file.meta}</small></button>)}</div></section></div>;
}
