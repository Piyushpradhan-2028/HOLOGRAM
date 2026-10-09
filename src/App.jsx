import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hologram } from './hologram.js';
import { Gestures } from './gestures.js';
import { MODELS, CATS, getModel } from './catalog.js';

const DEFAULTS = { scale: 1, explode: 0, dotSize: 1, bright: 1, spin: 1, pyramid: false, labels: true, floor: true, auto: true, theme: 'natural', quality: 'auto' };
const THEME_NAMES = [['natural', 'Natural'], ['cyan', 'Cyan'], ['green', 'Green'], ['amber', 'Amber'], ['magenta', 'Magenta']];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function Slider({ label, value, min, max, step, onChange, fmt }) {
  return (
    <label className="row slider">
      <span>{label}</span><b>{fmt(value)}</b>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}
function Toggle({ label, on, onChange }) {
  return (
    <button type="button" className="row toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span><i className={on ? 'sw on' : 'sw'} />
    </button>
  );
}

export default function App() {
  const canvasRef = useRef(null), labelsRef = useRef(null), videoRef = useRef(null), pipRef = useRef(null), searchRef = useRef(null), listRef = useRef(null);
  const eng = useRef(null), tracker = useRef(null), gest = useRef(null), order = useRef([]), panelRef = useRef(0), dragging = useRef(false), conn = useRef(null);
  const S = useRef({ ...DEFAULTS, model: 0, yaw: 0.6, pitch: 0.22, yawVel: 0, ox: 0, oy: 0 });
  const [cfg, setCfg] = useState(DEFAULTS);
  const [hud, setHud] = useState({ mode: 'IDLE', idx: 0, fps: 60, scale: 1, explode: 0 });
  const [q, setQ] = useState(''), [cat, setCat] = useState('All'), [hi, setHi] = useState(0);
  const [panel, setPanel] = useState(() => window.innerWidth > 820);
  const [help, setHelp] = useState(() => window.innerWidth > 1500);
  const [track, setTrack] = useState({ on: true, state: 'idle', msg: '' });
  const [dots, setDots] = useState(0);

  const set = useCallback((patch) => { Object.assign(S.current, patch); setCfg((c) => ({ ...c, ...patch })); if (patch.theme && eng.current) eng.current.applyTheme(patch.theme); }, []);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return MODELS.map((m, i) => ({ m, i })).filter(({ m }) => (cat === 'All' || m.cat === cat) && words.every((w) => `${m.name} ${m.tags}`.toLowerCase().includes(w)));
  }, [q, cat]);
  order.current = results.map((r) => r.i);
  useEffect(() => { setHi(0); }, [q, cat]);

  const pick = useCallback((i) => {
    const s = S.current; s.model = i; s.explode = 0; setCfg((c) => ({ ...c, explode: 0 }));
    if (eng.current) { eng.current.setModel(i, s.theme); setDots(eng.current.model.count); }
    setHud((h) => ({ ...h, idx: i }));
  }, []);
  const step = useCallback((dir) => {
    const list = order.current.length ? order.current : MODELS.map((_, i) => i), pos = list.indexOf(S.current.model);
    pick(list[(pos + dir + list.length * 2) % list.length]);
  }, [pick]);
  const reset = useCallback(() => { Object.assign(S.current, { ox: 0, oy: 0, scale: 1, yaw: 0.6, pitch: 0.22, yawVel: 0, explode: 0 }); setCfg((c) => ({ ...c, scale: 1, explode: 0 })); }, []);

  // ---------- engine + main loop ----------
  useEffect(() => {
    const e = new Hologram(canvasRef.current, labelsRef.current); eng.current = e;
    const onResize = () => e.resize(window.innerWidth, window.innerHeight, panelRef.current);
    onResize(); e.setModel(S.current.model, S.current.theme); setDots(e.model.count);
    window.addEventListener('resize', onResize);
    const g = new Gestures(() => step(1)); gest.current = g;
    let raf, last = performance.now(), lastDet = 0, lastHud = 0, hands = null;
    const pip = pipRef.current.getContext('2d');
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.max(0.001, Math.min(0.05, (now - last) / 1000)); last = now;
      const s = S.current, tr = tracker.current;
      let fresh = null;
      if (tr && tr.ready && now - lastDet > 30) { lastDet = now; try { fresh = tr.detect(videoRef.current, now); } catch { fresh = null; } }
      const mode = g.update(fresh, dt, s, e.area, e.W, e.H);
      if (fresh) { hands = fresh; drawPip(pip, fresh); }
      // inertia + auto rotate
      const idle = mode === 'IDLE' || mode === 'EXPLODE' || mode === 'ASSEMBLE';
      if (mode !== 'ROTATE' && !dragging.current) { s.yaw += s.yawVel * dt; s.yawVel *= Math.exp(-2.6 * dt); if (Math.abs(s.yawVel) < 0.01) s.yawVel = 0; }
      if (idle && s.auto && !s.pyramid && !dragging.current && !s.yawVel) s.yaw += 0.35 * s.spin * dt;
      if (s.pyramid && idle && s.auto && !dragging.current) s.yaw += 0.35 * s.spin * dt;
      try { e.update(dt, s); e.render(s); } catch (err) { console.error(err); }
      if (now - lastHud > 250) {
        lastHud = now;
        setHud({ mode: dragging.current ? 'DRAG' : mode, idx: s.model, fps: Math.round(e.fps), scale: s.scale, explode: s.explode });
      }
    };
    raf = requestAnimationFrame(loop);
    // warm the model cache while the browser is idle so switching is instant
    let cancel = false, wi = 0; const ric = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 40));
    const warm = (dl) => { if (cancel) return; if (dl.timeRemaining() > 6 && wi < MODELS.length) getModel(wi++); if (wi < MODELS.length) ric(warm); };
    ric(warm);
    return () => { cancel = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); e.dispose(); eng.current = null; };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const w = panel && window.innerWidth > 820 ? Math.round(Math.min(380, Math.max(270, window.innerWidth * 0.23)) + 24) : 0;
    panelRef.current = w; if (eng.current) eng.current.resize(window.innerWidth, window.innerHeight, w);
  }, [panel]);

  function drawPip(ctx, hs) {
    const w = ctx.canvas.width, h = ctx.canvas.height; ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#3fe3ff'; ctx.fillStyle = '#ff5fc8'; ctx.lineWidth = 2;
    for (const lm of hs) {
      for (const c of conn.current || []) { ctx.beginPath(); ctx.moveTo((1 - lm[c.start].x) * w, lm[c.start].y * h); ctx.lineTo((1 - lm[c.end].x) * w, lm[c.end].y * h); ctx.stroke(); }
      for (const p of lm) ctx.fillRect((1 - p.x) * w - 2, p.y * h - 2, 4, 4);
    }
  }

  // ---------- camera / hand tracking ----------
  const startTracking = useCallback(async () => {
    setTrack({ on: true, state: 'loading', msg: 'Loading hand tracker...' });
    try {
      const mod = await import('./hands.js'); const { HandTracker } = mod; conn.current = mod.CONNECTIONS;
      if (!tracker.current) tracker.current = new HandTracker();
      await tracker.current.start(videoRef.current);
      setTrack({ on: true, state: 'ready', msg: '' });
    } catch (err) {
      const m = String((err && (err.name && err.name !== 'Error' ? err.name + ' ' : '') + (err && err.message || '')) || '');
      const msg = /NotAllowed|Permission|denied/i.test(m) ? 'The camera permission was blocked. Allow the camera in the address bar, then try again'
        : /NotFound|Devices not found|Requested device/i.test(m) ? 'No camera was found'
        : /fetch|network|load|wasm|Failed|tunnel/i.test(m) ? 'The hand model could not be downloaded. Check your internet connection'
        : (m || 'The hand tracker could not start');
      setTrack({ on: true, state: 'error', msg });
    }
  }, []);
  const stopTracking = useCallback(() => { if (tracker.current) tracker.current.stop(videoRef.current); const c = pipRef.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setTrack({ on: false, state: 'idle', msg: '' }); if (gest.current) gest.current.mode = 'IDLE'; }, []);
  useEffect(() => { startTracking(); return () => { if (tracker.current) tracker.current.stop(videoRef.current); }; }, [startTracking]);

  // ---------- mouse / touch fallback ----------
  useEffect(() => {
    const c = canvasRef.current, ptr = new Map(); let pd = 0;
    const down = (e) => { c.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); dragging.current = true; S.current.yawVel = 0; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pd = Math.hypot(a.x - b.x, a.y - b.y); } };
    const move = (e) => {
      const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y, s = S.current;
      if (ptr.size === 2) { p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pd) s.scale = clamp(s.scale * (d / pd), 0.4, 3.2); pd = d; return; }
      if (p.b === 2 || p.shift) { s.ox += dx; s.oy += dy; } else { s.yaw += dx * 0.008; s.pitch = clamp(s.pitch + dy * 0.006, -1.4, 1.4); s.yawVel = dx * 0.008 * 60 * 0.5; }
      p.x = e.clientX; p.y = e.clientY;
    };
    const up = (e) => { ptr.delete(e.pointerId); pd = 0; if (!ptr.size) dragging.current = false; };
    const wheel = (e) => { e.preventDefault(); S.current.scale = clamp(S.current.scale * Math.exp(-e.deltaY * 0.0014), 0.4, 3.2); };
    const dbl = () => reset();
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', wheel, { passive: false }); c.addEventListener('dblclick', dbl); c.addEventListener('contextmenu', (e) => e.preventDefault());
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); c.removeEventListener('wheel', wheel); c.removeEventListener('dblclick', dbl); };
  }, [reset]);

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target && e.target.tagName === 'INPUT' && e.target.type === 'text';
      if (e.key === '/' && !typing) { e.preventDefault(); setPanel(true); setTimeout(() => searchRef.current && searchRef.current.focus(), 30); return; }
      if (typing) return;
      if (e.key === 'ArrowRight' || e.key === 'm') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'h') set({ pyramid: !S.current.pyramid });
      else if (e.key === 'r') reset();
      else if (e.key === 'e') set({ explode: S.current.explode > 0.5 ? 0 : 1 });
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [step, set, reset]);

  const cur = MODELS[hud.idx];
  const counts = useMemo(() => Object.fromEntries(CATS.map((c) => [c, c === 'All' ? MODELS.length : MODELS.filter((m) => m.cat === c).length])), []);
  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(results.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' && results[hi]) pick(results[hi].i);
    else if (e.key === 'Escape') { setQ(''); e.target.blur(); }
  };
  useEffect(() => { const el = listRef.current && listRef.current.querySelector('[data-hi="1"]'); if (el) el.scrollIntoView({ block: 'nearest' }); }, [hi, results]);

  const modeLabel = { IDLE: 'Idle', MOVE: 'Move', ROTATE: 'Rotate', ZOOM: 'Zoom', EXPLODE: 'Explode', ASSEMBLE: 'Assemble', NEXT: 'Next model', DRAG: 'Mouse' }[hud.mode] || hud.mode;

  return (
    <div className="app">
      <div className="stage" />
      <canvas ref={canvasRef} className="gl" />
      <div ref={labelsRef} className="hl-labels" />
      <div className="fx" />

      <header className="top">
        <div className="brand"><span className="logo" />Hologram</div>
        <div className="pill mode"><i className={'dot ' + (hud.mode !== 'IDLE' ? 'live' : '')} />{modeLabel}</div>
        <div className="pill dim">{hud.fps} fps</div>
        <div className={'pill ' + (track.state === 'ready' ? 'ok' : track.state === 'error' ? 'warn' : 'dim')}>
          {track.state === 'ready' ? 'Hands on' : track.state === 'loading' ? 'Loading hands' : track.on ? 'Mouse mode' : 'Hands off'}
        </div>
      </header>

      {track.state === 'error' && (
        <div className="notice" role="status">
          <b>Hand tracking is off.</b> {track.msg}. Mouse controls still work: drag to rotate, wheel to zoom, shift-drag to move.
          <button className="link" onClick={startTracking}>Try again</button>
        </div>
      )}

      <div className="title" style={{ right: panel ? 'var(--panel-w)' : 0 }}>
        <div className="name">{cur.name}</div>
        <div className="meta">{cur.cat} &middot; {hud.idx + 1} of {MODELS.length} &middot; {dots.toLocaleString()} dots</div>
      </div>

      <div className="cam">
        <video ref={videoRef} muted playsInline />
        <canvas ref={pipRef} width={320} height={240} />
        {track.state !== 'ready' && <div className="cam-msg">{track.state === 'loading' ? 'Starting camera...' : 'Camera off'}</div>}
      </div>

      <div className={'help' + (help ? '' : ' closed')}>
        <button className="help-h" onClick={() => setHelp(!help)} aria-expanded={help}>Gestures {help ? '–' : '+'}</button>
        {help && (
          <ul>
            <li><b>Pinch</b> thumb and index to move</li>
            <li><b>Two hands</b> apart or together to zoom</li>
            <li><b>Index finger</b> only to rotate</li>
            <li><b>Open palm</b> to explode</li>
            <li><b>Fist</b> to assemble</li>
            <li><b>Two fingers</b> held to switch model</li>
          </ul>
        )}
      </div>

      {!panel && <button className="open-panel" onClick={() => setPanel(true)}>Menu</button>}
      <aside className={'panel' + (panel ? '' : ' hidden')} aria-label="Controls">
        <div className="p-head"><span>Controls</span><button className="x" onClick={() => setPanel(false)} aria-label="Hide panel">&times;</button></div>

        <div className="search">
          <input ref={searchRef} type="text" value={q} placeholder={`Search ${MODELS.length} models`} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} aria-label="Search models" />
          {q && <button className="x" onClick={() => setQ('')} aria-label="Clear search">&times;</button>}
        </div>
        <div className="chips" role="tablist">
          {CATS.map((c) => <button key={c} role="tab" aria-selected={cat === c} className={cat === c ? 'chip on' : 'chip'} onClick={() => setCat(c)}>{c}<em>{counts[c]}</em></button>)}
        </div>

        <div className="list" ref={listRef} role="listbox">
          {results.length === 0 && <div className="empty">No model matches &ldquo;{q}&rdquo;. Try a type like sedan, sniper or tank.</div>}
          {results.map(({ m, i }, k) => (
            <button key={m.name} role="option" aria-selected={i === hud.idx} data-hi={k === hi ? 1 : 0} className={'item' + (i === hud.idx ? ' cur' : '') + (k === hi && q ? ' hi' : '')} onClick={() => pick(i)}>
              <span>{m.name}</span><em>{m.cat}</em>
            </button>
          ))}
        </div>

        <div className="settings">
          <h3>Settings</h3>
          <Slider label="Zoom" value={cfg.scale} min={0.4} max={3.2} step={0.05} fmt={(v) => v.toFixed(2) + 'x'} onChange={(v) => set({ scale: v })} />
          <Slider label="Explode" value={cfg.explode} min={0} max={1} step={0.01} fmt={(v) => Math.round(v * 100) + '%'} onChange={(v) => set({ explode: v })} />
          <Slider label="Dot size" value={cfg.dotSize} min={0.5} max={2} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => set({ dotSize: v })} />
          <Slider label="Brightness" value={cfg.bright} min={0.4} max={2} step={0.05} fmt={(v) => v.toFixed(2)} onChange={(v) => set({ bright: v })} />
          <Slider label="Spin speed" value={cfg.spin} min={0} max={3} step={0.1} fmt={(v) => v.toFixed(1)} onChange={(v) => set({ spin: v })} />
          <Toggle label="Pyramid view (4 sides)" on={cfg.pyramid} onChange={(v) => set({ pyramid: v })} />
          <Toggle label="Part labels" on={cfg.labels} onChange={(v) => set({ labels: v })} />
          <Toggle label="Projector floor" on={cfg.floor} onChange={(v) => set({ floor: v })} />
          <Toggle label="Auto rotate" on={cfg.auto} onChange={(v) => set({ auto: v })} />
          <Toggle label="Hand tracking" on={track.on} onChange={(v) => (v ? startTracking() : stopTracking())} />
          <div className="row sel"><span>Colour</span>
            <select value={cfg.theme} onChange={(e) => set({ theme: e.target.value })}>{THEME_NAMES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
          <div className="row sel"><span>Quality</span>
            <select value={cfg.quality} onChange={(e) => set({ quality: e.target.value })}><option value="auto">Auto</option><option value="high">High</option><option value="low">Low</option></select></div>
          <div className="btns">
            <button onClick={() => step(-1)}>Previous</button><button onClick={() => step(1)}>Next</button><button onClick={reset}>Reset view</button>
          </div>
          <p className="keys">Keys: arrows switch, H pyramid, E explode, R reset, / search</p>
        </div>
      </aside>
    </div>
  );
}
