// 80 dotted-hologram models (20 cars, 20 bikes, 20 war vehicles, 20 guns).
// Surfaces are sampled into dots (point clouds). Each category is one parametric generator, and a model is one row.
// Models are generated lazily (getModel) so start-up stays instant and switching is smooth.
const TAU = Math.PI * 2;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const C = { cyan: hex('#3fe3ff'), ice: hex('#bff4ff'), blue: hex('#3d8bff'), orange: hex('#ffa63a'), gold: hex('#ffd84a'), green: hex('#6dffa0'), pink: hex('#ff5fc8'), violet: hex('#a58bff'), red: hex('#ff5566'), white: hex('#f2fcff') };
const SPf = (L) => (0.036 * L) / 4.6;               // dot spacing so every model has similar density after scaling
const gN = (len, sp) => Math.max(1, Math.round(len / sp));
const cr = (a, b, c, d, u) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
const lerpTab = (t, f) => { for (let i = 0; i < t.length - 1; i++) if (f <= t[i + 1][0]) return t[i][1] + ((t[i + 1][1] - t[i][1]) * (f - t[i][0])) / (t[i + 1][0] - t[i][0] || 1); return t[t.length - 1][1]; };
const sg = (v) => (v < 0 ? -1 : 1);
const part = (name, col, fn, o = {}) => { const P = []; fn((x, y, z, b = 1) => P.push(x, y, z, b)); return { name, col, P, ...o }; };
const ringPt = (c, r, ax, a, o = 0) => { const u = r * Math.cos(a), v = r * Math.sin(a); return ax === 'x' ? [c[0] + o, c[1] + u, c[2] + v] : ax === 'y' ? [c[0] + u, c[1] + o, c[2] + v] : [c[0] + u, c[1] + v, c[2] + o]; };

