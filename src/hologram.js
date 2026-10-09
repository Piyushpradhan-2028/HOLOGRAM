// GPU hologram renderer: every model is a cloud of dots drawn as additive glowing points.
import * as THREE from 'three';
import { getModel } from './catalog.js';

const VERT = /* glsl */ `
attribute float aB;
attribute float aR;
uniform float uTime, uSize, uPx, uBuild, uScan, uDist, uOpacity;
varying float vA;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  // materialise: dots fly in from scattered positions, staggered per dot
  float t = clamp(uBuild * 1.7 - aR * 0.7, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 dir = normalize(vec3(h(position + 1.0), h(position + 2.0), h(position + 3.0)) - 0.5);
  vec3 p = position + dir * (1.0 - t) * 2.4;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  float depth = clamp((-mv.z - uDist) / 4.0 * 0.5 + 0.5, 0.0, 1.0);
  float band = exp(-pow((wp.y - uScan) * 1.5, 2.0));
  float tw = 0.9 + 0.1 * sin(uTime * 2.6 + aR * 60.0);
  gl_PointSize = clamp(uSize * (0.85 + 0.3 * clamp(aB - 1.0, 0.0, 1.0)) * uPx / -mv.z, 1.3, 18.0);
  vA = uOpacity * aB * tw * (1.0 - 0.4 * depth) * (0.8 + 1.0 * band) * t;
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uBright;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  a = a * a * (1.0 + 0.7 * a);
  vec3 col = mix(uColor, vec3(1.0), a * a * 0.45);
  gl_FragColor = vec4(col * uBright, a * vA);
}`;

export const THEMES = {
  natural: null,
  cyan: [0.25, 0.89, 1.0],
  green: [0.35, 1.0, 0.55],
  amber: [1.0, 0.72, 0.25],
  magenta: [1.0, 0.4, 0.9],
};

const NS = 'http://www.w3.org/2000/svg';
const FOV = 38;
const TAN = Math.tan((FOV * Math.PI) / 360);
const tmpV = new THREE.Vector3();

function ringDots(r, per) {
  const n = Math.max(24, Math.round((2 * Math.PI * r) / per)), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const t = (i / n) * 2 * Math.PI; a[i * 3] = r * Math.cos(t); a[i * 3 + 2] = r * Math.sin(t); }
  return a;
}

