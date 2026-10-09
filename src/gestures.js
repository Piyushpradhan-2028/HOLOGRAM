// Turns hand landmarks into hologram control. Debounced, hysteresis-based and frame-rate independent.
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function pose(lm) {
  const w = lm[0], size = d2(lm[0], lm[9]) + 1e-6;
  const ext = (t, p) => d2(lm[t], w) > d2(lm[p], w) * 1.12;
  return { size, idx: ext(8, 6), mid: ext(12, 10), ring: ext(16, 14), pnk: ext(20, 18), pinch: d2(lm[4], lm[8]) / size };
}

export class Gestures {
  constructor(onNext) {
    this.mode = 'IDLE'; this.cand = 'IDLE'; this.candN = 0; this.onNext = onNext;
    this.zoomD = null; this.tip = null; this.lastT = 0; this.peaceT = 0; this.cool = 0; this.pinching = false;
  }

  // hands: landmark arrays (or null when no new frame). returns current mode
  update(hands, dt, S, area, W, H) {
    this.cool = Math.max(0, this.cool - dt);
    if (hands) {
      const now = performance.now(), hdt = clamp((now - this.lastT) / 1000, 0.01, 0.2); this.lastT = now;
      let raw = 'IDLE';
      if (hands.length >= 2) raw = 'ZOOM';
      else if (hands.length === 1) {
        const p = pose(hands[0]);
        const enter = this.pinching ? 0.5 : 0.3; this.pinching = p.pinch < enter;
        if (this.pinching) raw = 'MOVE';
        else if (p.idx && p.mid && !p.ring && !p.pnk) raw = 'NEXT';
        else if (p.idx && !p.mid && !p.ring && !p.pnk) raw = 'ROTATE';
        else if (p.idx && p.mid && p.ring && p.pnk) raw = 'EXPLODE';
        else if (!p.idx && !p.mid && !p.ring && !p.pnk) raw = 'ASSEMBLE';
      } else this.pinching = false;
      if (raw === this.cand) this.candN++; else { this.cand = raw; this.candN = 1; }
      if (this.candN >= (raw === 'IDLE' ? 6 : 3) && raw !== this.mode) { this.mode = raw; this.zoomD = null; this.tip = null; this.peaceT = 0; }

      if (this.mode === 'ZOOM' && hands.length >= 2) {
        const d = d2(hands[0][9], hands[1][9]);
        if (this.zoomD) S.scale = clamp(S.scale * (1 + (d / this.zoomD - 1) * 1.15), 0.4, 3.2);
        this.zoomD = this.zoomD ? this.zoomD * 0.5 + d * 0.5 : d;
      } else if (this.mode === 'MOVE' && hands.length === 1) {
        const lm = hands[0], tx = (1 - (lm[4].x + lm[8].x) / 2) * W - area.cx, ty = ((lm[4].y + lm[8].y) / 2) * H - area.cy;
        const k = 1 - Math.exp(-16 * hdt);
        S.ox = clamp(S.ox + (tx - S.ox) * k, -area.w * 0.45, area.w * 0.45); S.oy = clamp(S.oy + (ty - S.oy) * k, -H * 0.4, H * 0.4);
      } else if (this.mode === 'ROTATE' && hands.length === 1) {
        const t = [1 - hands[0][8].x, hands[0][8].y];
        if (this.tip) {
          const dx = (t[0] - this.tip[0]) * 7, dy = (t[1] - this.tip[1]) * 5;
          S.yaw += dx; S.pitch = clamp(S.pitch + dy, -1.4, 1.4);
          S.yawVel = S.yawVel * 0.5 + (dx / hdt) * 0.5;
        }
        this.tip = t;
      } else if (this.mode === 'NEXT') {
        this.peaceT += hdt;
        if (this.peaceT > 0.55 && this.cool === 0) { this.cool = 1.6; this.peaceT = 0; this.onNext(); }
      }
    }
    if (this.mode === 'EXPLODE') S.explode = Math.min(1, S.explode + 0.9 * dt);
    if (this.mode === 'ASSEMBLE') S.explode = Math.max(0, S.explode - 1.3 * dt);
    return this.mode;
  }
}