// ---------------------------------------------------------------- primitives
function line(add, a, b, sp, br = 1.4) { const n = gN(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), sp); for (let i = 0; i <= n; i++) { const t = i / n; add(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, br); } }
function circle(add, c, r, ax, sp, br = 1.3, a0 = 0, a1 = TAU) { const n = gN(r * (a1 - a0), sp); for (let i = 0; i <= n; i++) add(...ringPt(c, r, ax, a0 + ((a1 - a0) * i) / n), br); }
function disc(add, c, r0, r1, ax, sp, br = 1, o = 0) { const nr = gN(r1 - r0, sp); for (let k = 0; k <= nr; k++) { const r = r0 + ((r1 - r0) * k) / nr, n = Math.max(1, gN(TAU * r, sp)); for (let i = 0; i < n; i++) add(...ringPt(c, r, ax, (i / n) * TAU, o), br); } }
function cylinder(add, c, r0, r1, len, ax, sp, caps = true, br = 1) {
  const nz = gN(len, sp);
  for (let k = 0; k <= nz; k++) { const r = r0 + ((r1 - r0) * k) / nz, n = Math.max(5, gN(TAU * r, sp)); for (let i = 0; i < n; i++) add(...ringPt(c, r, ax, (i / n) * TAU, -len / 2 + (len * k) / nz), br); }
  if (caps) { disc(add, c, 0, r0, ax, sp, br, -len / 2); disc(add, c, 0, r1, ax, sp, br, len / 2); }
}
function tube(add, a, b, r, sp, br = 1) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d); if (L < 1e-6) return;
  const w = d.map((v) => v / L), t = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [w[1] * t[2] - w[2] * t[1], w[2] * t[0] - w[0] * t[2], w[0] * t[1] - w[1] * t[0]]; const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]], nz = gN(L, sp), nr = Math.max(5, gN(TAU * r, sp));
  for (let k = 0; k <= nz; k++) for (let j = 0; j < nr; j++) { const an = (j / nr) * TAU, cs = Math.cos(an) * r, sn = Math.sin(an) * r, q = (L * k) / nz; add(a[0] + w[0] * q + u[0] * cs + v[0] * sn, a[1] + w[1] * q + u[1] * cs + v[1] * sn, a[2] + w[2] * q + u[2] * cs + v[2] * sn, br); }
}
function torus(add, c, R, r, ax, sp, br = 1) { const nu = gN(TAU * R, sp), nv = Math.max(6, gN(TAU * r, sp)); for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const B = (j / nv) * TAU; add(...ringPt(c, R + r * Math.cos(B), ax, (i / nu) * TAU, r * Math.sin(B)), br); } }
function ellipsoid(add, c, [a, b, d], sp, br = 1) { const N = Math.ceil((4 * Math.PI * (((a + b + d) / 3) ** 2)) / (sp * sp)); for (let i = 0; i < N; i++) { const y = 1 - (2 * (i + 0.5)) / N, rd = Math.sqrt(1 - y * y), th = i * 2.39996; add(c[0] + a * rd * Math.cos(th), c[1] + b * y, c[2] + d * rd * Math.sin(th), br); } }
function boxS(add, c, [sx, sy, sz], sp, o = {}) {
  const rz = o.rz || 0, cs = Math.cos(rz), sn = Math.sin(rz), br = o.br ?? 1;
  const ad = rz ? (x, y, z, b) => { const dx = x - c[0], dy = y - c[1]; add(c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs, z, b); } : add;
  const S = [sx, sy, sz];
  for (let a = 0; a < 3; a++) { const b = (a + 1) % 3, d = (a + 2) % 3, nb = gN(S[b], sp), nd = gN(S[d], sp); for (const sd of [-1, 1]) for (let i = 0; i <= nb; i++) for (let j = 0; j <= nd; j++) { const p = [0, 0, 0]; p[a] = c[a] + (sd * S[a]) / 2; p[b] = c[b] - S[b] / 2 + (S[b] * i) / nb; p[d] = c[d] - S[d] / 2 + (S[d] * j) / nd; ad(p[0], p[1], p[2], br); } }
  if (o.edges !== false) for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) { const p = [c[0] + (x * sx) / 2, c[1] + (y * sy) / 2, c[2] + (z * sz) / 2]; if (x > 0) line(ad, [c[0] - sx / 2, p[1], p[2]], p, sp, 1.5); if (y > 0) line(ad, [p[0], c[1] - sy / 2, p[2]], p, sp, 1.5); if (z > 0) line(ad, [p[0], p[1], c[2] - sz / 2], p, sp, 1.5); }
}
// lofted body: sections {x,y0,y1,w,n} swept along x with superellipse cross-sections
function loft(add, S, sp, o = {}) {
  S = S.map((s) => ({ n: 2.4, ...s })); const X0 = S[0].x, X1 = S[S.length - 1].x, nx = gN(X1 - X0, sp), up = o.arc === 'upper', pk = (k) => S[Math.min(S.length - 1, Math.max(0, k))];
  const get = (x) => { let i = 0; while (i < S.length - 2 && x > S[i + 1].x) i++; const u = (x - S[i].x) / (S[i + 1].x - S[i].x || 1), f = (key) => cr(pk(i - 1)[key], pk(i)[key], pk(i + 1)[key], pk(i + 2)[key], u); return { y0: f('y0'), y1: f('y1'), w: f('w'), n: Math.max(1.8, f('n')) }; };
  const ring = (x, g, k, br) => { const hy = up ? g.y1 - g.y0 : (g.y1 - g.y0) / 2, cy = up ? g.y0 : (g.y0 + g.y1) / 2, w = g.w * k, h = hy * k, m = gN(up ? (Math.PI * (w + h)) / 2 : TAU * Math.sqrt((w * w + h * h) / 2), sp), e = 2 / g.n, cnt = up ? m + 1 : m; for (let j = 0; j < cnt; j++) { const th = ((up ? Math.PI : TAU) * j) / m, c = Math.cos(th), s = Math.sin(th); add(x, cy + h * sg(s) * Math.abs(s) ** e * (up ? 1 : 1), w * sg(c) * Math.abs(c) ** e, br); } };
  for (let k = 0; k <= nx; k++) { const x = X0 + ((X1 - X0) * k) / nx; ring(x, get(x), 1, 1); }
  if (o.caps !== false && !up) for (const [x, g] of [[X0, S[0]], [X1, S[S.length - 1]]]) for (let k = 0.75; k > 0.1; k -= 0.25) ring(x, g, k, 1);
}
// flat plate from a 2D polygon (wings, fins, blades). plane: xz | xy | yz
function plate(add, poly, plane, c0, t, sp, br = 1) {
  const map = (u, v, sd) => (plane === 'xz' ? [c0[0] + u, c0[1] + sd, c0[2] + v] : plane === 'xy' ? [c0[0] + u, c0[1] + v, c0[2] + sd] : [c0[0] + sd, c0[1] + u, c0[2] + v]);
  const us = poly.map((p) => p[0]), vs = poly.map((p) => p[1]), u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
  const inside = (u, v) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
  const sides = t > 0.01 ? [-t / 2, t / 2] : [0];
  for (let u = u0; u <= u1; u += sp) for (let v = v0; v <= v1; v += sp) if (inside(u, v)) for (const sd of sides) add(...map(u, v, sd), br);
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; for (const sd of sides) line(add, map(a[0], a[1], sd), map(b[0], b[1], sd), sp * 0.8, 1.5); }
}
function stadium(add, c, hl, r, width, sp) { // tank-track belt around road wheels
  const per = 4 * hl + TAU * r, n = gN(per, sp), nw = gN(width, sp);
  for (let i = 0; i < n; i++) { let s = (i / n) * per, x, y; if (s < 2 * hl) { x = c[0] - hl + s; y = c[1] + r; } else if ((s -= 2 * hl) < Math.PI * r) { const a = Math.PI / 2 - s / r; x = c[0] + hl + r * Math.cos(a); y = c[1] + r * Math.sin(a); } else if ((s -= Math.PI * r) < 2 * hl) { x = c[0] + hl - s; y = c[1] - r; } else { s -= 2 * hl; const a = -Math.PI / 2 - s / r; x = c[0] - hl + r * Math.cos(a); y = c[1] + r * Math.sin(a); } for (let k = 0; k <= nw; k++) add(x, y, c[2] - width / 2 + (width * k) / nw, k === 0 || k === nw ? 1.5 : 1); }
}
// wheel built from tyre torus + rim disc + spokes. returns [tyre, rim] parts
function wheelParts(nm, c, R, tw, ax, sp, rimCol = C.ice) {
  const mr = R * 0.26;
  return [part(nm + ' tyre', C.cyan, (a) => torus(a, c, R - mr, mr, ax, sp * 0.9)), part(nm + ' rim', rimCol, (a) => { disc(a, c, R * 0.2, R * 0.62, ax, sp * 0.8, 1.2, tw * 0.1); for (let i = 0; i < 6; i++) { const an = (i / 6) * TAU; line(a, ringPt(c, R * 0.15, ax, an, tw * 0.1), ringPt(c, R * 0.62, ax, an, tw * 0.1), sp * 0.7, 1.5); } circle(a, c, R * 0.62, ax, sp * 0.6, 1.6, 0, TAU); }, { spin: { a: ax, w: 6 } })];
}