export class Hologram {
  constructor(canvas, labelsEl) {
    this.canvas = canvas; this.labelsEl = labelsEl;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    // if the browser drops the GL context, allow it to be restored instead of leaving a black canvas
    canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.resize(this.W, this.H, this.panelW); });
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
    this.root = new THREE.Group(); this.pitchG = new THREE.Group(); this.yawG = new THREE.Group(); this.floorG = new THREE.Group();
    this.scene.add(this.root); this.root.add(this.pitchG); this.pitchG.add(this.yawG); this.pitchG.add(this.floorG);
    this.shared = { uTime: { value: 0 }, uPx: { value: 300 }, uSize: { value: 0.03 }, uBright: { value: 1 }, uScan: { value: 0 }, uDist: { value: 11 }, uBuild: { value: 0 } };
    this.parts = []; this.labels = []; this.model = null; this.modelIndex = -1;
    this.W = 1; this.H = 1; this.panelW = 0; this.dprMax = Math.min(window.devicePixelRatio || 1, 2); this.dpr = Math.min(this.dprMax, 1.5);
    this.dist = 11; this.buildT = 0; this.fps = 60; this._fpsAcc = 0; this._fpsN = 0; this._lastAdapt = 0; this.ex = 0; this.sc = 1; this.time = 0;
    this._makeFloor();
    this.area = { cx: 0, cy: 0, w: 1, h: 1 };
  }

  makeMat(color, opacity = 1) {
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { ...this.shared, uColor: { value: new THREE.Color(color[0], color[1], color[2]) }, uOpacity: { value: opacity } },
    });
  }

  _makeFloor() {
    const mk = (arr, op, build = 1) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      g.setAttribute('aB', new THREE.BufferAttribute(new Float32Array(arr.length / 3).fill(1.1), 1));
      g.setAttribute('aR', new THREE.BufferAttribute(new Float32Array(arr.length / 3).map(() => 0.0), 1));
      const m = this.makeMat([0.25, 0.89, 1.0], op); m.uniforms.uBuild = { value: build };
      const o = new THREE.Points(g, m); o.frustumCulled = false; this.floorG.add(o); return o;
    };
    this.rings = [mk(ringDots(1.7, 0.07), 0.5), mk(ringDots(2.6, 0.06), 0.8), mk(ringDots(3.5, 0.06), 0.45)];
    const ticks = []; for (let i = 0; i < 72; i++) { const t = (i / 72) * 6.2832, r0 = 3.65, len = i % 6 === 0 ? 0.32 : 0.14; for (let k = 0; k < 4; k++) { const r = r0 + (len * k) / 3; ticks.push(r * Math.cos(t), 0, r * Math.sin(t)); } }
    this.ticks = mk(new Float32Array(ticks), 0.55);
    this.pulse = mk(ringDots(1, 0.03), 0.7);
  }

  resize(W, H, panelW) {
    this.W = W; this.H = H; this.panelW = panelW; this.rem = 0;
    this.renderer.setPixelRatio(this.dpr); this.renderer.setSize(W, H, false);
    const aw = Math.max(200, W - panelW), aspectA = aw / H;
    this.dist = Math.max(6.4 / (2 * TAN), 7.4 / (2 * TAN * aspectA));
    this.camera.aspect = W / H;
    this.camera.setViewOffset(W, H, panelW / 2, 0, W, H);
    this.camera.position.set(0, 0, this.dist); this.camera.lookAt(0, 0, 0); this.camera.updateProjectionMatrix();
    this.area = { cx: aw / 2, cy: H / 2, w: aw, h: H };
  }

  screenToWorld(px, py) {
    const v = tmpV.set((px / this.W) * 2 - 1, -((py / this.H) * 2 - 1), 0.5).unproject(this.camera);
    const dir = v.sub(this.camera.position).normalize(), t = -this.camera.position.z / dir.z;
    return new THREE.Vector3().copy(this.camera.position).addScaledVector(dir, t);
  }

  setModel(i, theme) {
    if (i === this.modelIndex) return;
    this.modelIndex = i;
    for (const q of this.parts) { this.yawG.remove(q.obj); q.obj.geometry.dispose(); q.mat.dispose(); }
    this.parts = [];
    const m = getModel(i); this.model = m;
    for (const p of m.parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
      g.setAttribute('aB', new THREE.BufferAttribute(p.b, 1));
      g.setAttribute('aR', new THREE.BufferAttribute(p.r, 1));
      const mat = this.makeMat(p.col); const obj = new THREE.Points(g, mat);
      obj.frustumCulled = false; obj.position.set(p.center[0], p.center[1], p.center[2]);
      this.yawG.add(obj); this.parts.push({ p, obj, mat });
    }
    this.floorG.position.y = m.floor - 0.3;
    this.buildT = 0; this.applyTheme(theme); this._buildLabels();
  }

  applyTheme(theme) {
    const t = THEMES[theme] || null;
    for (const q of this.parts) {
      const c = q.p.col;
      if (t) q.mat.uniforms.uColor.value.setRGB(t[0] * 0.55 + c[0] * 0.2, t[1] * 0.55 + c[1] * 0.2, t[2] * 0.55 + c[2] * 0.2);
      else q.mat.uniforms.uColor.value.setRGB(c[0], c[1], c[2]);
    }
    const f = t || [0.25, 0.89, 1.0];
    for (const o of [...this.rings, this.ticks, this.pulse]) o.material.uniforms.uColor.value.setRGB(f[0], f[1], f[2]);
  }

  _buildLabels() {
    this.labelsEl.innerHTML = ''; this.labels = [];
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'hl-lines'); this.labelsEl.appendChild(svg);
    const seen = new Set();
    const cand = this.parts.filter((q) => q.p.lab).sort((a, b) => b.p.pos.length - a.p.pos.length);
    for (const q of cand) {
      if (seen.has(q.p.name) || this.labels.length >= 14) continue;
      seen.add(q.p.name);
      const el = document.createElement('div'); el.className = 'hl-label'; el.textContent = q.p.name;
      const c = q.p.col; el.style.setProperty('--c', `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`);
      const line = document.createElementNS(NS, 'polyline'); line.setAttribute('stroke', el.style.getPropertyValue('--c')); svg.appendChild(line);
      this.labelsEl.appendChild(el); this.labels.push({ q, el, line });
    }
    this.labelsShown = false; this.labelsEl.classList.remove('on');
  }

  _updateLabels(S) {
    const show = S.labels && !S.pyramid && this.ex > 0.3;
    if (!show) { if (this.labelsShown) { this.labelsEl.classList.remove('on'); this.labelsEl.style.opacity = ''; this.labelsShown = false; } return; }
    if (!this.labelsShown) { this.labelsEl.classList.add('on'); this.labelsShown = true; }
    const { cx, w } = this.area, rem = this.rem || (this.rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16), gap = rem * 1.9;
    const left = [], right = [];
    for (const L of this.labels) {
      L.q.obj.getWorldPosition(tmpV); tmpV.project(this.camera);
      L.sx = (tmpV.x * 0.5 + 0.5) * this.W; L.sy = (-tmpV.y * 0.5 + 0.5) * this.H;
      (L.sx < cx ? left : right).push(L);
    }
    const place = (arr, side) => {
      arr.sort((a, b) => a.sy - b.sy);
      const camH = Math.min(250, Math.max(140, this.W * 0.15)) * 0.75, wide = this.W > 820;
      const top = rem * 5, bot = side < 0 && wide ? this.H - camH - rem * 6.5 : this.H - rem * 7; let y = top;
      for (const L of arr) { y = Math.max(y, L.sy - gap * 0.2); L.ly = y; y += gap; }
      const over = y - gap - bot; if (over > 0) for (const L of arr) L.ly -= over;
      let mw = 0; for (const L of arr) { if (!L.w) L.w = L.el.offsetWidth || 120; mw = Math.max(mw, L.w); }
      const x = side < 0 ? Math.max(cx - w * 0.36, mw + rem * 1.5) : Math.min(cx + w * 0.36, cx + w / 2 - mw - rem * 1.2);
      for (const L of arr) {
        L.el.style.transform = `translate(${x}px, ${L.ly}px) translate(${side < 0 ? '-100%' : '0'}, -50%)`;
        L.el.style.textAlign = side < 0 ? 'right' : 'left';
        const ex = x - side * rem * 1.2;
        L.line.setAttribute('points', `${L.sx},${L.sy} ${ex},${L.ly} ${x - side * 4},${L.ly}`);
      }
    };
    place(left, -1); place(right, 1);
    this.labelsEl.style.opacity = Math.min(1, (this.ex - 0.3) * 3);
  }

  _view(x, y, s, roll, S) {
    const r = this.renderer;
    r.setViewport(x, y, s, s); r.setScissor(x, y, s, s);
    this.camera.clearViewOffset(); this.camera.aspect = 1; this.camera.up.set(-Math.sin(roll), Math.cos(roll), 0);
    const pd = 6.8 / (2 * TAN); this.shared.uDist.value = pd;
    this.camera.position.set(0, 0, pd); this.camera.lookAt(0, 0, 0); this.camera.updateProjectionMatrix();
    this.shared.uPx.value = (s * this.dpr) / (2 * TAN);
    r.render(this.scene, this.camera);
  }

  update(dt, S) {
    this.time += dt; this.shared.uTime.value = this.time;
    this.buildT = Math.min(1, this.buildT + dt * 0.9); this.shared.uBuild.value = this.buildT;
    this.ex += (S.explode - this.ex) * (1 - Math.exp(-7 * dt));
    this.sc += (S.scale - this.sc) * (1 - Math.exp(-10 * dt));
    const flick = 0.95 + 0.05 * Math.sin(this.time * 41) * Math.sin(this.time * 6.7);
    this.shared.uBright.value = S.bright * flick;
    this.shared.uSize.value = 0.032 * S.dotSize * this.sc;
    this.shared.uDist.value = this.dist;
    const p = this.screenToWorld(this.area.cx + S.ox, this.area.cy + S.oy);
    this.root.position.set(p.x, p.y, 0); this.root.scale.setScalar(this.sc);
    this.pitchG.rotation.x = S.pitch; this.yawG.rotation.y = S.yaw;
    this.shared.uScan.value = ((this.time * 1.5) % 8) - 4 + p.y;
    for (const q of this.parts) {
      const d = q.p.dir, e = this.ex * 1.6;
      q.obj.position.set(q.p.center[0] + d[0] * e, q.p.center[1] + d[1] * e, q.p.center[2] + d[2] * e);
      if (q.p.spin) q.obj.rotation[q.p.spin.a] = q.p.spin.w * this.time * (1 - this.ex * 0.7);
      q.mat.uniforms.uOpacity.value = q.p.shell ? 1 - 0.78 * this.ex : 1;
    }
    this.floorG.visible = S.floor && !S.pyramid;
    const pr = (this.time * 0.45) % 1;
    this.pulse.scale.setScalar(1 + pr * 3.2); this.pulse.material.uniforms.uOpacity.value = 0.7 * (1 - pr);
    this.ticks.rotation.y = this.time * 0.2;
    // adaptive resolution keeps the frame rate smooth on weak GPUs
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 1) {
      this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0;
      const q = S.quality; let target = q === 'high' ? this.dprMax : q === 'low' ? 0.8 : this.dpr;
      if (q === 'auto' && this.time - this._lastAdapt > 2) {
        if (this.fps < 42 && this.dpr > 0.8) { target = Math.max(0.8, this.dpr - 0.2); this._lastAdapt = this.time; }
        else if (this.fps > 57 && this.dpr < this.dprMax) { target = Math.min(this.dprMax, this.dpr + 0.15); this._lastAdapt = this.time; }
      }
      if (Math.abs(target - this.dpr) > 0.01) { this.dpr = target; this.resize(this.W, this.H, this.panelW); }
    }
  }

  render(S) {
    if (this.lost) return;
    const r = this.renderer; r.setScissorTest(true); r.setViewport(0, 0, this.W, this.H); r.setScissor(0, 0, this.W, this.H); r.clear();
    if (!S.pyramid) {
      this.camera.up.set(0, 1, 0); this.camera.setViewOffset(this.W, this.H, this.panelW / 2, 0, this.W, this.H);
      this.camera.aspect = this.W / this.H; this.camera.position.set(0, 0, this.dist); this.camera.lookAt(0, 0, 0); this.camera.updateProjectionMatrix();
      this.shared.uPx.value = (this.H * this.dpr) / (2 * TAN);
      r.render(this.scene, this.camera);
    } else {
      const { cx, w, h } = this.area, s = Math.floor(Math.min(w, h) * 0.37), gap = s * 0.92, cy = this.H / 2;
      const at = (vx, vy, roll) => this._view(Math.round(vx - s / 2), Math.round(this.H - vy - s / 2), s, roll, S);
      at(cx, cy - gap, 0); at(cx, cy + gap, Math.PI); at(cx - gap, cy, -Math.PI / 2); at(cx + gap, cy, Math.PI / 2);
      this.camera.up.set(0, 1, 0); this.shared.uDist.value = this.dist;
    }
    r.setScissorTest(false);
    this._updateLabels(S);
  }

  dispose() {
    for (const q of this.parts) { q.obj.geometry.dispose(); q.mat.dispose(); }
    this.renderer.dispose();
  }
}