// ---------------------------------------------------------------- finishing: centre, scale, typed arrays, explode directions
const HIDE = /^(.* tyre|.* rim|.*Wheel|Road wheels|Brake|Mirror|Headlight|Tail light|Chain|Mount|Skid|Pannier|Muzzle|Sight|Trigger|Bolt|Rotor|Blade|Prop|Gear|Smoke|Antenna|Rail)/;
function finish(cat, name, tags, parts) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of parts) for (let i = 0; i < p.P.length; i += 4) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p.P[i + k]); hi[k] = Math.max(hi[k], p.P[i + k]); }
  const m = lo.map((l, i) => (l + hi[i]) / 2), f = 4.7 / Math.max(...hi.map((h, i) => h - lo[i]));
  const out = parts.filter((p) => p.P.length).map((p) => {
    const n = p.P.length / 4, ctr = [0, 0, 0];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) ctr[k] += (p.P[i * 4 + k] - m[k]) * f / n;
    const pos = new Float32Array(n * 3), b = new Float32Array(n), r = new Float32Array(n);
    for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) pos[i * 3 + k] = (p.P[i * 4 + k] - m[k]) * f - ctr[k] + (Math.random() - 0.5) * 0.012; b[i] = p.P[i * 4 + 3] * (p.dim ?? 1); r[i] = Math.random(); }
    const len = Math.hypot(...ctr), lift = Math.max(0, 1.3 - len) * 0.7;
    return { name: p.name, col: p.col, pos, b, r, center: ctr, spin: p.spin, shell: !!p.shell, lab: !HIDE.test(p.name) && n > 40, dir: p.shell ? [0, 0, 0] : [ctr[0] * 0.9, ctr[1] * 0.9 + lift, ctr[2] * 0.9] };
  });
  return { name, cat, tags, parts: out, floor: (lo[1] - m[1]) * f, count: out.reduce((s, p) => s + p.pos.length / 3, 0) };
}

// ================================================================ CARS
const car = (name, tags, p) => ({ name, tags, gen: () => {
  const { L, W, H, bt, hh, hn, dr, c = [0.16, 0.3, 0.55, 0.66], R = 0.34, wb = 0.31, conv, ev, spoil, bed, rack, top } = p, cl = p.cl ?? R * 0.55, hw = W / 2, s = SPf(L), X = (f) => (f - 0.5) * L, xs = [wb * L, -wb * L];
  const deckT = [[0, dr * 0.88], [c[0], dr], [0.5, bt], [c[3], hh], [0.92, (hh + hn) / 2], [1, hn]], deck = (f) => lerpTab(deckT, f);
  const wT = [[0, 0.8], [0.04, 0.94], [0.12, 1], [0.9, 0.98], [1, 0.84]], yT = [[0, 0.05], [0.05, 0], [0.95, 0], [1, 0.08]];
  const fs = [...new Set([0, 0.03, c[0], 0.5, c[3], 0.92, 1])].sort((a, b) => a - b);
  const lower = fs.map((f) => ({ x: X(f), y0: cl + lerpTab(yT, f), y1: deck(f), w: hw * lerpTab(wT, f), n: 3.2 }));
  const arch = (x, y, z) => Math.abs(z) > hw * 0.5 && xs.some((wx) => (x - wx) ** 2 + (y - R) ** 2 < (R * 1.2) ** 2);
  const P = [part('Body shell', C.cyan, (add) => { loft((x, y, z, b) => { if (!arch(x, y, z)) add(x, y, z, b); }, lower, s); for (const sd of [-1, 1]) { for (const wx of xs) circle(add, [wx, R, sd * hw * 0.99], R * 1.2, 'z', s * 0.7, 1.6, 0.05, Math.PI - 0.05); for (const k of [0.38, -0.06, -0.42]) { const x = X((c[1] + c[2]) / 2) + (k * (c[2] - c[1]) * L) / 0.9; line(add, [x, cl + 0.15, sd * hw * 0.99], [x, bt * 0.97, sd * hw * 0.97], s, 1.4); } line(add, [X(0.06), bt * 0.8, sd * hw * 0.99], [X(0.95), bt * 0.78, sd * hw * 0.97], s, 1.2); }
    for (let y = cl + 0.12; y < hn - 0.08; y += s * 1.3) for (let z = -hw * 0.5; z < hw * 0.5; z += s) add(X(1), y, z, 1.4); }, { shell: true })];
  let gh;
  if (conv) { const c3 = c[3]; gh = [{ x: X(c3 - 0.1), y0: hh - 0.02, y1: hh + 0.34, w: hw * 0.78 }, { x: X(c3), y0: hh - 0.02, y1: hh + 0.04, w: hw * 0.84 }]; }
  else { const ym = (f) => lerpTab([[c[0], deck(c[0]) + 0.03], [c[1], H - 0.02], [c[2], H - 0.02], [c[3], hh + 0.03]], f), g = [c[0], (c[0] + c[1]) / 2, c[1], (c[1] + c[2]) / 2, c[2], (c[2] + c[3]) / 2, c[3]]; gh = g.map((f) => ({ x: X(f), y0: deck(f) - 0.02, y1: ym(f), w: hw * (0.9 - 0.2 * Math.pow(Math.min(1, (ym(f) - deck(f)) / (H - deck(f) + 1e-6)), 1.6)), n: 3.4 })); }
  P.push(part(conv ? 'Windshield' : 'Cabin glass and roof', C.ice, (add) => { loft(add, gh, s * 0.9, { arc: 'upper', caps: false }); if (!conv) for (const sd of [-1, 1]) { line(add, [X(c[3]), hh, sd * hw * 0.8], [X(c[2]), H, sd * hw * 0.62], s, 1.6); line(add, [X(c[0]), deck(c[0]), sd * hw * 0.8], [X(c[1]), H, sd * hw * 0.62], s, 1.6); line(add, [X((c[1] + c[2]) / 2), bt, sd * hw * 0.82], [X((c[1] + c[2]) / 2), H - 0.02, sd * hw * 0.66], s, 1.5); } }, { shell: true }));
  P.push(...[-1, 1].flatMap((sd) => [part('Headlight', C.gold, (a) => ellipsoid(a, [X(1) - 0.04, hn - 0.1, sd * hw * 0.62], [0.06, 0.07, 0.2], s * 0.6, 1.6)), part('Tail light', C.red, (a) => ellipsoid(a, [X(0) + 0.03, dr * 0.8, sd * hw * 0.68], [0.05, 0.06, 0.22], s * 0.6, 1.6)), part('Mirror', C.cyan, (a) => ellipsoid(a, [X(c[3]) - 0.1, bt + 0.08, sd * hw * 1.02], [0.08, 0.06, 0.1], s * 0.6))]));
  for (const x of xs) for (const sd of [-1, 1]) P.push(...wheelParts(`Wheel ${x > 0 ? 'front' : 'rear'}`, [x, R, sd * (hw - 0.14)], R, 0.2, 'z', s * 0.75));
  const fx = X((c[1] + c[2]) / 2 + 0.03), rx = X(c[1] + 0.07), sy = cl + 0.3;
  P.push(part('Seats', C.white, (a) => { for (const [x, wz] of [[fx, 0.4], [rx, 0.55]]) for (const z of wz === 0.4 ? [-hw * 0.4, hw * 0.4] : [0]) { boxS(a, [x, sy, z], [0.45, 0.12, wz * W * 0.4 + 0.05], s, { edges: false }); boxS(a, [x - 0.2, sy + 0.28, z], [0.09, 0.5, wz * W * 0.4 + 0.05], s, { rz: -0.2, edges: false }); } }));
  P.push(part('Steering wheel', C.green, (a) => { torus(a, [X(c[3]) - 0.4, bt + 0.1, -hw * 0.4], 0.17, 0.018, 'x', s * 0.5); tube(a, [X(c[3]) - 0.4, bt + 0.1, -hw * 0.4], [X(c[3]) - 0.65, bt - 0.12, -hw * 0.4], 0.025, s * 0.6); }));
  P.push(part('Dashboard', C.violet, (a) => boxS(a, [X(c[3]) - 0.2, hh - 0.02, 0], [0.34, 0.2, W * 0.78], s)));
  if (ev) P.push(part('Battery pack', C.green, (a) => boxS(a, [0, cl + 0.07, 0], [L * 0.5, 0.12, W * 0.7], s)), part('Electric motor', C.orange, (a) => cylinder(a, [xs[1], cl + 0.2, 0], 0.17, 0.17, 0.5, 'z', s * 0.8)));
  else P.push(part('Engine', C.orange, (a) => { boxS(a, [X(0.83), cl + 0.3, 0], [L * 0.17, 0.42, W * 0.36], s); for (let i = 0; i < 4; i++) cylinder(a, [X(0.78) + i * 0.17, cl + 0.58, 0], 0.06, 0.06, 0.2, 'y', s * 0.7, true, 1.3); }), part('Fuel tank', C.pink, (a) => ellipsoid(a, [X(0.16), cl + 0.2, 0], [L * 0.09, 0.16, W * 0.28], s)), part('Radiator', C.gold, (a) => boxS(a, [X(0.96), cl + 0.3, 0], [0.08, 0.4, W * 0.6], s)), part('Battery', C.green, (a) => boxS(a, [X(0.84), cl + 0.58, hw * 0.55], [0.26, 0.2, 0.18], s * 0.8)));
  P.push(part('Driveshaft', C.blue, (a) => tube(a, [X(0.7), cl + 0.2, 0], [X(0.18), cl + 0.2, 0], 0.045, s * 0.7)), part('Exhaust', C.violet, (a) => { tube(a, [X(0.75), cl + 0.06, hw * 0.45], [X(0.1), cl + 0.06, hw * 0.45], 0.045, s * 0.7); cylinder(a, [X(0.1), cl + 0.08, hw * 0.45], 0.11, 0.11, 0.5, 'x', s * 0.8); }), part('Axles', C.blue, (a) => { for (const x of xs) tube(a, [x, R, -hw + 0.2], [x, R, hw - 0.2], 0.04, s * 0.7); ellipsoid(a, [xs[1], R, 0], [0.18, 0.15, 0.16], s * 0.8); }));
  if (spoil) P.push(part('Spoiler', C.gold, (a) => { plate(a, [[-0.18, -hw * 0.9], [0.18, -hw * 0.9], [0.14, hw * 0.9], [-0.14, hw * 0.9]], 'xz', [X(0.03), deck(0.1) + 0.32, 0], 0.03, s * 0.7); for (const sd of [-1, 1]) tube(a, [X(0.03), deck(0.1), sd * hw * 0.55], [X(0.03), deck(0.1) + 0.32, sd * hw * 0.55], 0.025, s * 0.6); }));
  if (bed) { const bl = c[0] * L, bx = -L / 2 + bl / 2; P.push(part('Cargo bed', C.gold, (a) => { for (const sd of [-1, 1]) boxS(a, [bx, dr + 0.22, sd * hw * 0.9], [bl, 0.44, 0.05], s); boxS(a, [-L / 2 + 0.03, dr + 0.22, 0], [0.05, 0.44, W * 0.9], s); boxS(a, [bx + bl / 2 - 0.02, dr + 0.22, 0], [0.05, 0.44, W * 0.9], s); })); }
  if (rack) P.push(part('Roof rack', C.gold, (a) => { for (const sd of [-1, 1]) tube(a, [X(c[1]), H + 0.05, sd * hw * 0.55], [X(c[2]), H + 0.05, sd * hw * 0.55], 0.02, s * 0.6); for (const f of [0.35, 0.45, 0.55]) tube(a, [X(f), H + 0.05, -hw * 0.55], [X(f), H + 0.05, hw * 0.55], 0.02, s * 0.6); }));
  if (top) P.push(part('Roof beacon', top, (a) => boxS(a, [X((c[1] + c[2]) / 2), H + 0.07, 0], [0.4, 0.1, W * 0.4], s * 0.8)));
  const DIM = /^(Seats|Steering|Dashboard|Battery|Electric|Engine|Fuel|Radiator|Driveshaft|Exhaust|Axles|Cargo|Roof rack)/;
  P.forEach((q) => { if (DIM.test(q.name)) q.dim = 0.5; });
  return P;
} });

const CARS = [
  car('SEDAN', 'car sedan family road', { L: 4.7, W: 1.85, H: 1.45, bt: 0.95, hh: 0.9, hn: 0.72, dr: 0.98, c: [0.16, 0.3, 0.55, 0.66] }),
  car('HATCHBACK', 'car hatchback compact road', { L: 4.0, W: 1.78, H: 1.5, bt: 0.97, hh: 0.92, hn: 0.76, dr: 1.0, c: [0.05, 0.16, 0.56, 0.66], R: 0.32 }),
  car('SUV', 'car suv crossover road', { L: 4.8, W: 1.95, H: 1.75, bt: 1.15, hh: 1.1, hn: 0.95, dr: 1.15, c: [0.06, 0.14, 0.6, 0.7], R: 0.42, cl: 0.3 }),
  car('COUPE', 'car coupe sports road', { L: 4.5, W: 1.85, H: 1.3, bt: 0.88, hh: 0.82, hn: 0.65, dr: 0.92, c: [0.2, 0.36, 0.52, 0.64], R: 0.35 }),
  car('CONVERTIBLE', 'car convertible cabriolet road', { L: 4.4, W: 1.82, H: 1.3, bt: 0.9, hh: 0.84, hn: 0.67, dr: 0.92, c: [0.2, 0.3, 0.5, 0.64], conv: 1 }),
  car('SUPERCAR', 'car supercar sports fast', { L: 4.5, W: 2.0, H: 1.12, bt: 0.72, hh: 0.7, hn: 0.5, dr: 0.78, c: [0.28, 0.4, 0.5, 0.6], R: 0.35, spoil: 1, wb: 0.3 }),
  car('HYPERCAR', 'car hypercar race fast', { L: 4.7, W: 2.05, H: 1.1, bt: 0.7, hh: 0.66, hn: 0.48, dr: 0.76, c: [0.3, 0.4, 0.5, 0.6], R: 0.36, spoil: 1 }),
  car('MUSCLE CAR', 'car muscle american v8', { L: 4.9, W: 1.92, H: 1.35, bt: 0.98, hh: 0.95, hn: 0.85, dr: 0.98, c: [0.22, 0.34, 0.5, 0.62], R: 0.37 }),
  car('RALLY CAR', 'car rally racing offroad', { L: 4.1, W: 1.82, H: 1.45, bt: 0.95, hh: 0.9, hn: 0.72, dr: 0.98, c: [0.06, 0.16, 0.56, 0.66], cl: 0.28, spoil: 1 }),
  car('STATION WAGON', 'car wagon estate family', { L: 4.9, W: 1.85, H: 1.5, bt: 0.95, hh: 0.9, hn: 0.72, dr: 0.98, c: [0.04, 0.12, 0.58, 0.68] }),
  car('MINIVAN', 'car minivan mpv family', { L: 4.9, W: 1.92, H: 1.75, bt: 1.0, hh: 0.95, hn: 0.82, dr: 1.1, c: [0.03, 0.1, 0.66, 0.76] }),
  car('PICKUP TRUCK', 'car pickup truck cargo', { L: 5.3, W: 2.0, H: 1.8, bt: 1.1, hh: 1.05, hn: 0.92, dr: 0.95, c: [0.4, 0.44, 0.64, 0.74], R: 0.42, cl: 0.3, bed: 1 }),
  car('JEEP 4X4', 'car jeep offroad 4x4', { L: 3.9, W: 1.8, H: 1.8, bt: 1.15, hh: 1.1, hn: 1.0, dr: 1.15, c: [0.1, 0.16, 0.62, 0.7], R: 0.43, cl: 0.35, rack: 1 }),
  car('LIMOUSINE', 'car limo luxury long', { L: 6.6, W: 1.95, H: 1.45, bt: 0.95, hh: 0.9, hn: 0.72, dr: 0.98, c: [0.12, 0.26, 0.6, 0.7], wb: 0.33 }),
  car('TAXI', 'car taxi cab city', { L: 4.5, W: 1.8, H: 1.45, bt: 0.95, hh: 0.9, hn: 0.72, dr: 0.98, c: [0.16, 0.3, 0.55, 0.66], top: C.gold }),
  car('POLICE CAR', 'car police patrol law', { L: 4.8, W: 1.9, H: 1.45, bt: 0.95, hh: 0.9, hn: 0.72, dr: 0.98, c: [0.16, 0.3, 0.55, 0.66], top: C.pink }),
  car('ELECTRIC SEDAN', 'car electric ev tesla battery', { L: 4.8, W: 1.9, H: 1.42, bt: 0.92, hh: 0.8, hn: 0.64, dr: 0.9, c: [0.14, 0.3, 0.58, 0.68], ev: 1 }),
  car('CITY MINI CAR', 'car mini small city tiny', { L: 3.0, W: 1.5, H: 1.55, bt: 1.0, hh: 0.95, hn: 0.8, dr: 1.05, c: [0.05, 0.15, 0.58, 0.7], R: 0.27 }),
  car('HEAVY SUV', 'car hummer offroad big', { L: 4.9, W: 2.2, H: 1.95, bt: 1.3, hh: 1.25, hn: 1.1, dr: 1.3, c: [0.1, 0.18, 0.6, 0.7], R: 0.5, cl: 0.45, rack: 1 }),
  car('ROADSTER', 'car roadster convertible sports', { L: 3.9, W: 1.75, H: 1.2, bt: 0.78, hh: 0.74, hn: 0.58, dr: 0.82, c: [0.2, 0.3, 0.5, 0.62], R: 0.31, conv: 1 }),
];
export { C, part, line, circle, disc, cylinder, tube, torus, ellipsoid, boxS, loft, plate, stadium, wheelParts, SPf, finish, CARS };
