// Bikes (20) and war vehicles (20) as dotted point-cloud generators.
import { C, part, line, circle, disc, cylinder, tube, ellipsoid, boxS, loft, plate, stadium, wheelParts, SPf } from './models.js';

const SD = [-1, 1];
const dim = (P, re, v = 0.5) => { P.forEach((q) => { if (re.test(q.name)) q.dim = v; }); return P; };
const path = (add, pts, r, sp, br = 1) => { for (let i = 0; i < pts.length - 1; i++) tube(add, pts[i], pts[i + 1], r, sp, br); };
const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

// ======================================================================= BIKES
// wb wheelbase, rf/rr wheel radii, ht seat height
// fair fairing, bags panniers, off offroad, chop chopper rake, fat tyre width, es engine size, sc scooter, ev electric, high tall bars, tk tank size, bar light bar
const bike = (name, tags, p) => ({ name, tags, gen: () => {
  const { wb, rf, rr, ht, fair, bags, off, chop = 0, fat = 1, es = 1, sc, ev, high, tk = 1, bar } = p;
  const a = wb / 2, s = SPf((wb + rf + rr) * 1.15);
  const hx = a - 0.26 - chop * 0.3, hy = ht + 0.3 + rf * 0.3, by = hy + (high ? 0.38 : 0.07), px = -a * 0.5, ex = sc ? -a * 0.7 : a * 0.08;
  const P = [...wheelParts('Front wheel', [a, rf, 0], rf, 0.12 * fat, 'z', s), ...wheelParts('Rear wheel', [-a, rr, 0], rr, 0.16 * fat, 'z', s)];
  P.push(
    part('Fork', C.white, (add) => { for (const d of SD) tube(add, [hx, hy, d * 0.1], [a, rf, d * 0.1], 0.024, s * 0.7); tube(add, [hx, hy, -0.1], [hx, hy, 0.1], 0.02, s * 0.7); }),
    part('Brake disc', C.orange, (add) => disc(add, [a, rf, 0.11], rf * 0.28, rf * 0.5, 'z', s * 0.8), { spin: { a: 'z', w: 6 } }),
    part('Handlebar', C.gold, (add) => { tube(add, [hx, hy, 0], [hx, by, 0], 0.03, s * 0.7); tube(add, [hx, by, -0.34], [hx - 0.04, by, 0.34], 0.022, s * 0.6); for (const d of SD) cylinder(add, [hx - 0.04, by, d * 0.34], 0.032, 0.032, 0.12, 'z', s * 0.6); }),
    part('Headlight', C.gold, (add) => ellipsoid(add, [hx + 0.12, hy + 0.04, 0], [0.1, 0.1, 0.1], s * 0.7, 1.5)),
    part('Mirror', C.cyan, (add) => { for (const d of SD) { tube(add, [hx, by, d * 0.3], [hx - 0.06, by + 0.16, d * 0.36], 0.01, s * 0.5); ellipsoid(add, [hx - 0.06, by + 0.18, d * 0.38], [0.03, 0.05, 0.06], s * 0.5); } }),
    part('Front fender', C.blue, (add) => { for (const z of [-0.05, 0, 0.05]) circle(add, [a, rf, z], rf * 1.2, 'z', s * 0.8, 1.2, 0.35, Math.PI - 0.1); }),
    part('Rear fender', C.blue, (add) => { for (const z of [-0.07, 0, 0.07]) circle(add, [-a, rr, z], rr * 1.2, 'z', s * 0.8, 1.2, 0.2, Math.PI - 0.5); }),
    part('Swingarm', C.blue, (add) => { for (const d of SD) tube(add, [px * 1.1, 0.42, d * 0.12], [-a, rr, d * 0.12], 0.028, s * 0.7); }),
    part('Chain', C.violet, (add) => { line(add, [-a * 0.55, 0.38, 0.17], [-a, rr, 0.17], s * 0.7, 1.4); line(add, [-a * 0.55, 0.26, 0.17], [-a, rr * 0.55, 0.17], s * 0.7, 1.4); disc(add, [-a, rr, 0.17], 0.04, rr * 0.4, 'z', s * 0.8); }),
    part('Footpegs', C.gold, (add) => { for (const d of SD) tube(add, [-a * 0.2, 0.34, d * 0.1], [-a * 0.2, 0.34, d * 0.4], 0.02, s * 0.6); }),
    part('Exhaust', C.violet, (add) => { path(add, [[ex + 0.25, 0.3, 0.2], [ex - 0.1, 0.2, 0.24], [-a * 0.85, 0.3, 0.24]], 0.04, s * 0.7); cylinder(add, [-a * 1.0, 0.34, 0.24], 0.07, 0.06, 0.55, 'x', s * 0.7); }),
    part('Tail light', C.red, (add) => ellipsoid(add, [-a - rr * 0.55, ht + 0.05, 0], [0.05, 0.05, 0.12], s * 0.6, 1.6)));

  if (sc) {
    P.push(
      part('Floorboard', C.blue, (add) => boxS(add, [0, 0.3, 0], [a * 1.1, 0.05, 0.4], s)),
      part('Leg shield', C.cyan, (add) => boxS(add, [a * 0.72, 0.72, 0], [0.08, 0.75, 0.42], s), { shell: true }),
      part('Body cowl', C.cyan, (add) => ellipsoid(add, [-a * 0.35, 0.62, 0], [a * 0.5, 0.28, 0.24], s), { shell: true }),
      part('Seat', C.white, (add) => boxS(add, [-a * 0.35, 0.92, 0], [a * 0.8, 0.09, 0.32], s)));
  } else {
    P.push(
      part('Frame', C.cyan, (add) => {
        path(add, [[hx, hy, 0], [px * 0.8, ht + 0.05, 0]], 0.03, s * 0.7);
        for (const d of SD) path(add, [[hx, hy, d * 0.05], [ex, 0.32, d * 0.12], [-a * 0.55, 0.42, d * 0.12], [px * 0.8, ht + 0.05, d * 0.1]], 0.028, s * 0.7);
        path(add, [[px * 0.8, ht + 0.05, 0], [-a * 1.0, ht + 0.08, 0]], 0.025, s * 0.7);
      }),
      part('Seat', C.white, (add) => loft(add, [{ x: -a * 0.98, y0: ht + 0.04, y1: ht + 0.13, w: 0.1, n: 2.8 }, { x: -a * 0.6, y0: ht + 0.02, y1: ht + 0.17, w: 0.17, n: 2.8 }, { x: -a * 0.12, y0: ht + 0.04, y1: ht + 0.13, w: 0.1, n: 2.8 }], s)),
      part('Fuel tank', C.pink, (add) => loft(add, [{ x: -a * 0.22, y0: ht + 0.1, y1: ht + 0.3, w: 0.1, n: 2.4 }, { x: a * 0.1, y0: ht + 0.04, y1: ht + 0.42, w: 0.2 * tk, n: 2.4 }, { x: a * 0.4, y0: ht + 0.12, y1: ht + 0.33, w: 0.11, n: 2.4 }], s)));
  }
  if (ev) P.push(part('Battery pack', C.green, (add) => boxS(add, [a * 0.1, 0.5, 0], [0.7, 0.42, 0.3], s)), part('Electric motor', C.orange, (add) => cylinder(add, [-a * 0.45, 0.42, 0], 0.14, 0.14, 0.3, 'z', s * 0.8)));
  else P.push(part('Engine', C.orange, (add) => {
    const e = Math.min(es, 1.1);
    cylinder(add, [ex, 0.34, 0], 0.19 * e, 0.19 * e, 0.34, 'z', s * 0.75);
    cylinder(add, [ex + 0.06, 0.34 + 0.2 * e, 0], 0.12 * e, 0.12 * e, 0.3 * e, 'y', s * 0.75);
    for (let k = 1; k < 4; k++) circle(add, [ex + 0.06, 0.34 + 0.08 * e + k * 0.07 * e, 0], 0.14 * e, 'y', s * 0.6, 1.4);
    boxS(add, [ex + 0.06, 0.34 + 0.4 * e, 0], [0.22 * e, 0.09 * e, 0.22 * e], s * 0.8);
    boxS(add, [ex - 0.3 * e, 0.34, 0], [0.3 * e, 0.2 * e, 0.26], s * 0.8);
  }));

  if (fair) P.push(
    part('Fairing', C.cyan, (add) => loft(add, [{ x: a * 0.15, y0: ht - 0.15, y1: ht + 0.4, w: 0.22 }, { x: a * 0.6, y0: ht - 0.1, y1: ht + 0.32, w: 0.2 }, { x: a + 0.1, y0: hy - 0.25, y1: hy + 0.15, w: 0.08 }], s), { shell: true }),
    part('Windscreen', C.ice, (add) => loft(add, [{ x: a * 0.78, y0: ht + 0.28, y1: ht + 0.3, w: 0.19 }, { x: a * 0.6, y0: ht + 0.28, y1: ht + 0.7, w: 0.15 }], s * 0.9, { arc: 'upper', caps: false }), { shell: true }));
  if (bags) P.push(part('Pannier', C.gold, (add) => { for (const d of SD) boxS(add, [-a * 0.7, ht - 0.08, d * 0.36], [0.7, 0.4, 0.2], s); }));
  if (off) P.push(part('Skid plate', C.gold, (add) => plate(add, rect(-0.35, 0.35, -0.15, 0.15), 'xz', [a * 0.05, 0.22, 0], 0.02, s)));
  if (bar) P.push(part('Light bar', C.pink, (add) => boxS(add, [a * 0.55, ht + 0.75, 0], [0.12, 0.08, 0.5], s * 0.8)));
  return dim(P, /^(Engine|Battery|Electric|Chain|Frame)/, 0.55);
} });

export const BIKES = [
  bike('SPORT BIKE 600', 'bike motorcycle sport fast', { wb: 1.4, rf: 0.3, rr: 0.3, ht: 0.8, fair: 1 }),
  bike('SUPERBIKE 1000', 'bike motorcycle superbike race fast', { wb: 1.45, rf: 0.3, rr: 0.31, ht: 0.82, fair: 1, es: 1.15, fat: 1.3 }),
  bike('NAKED STREET', 'bike motorcycle naked street', { wb: 1.4, rf: 0.3, rr: 0.3, ht: 0.8, es: 1.1 }),
  bike('CRUISER', 'bike motorcycle cruiser harley', { wb: 1.7, rf: 0.33, rr: 0.31, ht: 0.68, high: 1, fat: 1.5, es: 1.3, tk: 1.1 }),
  bike('CHOPPER', 'bike motorcycle chopper custom', { wb: 1.9, rf: 0.33, rr: 0.3, ht: 0.65, chop: 0.7, high: 1, es: 1.2 }),
  bike('BOBBER', 'bike motorcycle bobber custom', { wb: 1.55, rf: 0.3, rr: 0.3, ht: 0.62, es: 1.1 }),
  bike('CAFE RACER', 'bike motorcycle cafe racer retro', { wb: 1.4, rf: 0.3, rr: 0.3, ht: 0.78 }),
  bike('SCRAMBLER', 'bike motorcycle scrambler offroad', { wb: 1.45, rf: 0.34, rr: 0.32, ht: 0.85, high: 1, off: 1 }),
  bike('TOURING', 'bike motorcycle touring long', { wb: 1.7, rf: 0.32, rr: 0.32, ht: 0.8, fair: 1, bags: 1, es: 1.3, high: 1 }),
  bike('ADVENTURE', 'bike motorcycle adventure offroad', { wb: 1.55, rf: 0.36, rr: 0.32, ht: 0.88, fair: 1, off: 1, high: 1, bags: 1 }),
  bike('DUAL SPORT', 'bike motorcycle dual sport offroad', { wb: 1.4, rf: 0.34, rr: 0.31, ht: 0.86, off: 1, high: 1 }),
  bike('MOTOCROSS', 'bike motorcycle motocross dirt', { wb: 1.4, rf: 0.37, rr: 0.33, ht: 0.92, off: 1, high: 1, es: 0.8 }),
  bike('ENDURO', 'bike motorcycle enduro dirt', { wb: 1.4, rf: 0.36, rr: 0.32, ht: 0.9, off: 1, high: 1, es: 0.85 }),
  bike('TRIALS BIKE', 'bike motorcycle trials', { wb: 1.2, rf: 0.33, rr: 0.3, ht: 0.7, off: 1, high: 1, es: 0.7 }),
  bike('SUPERMOTO', 'bike motorcycle supermoto', { wb: 1.4, rf: 0.31, rr: 0.31, ht: 0.88, high: 1, es: 0.9 }),
  bike('SCOOTER', 'bike scooter city', { wb: 1.3, rf: 0.21, rr: 0.2, ht: 0.7, sc: 1 }),
  bike('MOPED', 'bike moped small city', { wb: 1.1, rf: 0.22, rr: 0.22, ht: 0.65, sc: 1, es: 0.7 }),
  bike('ELECTRIC BIKE', 'bike motorcycle electric ev battery', { wb: 1.4, rf: 0.3, rr: 0.3, ht: 0.8, ev: 1 }),
  bike('POLICE BIKE', 'bike motorcycle police patrol', { wb: 1.7, rf: 0.32, rr: 0.32, ht: 0.8, fair: 1, bags: 1, es: 1.3, bar: 1 }),
  bike('RETRO CLASSIC', 'bike motorcycle classic retro vintage', { wb: 1.45, rf: 0.31, rr: 0.31, ht: 0.8 }),
];

// ======================================================================= WAR: ground
// L/W/H hull, trk tracks | n axles + R wheel radius, tl turret length (th height, tw width factor, tx x offset)
// gl barrel length, gc barrels, br barrel radius, how howitzer, rail missiles, radar
const gnd = (name, tags, p) => ({ name, tags, gen: () => {
  const { L, W, H, trk, R = 0.5, n = 4, tl, th = 0.8, tw = 0.8, tx = 0, gl = 3, gc = 1, br = 0.09, how, rail = 0, radar } = p;
  const s = SPf(L * 1.15), hw = W / 2, y0 = trk ? 0.42 : R * 0.85, yb = y0 + H;
  const hs = trk
    ? [{ x: -L / 2, y0: y0 + H * 0.1, y1: y0 + H * 0.9, w: hw * 0.9, n: 3.4 }, { x: -L * 0.4, y0, y1: yb, w: hw, n: 3.4 }, { x: L * 0.2, y0, y1: yb, w: hw, n: 3.4 }, { x: L * 0.5, y0: y0 + H * 0.15, y1: y0 + H * 0.5, w: hw * 0.82, n: 3.2 }]
    : [{ x: -L / 2, y0: y0 + H * 0.1, y1: yb, w: hw * 0.92, n: 3.4 }, { x: -L * 0.3, y0, y1: yb, w: hw, n: 3.4 }, { x: L * 0.12, y0, y1: yb, w: hw, n: 3.4 }, { x: L * 0.5, y0: y0 + H * 0.15, y1: y0 + H * 0.7, w: hw * 0.8, n: 3.2 }];
  const P = [part('Hull', C.cyan, (add) => loft(add, hs, s), { shell: true })];
  if (trk) {
    const hl = L * 0.38, nw = Math.round(L / 0.8);
    for (const d of SD) {
      const z = d * (hw + 0.2);
      P.push(part('Track', C.blue, (add) => stadium(add, [0, 0.4, z], hl, 0.4, 0.42, s)),
        part('Road wheels', C.ice, (add) => { for (let i = 0; i < nw; i++) { const x = -hl + (i * 2 * hl) / (nw - 1); disc(add, [x, 0.4, z], 0.04, 0.3, 'z', s * 0.8); circle(add, [x, 0.4, z], 0.3, 'z', s * 0.6, 1.5); } disc(add, [-hl - 0.1, 0.4, z], 0.04, 0.38, 'z', s * 0.8); }, { spin: { a: 'z', w: -4 } }),
        part('Track skirt', C.blue, (add) => plate(add, [[-L * 0.4, 0.2], [L * 0.4, 0.2], [L * 0.42, 0.78], [-L * 0.42, 0.78]], 'xy', [0, 0, d * (hw + 0.44)], 0.02, s * 1.2)));
    }
  } else {
    for (let i = 0; i < n; i++) {
      const x = n > 1 ? L * 0.38 - (i * L * 0.76) / (n - 1) : 0;
      for (const d of SD) P.push(...wheelParts('Wheel', [x, R, d * (hw + 0.05)], R, 0.3, 'z', s));
      P.push(part('Axle', C.blue, (add) => tube(add, [x, R, -hw], [x, R, hw], 0.05, s * 0.7)));
    }
  }
  if (tl) {
    const gy = yb + th * 0.55, ts = tl * tw / 2;
    P.push(part('Turret', C.white, (add) => loft(add, [{ x: tx - tl / 2, y0: yb, y1: yb + th * 0.9, w: ts * 0.9, n: 3 }, { x: tx, y0: yb, y1: yb + th, w: ts, n: 3 }, { x: tx + tl / 2, y0: yb, y1: yb + th * 0.7, w: ts * 0.6, n: 3 }], s), { shell: true }),
      part('Hatch', C.green, (add) => cylinder(add, [tx - tl * 0.15, yb + th + 0.05, ts * 0.4], 0.2, 0.2, 0.1, 'y', s * 0.8)),
      part('Smoke launchers', C.violet, (add) => { for (const d of SD) for (let k = 0; k < 3; k++) cylinder(add, [tx - tl * 0.2 + k * 0.1, yb + th * 0.6, d * ts * 0.95], 0.045, 0.045, 0.2, 'x', s * 0.6); }));
    if (how) P.push(part('Howitzer barrel', C.orange, (add) => tube(add, [tx, yb + th * 0.55, 0], [tx + gl * 0.95, yb + th * 0.55 + gl * 0.3, 0], 0.13, s * 0.8)),
      part('Muzzle brake', C.gold, (add) => cylinder(add, [tx + gl * 0.95, yb + th * 0.55 + gl * 0.3, 0], 0.2, 0.2, 0.3, 'x', s * 0.7)));
    else {
      P.push(part('Gun barrel', C.orange, (add) => { for (let i = 0; i < gc; i++) { const z = gc > 1 ? (i - (gc - 1) / 2) * 0.5 : 0; cylinder(add, [tx + tl * 0.5 + gl / 2, gy, z], br, br, gl, 'x', s * 0.7, false); } }),
        part('Muzzle brake', C.gold, (add) => { for (let i = 0; i < gc; i++) { const z = gc > 1 ? (i - (gc - 1) / 2) * 0.5 : 0; cylinder(add, [tx + tl * 0.5 + gl, gy, z], br * 1.5, br * 1.5, 0.2, 'x', s * 0.7); } }));
      P.push(part('Gun mantlet', C.gold, (add) => boxS(add, [tx + tl * 0.5, gy, 0], [0.22, th * 0.6, Math.max(0.5, gc * 0.55)], s)));
    }
  }
  for (let i = 0; i < rail; i++) {
    const z = (i - (rail - 1) / 2) * 0.55;
    P.push(part('Missile', C.pink, (add) => { tube(add, [-L * 0.25, yb + 0.3, z], [L * 0.28, yb + 1.3, z], 0.13, s * 0.7); ellipsoid(add, [L * 0.3, yb + 1.35, z], [0.2, 0.12, 0.12], s * 0.7, 1.4); }));
  }
  if (rail) P.push(part('Launcher base', C.gold, (add) => boxS(add, [0, yb + 0.1, 0], [L * 0.7, 0.18, rail * 0.55 + 0.3], s)));
  if (radar) P.push(part('Radar dish', C.green, (add) => { disc(add, [-L * 0.2, yb + 1.4, 0], 0, 0.5, 'x', s * 0.8); circle(add, [-L * 0.2, yb + 1.4, 0], 0.5, 'x', s * 0.6, 1.6); }), part('Radar mast', C.white, (add) => tube(add, [-L * 0.2, yb, 0], [-L * 0.2, yb + 1.35, 0], 0.05, s * 0.7)));
  P.push(part('Engine', C.orange, (add) => boxS(add, [-L * 0.3, y0 + H * 0.45, 0], [L * 0.25, H * 0.5, W * 0.5], s)),
    part('Fuel tank', C.pink, (add) => boxS(add, [-L * 0.05, y0 + H * 0.25, 0], [L * 0.2, H * 0.3, W * 0.5], s)),
    part('Ammo store', C.green, (add) => boxS(add, [L * 0.2, y0 + H * 0.3, 0], [L * 0.18, H * 0.35, W * 0.45], s)));
  return dim(P, /^(Engine|Fuel|Ammo|Axle)/, 0.5);
} });

// ======================================================================= WAR: air
const heli = (name, tags, p) => ({ name, tags, gen: () => {
  const { L, W, H, tandem, wing, gun } = p, s = SPf(L * 1.6), y = H / 2 + 0.5, top = y + H / 2;
  const P = [
    part('Fuselage', C.cyan, (add) => loft(add, [{ x: -L * 0.55, y0: y - H * 0.2, y1: y + H * 0.2, w: W * 0.16, n: 2.6 }, { x: -L * 0.35, y0: y - H * 0.45, y1: y + H * 0.45, w: W * 0.36, n: 2.6 }, { x: 0, y0: y - H * 0.5, y1: y + H * 0.5, w: W * 0.5, n: 2.6 }, { x: L * 0.35, y0: y - H * 0.45, y1: y + H * 0.35, w: W * 0.4, n: 2.6 }, { x: L * 0.55, y0: y - H * 0.2, y1: y + H * 0.1, w: W * 0.12, n: 2.6 }], s), { shell: true }),
    part('Canopy', C.ice, (add) => loft(add, [{ x: L * 0.5, y0: y + H * 0.02, y1: y + H * 0.08, w: W * 0.1 }, { x: L * 0.3, y0: y, y1: y + H * 0.6, w: W * 0.36 }, { x: L * 0.08, y0: y + H * 0.1, y1: y + H * 0.55, w: W * 0.4 }], s * 0.9, { arc: 'upper', caps: false }), { shell: true }),
    part('Engine', C.green, (add) => boxS(add, [-L * 0.05, top + 0.12, 0], [L * 0.3, 0.3, W * 0.5], s)),
    part('Fuel tank', C.pink, (add) => boxS(add, [-L * 0.1, y - H * 0.3, 0], [L * 0.3, H * 0.3, W * 0.6], s)),
    part('Skids', C.gold, (add) => { for (const d of SD) { tube(add, [-L * 0.3, 0.12, d * W * 0.55], [L * 0.35, 0.12, d * W * 0.55], 0.04, s * 0.7); for (const x of [-L * 0.15, L * 0.2]) tube(add, [x, 0.12, d * W * 0.55], [x, y - H * 0.4, d * W * 0.35], 0.03, s * 0.7); } }),
  ];
  const rotor = (x, len, w, nm) => {
    P.push(part('Mast ' + nm, C.white, (add) => tube(add, [x, top, 0], [x, top + 0.3, 0], 0.07, s * 0.7)),
      part('Rotor ' + nm, C.orange, (add) => { plate(add, rect(-len / 2, len / 2, -0.1, 0.1), 'xz', [x, top + 0.32, 0], 0.03, s * 0.8); plate(add, rect(-0.1, 0.1, -len / 2, len / 2), 'xz', [x, top + 0.32, 0], 0.03, s * 0.8); }, { spin: { a: 'y', w } }));
  };
  if (tandem) { rotor(L * 0.35, L * 0.62, 8, 'front'); rotor(-L * 0.38, L * 0.62, -8, 'rear'); P.push(part('Rear pylon', C.cyan, (add) => boxS(add, [-L * 0.38, top - 0.1, 0], [0.5, 0.5, 0.4], s))); }
  else {
    rotor(0, L * 1.1, 9, 'main');
    const tx = -L * 1.0;
    P.push(part('Tail boom', C.cyan, (add) => tube(add, [-L * 0.5, y + H * 0.15, 0], [tx, y + H * 0.2, 0], 0.11, s * 0.8)),
      part('Tail fin', C.gold, (add) => plate(add, [[0, 0], [-0.5, 0], [-0.35, H * 0.9], [-0.1, H * 0.9]], 'xy', [tx + 0.2, y + H * 0.2, 0], 0.04, s * 0.8)),
      part('Tail rotor', C.orange, (add) => plate(add, rect(-0.04, 0.04, -H * 0.5, H * 0.5), 'xy', [tx - 0.3, y + H * 0.7, 0.12], 0.02, s * 0.7), { spin: { a: 'z', w: 12 } }));
  }
  if (wing) {
    P.push(part('Stub wing', C.cyan, (add) => plate(add, rect(-0.35, 0.35, -W * 1.4, W * 1.4), 'xz', [0, y - H * 0.2, 0], 0.05, s)));
    P.push(part('Rocket pods', C.pink, (add) => { for (const d of SD) for (const k of [0.8, 1.25]) { cylinder(add, [L * 0.02, y - H * 0.28, d * W * k], 0.13, 0.13, L * 0.25, 'x', s * 0.8); ellipsoid(add, [L * 0.16, y - H * 0.28, d * W * k], [0.1, 0.09, 0.09], s * 0.7); } }));
  }
  if (gun) P.push(part('Chin gun', C.orange, (add) => { ellipsoid(add, [L * 0.42, y - H * 0.45, 0], [0.18, 0.12, 0.12], s * 0.8); tube(add, [L * 0.42, y - H * 0.45, 0], [L * 0.62, y - H * 0.5, 0], 0.04, s * 0.6); }));
  return dim(P, /^(Engine|Fuel)/, 0.5);
} });

const jet = (name, tags, p) => ({ name, tags, gen: () => {
  const { L, span, r = 0.4, twin, eng = 2, mis, bomb, delta } = p, s = SPf(L * 1.1), hs = span / 2;
  const wing = delta
    ? [[L * 0.2, 0], [-L * 0.3, hs], [-L * 0.35, hs], [-L * 0.3, r], [-L * 0.3, -r], [-L * 0.35, -hs], [-L * 0.3, -hs]]
    : [[L * 0.12, r], [-L * 0.12, hs], [-L * 0.28, hs], [-L * 0.24, r], [-L * 0.24, -r], [-L * 0.28, -hs], [-L * 0.12, -hs], [L * 0.12, -r]];
  const P = [
    part('Fuselage', C.cyan, (add) => loft(add, [{ x: -L * 0.5, y0: -r * 0.35, y1: r * 0.35, w: r * 0.5, n: 2.4 }, { x: -L * 0.38, y0: -r * 0.8, y1: r * 0.8, w: r * 0.85, n: 2.4 }, { x: 0, y0: -r, y1: r * 0.95, w: r, n: 2.4 }, { x: L * 0.25, y0: -r * 0.7, y1: r * 0.7, w: r * 0.75, n: 2.4 }, { x: L * 0.5, y0: -0.04, y1: 0.04, w: 0.04, n: 2 }], s), { shell: true }),
    part('Wing', C.cyan, (add) => plate(add, wing, 'xz', [0, -r * 0.15, 0], 0.05, s), { shell: true }),
    part('Tailplane', C.gold, (add) => plate(add, [[-L * 0.34, r * 0.3], [-L * 0.46, span * 0.2], [-L * 0.5, span * 0.2], [-L * 0.46, 0], [-L * 0.46, 0], [-L * 0.5, -span * 0.2], [-L * 0.46, -span * 0.2], [-L * 0.34, -r * 0.3]], 'xz', [0, 0, 0], 0.04, s)),
    part('Tail fin', C.gold, (add) => { for (const z of twin ? [-r * 0.6, r * 0.6] : [0]) plate(add, [[0, 0], [-L * 0.18, 0], [-L * 0.1, r * 2.2], [L * 0.02, r * 2.2]], 'xy', [-L * 0.3, r * 0.5, z], 0.05, s); }),
    part('Canopy', C.ice, (add) => loft(add, [{ x: L * 0.3, y0: r * 0.5, y1: r * 0.6, w: r * 0.2 }, { x: L * 0.2, y0: r * 0.5, y1: r * 1.2, w: r * 0.42 }, { x: L * 0.06, y0: r * 0.55, y1: r * 1.1, w: r * 0.45 }], s * 0.9, { arc: 'upper', caps: false }), { shell: true }),
    part('Landing gear', C.gold, (add) => { tube(add, [L * 0.22, -r * 0.4, 0], [L * 0.22, -r - 0.3, 0], 0.025, s * 0.6); for (const d of SD) tube(add, [-L * 0.08, -r * 0.4, d * 0.3], [-L * 0.08, -r - 0.3, d * 0.35], 0.025, s * 0.6); }),
    ...[[L * 0.22, 0], [-L * 0.08, -0.35], [-L * 0.08, 0.35]].map(([x, z]) => part('Gear wheel', C.cyan, (add) => { cylinder(add, [x, -r - 0.3, z], 0.1, 0.1, 0.08, 'z', s * 0.6); }, { dim: 0.7 })),
  ];
  if (eng === 4) P.push(part('Engine pod', C.orange, (add) => { for (const z of [-span * 0.34, -span * 0.18, span * 0.18, span * 0.34]) { cylinder(add, [0, -r * 0.55, z], 0.2, 0.2, L * 0.22, 'x', s * 0.8); ellipsoid(add, [L * 0.12, -r * 0.55, z], [0.12, 0.17, 0.17], s * 0.7); } }));
  else for (const z of eng === 1 ? [0] : [-r * 0.55, r * 0.55]) P.push(part('Intake', C.green, (add) => cylinder(add, [L * 0.12, -r * 0.1, z], r * 0.4, r * 0.4, L * 0.22, 'x', s * 0.8, false)), part('Nozzle', C.orange, (add) => cylinder(add, [-L * 0.5, 0, z], 0.24, 0.18, 0.35, 'x', s * 0.7)));
  if (mis) P.push(part('Missiles', C.pink, (add) => { for (const d of SD) for (const k of [0.25, 0.4]) { cylinder(add, [-L * 0.02, -r * 0.5, d * span * k], 0.055, 0.055, L * 0.25, 'x', s * 0.7); ellipsoid(add, [L * 0.12, -r * 0.5, d * span * k], [0.09, 0.05, 0.05], s * 0.6, 1.4); } }));
  if (bomb) P.push(part('Bomb bay', C.pink, (add) => boxS(add, [0, -r * 0.6, 0], [L * 0.25, 0.22, 0.6], s)));
  return dim(P, /^(Intake|Bomb|Engine pod)/, 0.55);
} });

// ======================================================================= WAR: sea
const ship = (name, tags, p) => ({ name, tags, gen: () => {
  const { L, W, H = 0.7, guns = [0.3], cells } = p, s = SPf(L * 0.75);
  const P = [
    part('Hull', C.cyan, (add) => loft(add, [{ x: -L / 2, y0: -H * 0.4, y1: H, w: W * 0.42, n: 2.8 }, { x: -L * 0.35, y0: -H * 0.55, y1: H, w: W * 0.5, n: 2.8 }, { x: L * 0.15, y0: -H * 0.55, y1: H, w: W / 2, n: 2.8 }, { x: L * 0.4, y0: -H * 0.3, y1: H * 1.05, w: W * 0.3, n: 2.4 }, { x: L / 2, y0: H * 0.1, y1: H * 1.1, w: 0.03, n: 2 }], s), { shell: true }),
    part('Bridge', C.white, (add) => { boxS(add, [L * 0.08, H + 0.4, 0], [L * 0.22, 0.8, W * 0.55], s); boxS(add, [L * 0.08, H + 0.95, 0], [L * 0.12, 0.3, W * 0.4], s); }),
    part('Funnel', C.gold, (add) => cylinder(add, [-L * 0.1, H + 0.55, 0], 0.22, 0.2, 1.0, 'y', s * 0.8)),
    part('Mast', C.white, (add) => { tube(add, [L * 0.08, H + 1.1, 0], [L * 0.08, H + 2.0, 0], 0.03, s * 0.6); tube(add, [L * 0.08, H + 1.7, -0.3], [L * 0.08, H + 1.7, 0.3], 0.02, s * 0.6); }),
    part('Radar', C.green, (add) => plate(add, rect(-0.45, 0.45, -0.04, 0.04), 'xz', [L * 0.08, H + 2.05, 0], 0.03, s * 0.8), { spin: { a: 'y', w: 3 } }),
    part('Helipad', C.gold, (add) => { circle(add, [-L * 0.36, H + 0.03, 0], W * 0.33, 'y', s, 1.5); line(add, [-L * 0.36 - 0.25, H + 0.03, -0.25], [-L * 0.36 - 0.25, H + 0.03, 0.25], s); line(add, [-L * 0.36 + 0.25, H + 0.03, -0.25], [-L * 0.36 + 0.25, H + 0.03, 0.25], s); line(add, [-L * 0.36 - 0.25, H + 0.03, 0], [-L * 0.36 + 0.25, H + 0.03, 0], s); }),
  ];
  for (const f of guns) P.push(part('Gun turret', C.orange, (add) => { cylinder(add, [L * f, H + 0.12, 0], 0.28, 0.28, 0.24, 'y', s * 0.8); tube(add, [L * f + 0.1, H + 0.28, 0], [L * f + 1.0, H + 0.32, 0], 0.05, s * 0.6); }));
  if (cells) P.push(part('Missile cells', C.pink, (add) => plate(add, rect(-L * 0.06, L * 0.06, -W * 0.18, W * 0.18), 'xz', [L * 0.24, H + 0.04, 0], 0.08, s)));
  return P;
} });

const sub = (name, tags) => ({ name, tags, gen: () => {
  const L = 5.8, s = SPf(L * 1.1);
  return [
    part('Hull', C.cyan, (add) => loft(add, [{ x: -L / 2, y0: -0.08, y1: 0.08, w: 0.08, n: 2 }, { x: -L * 0.38, y0: -0.45, y1: 0.45, w: 0.45, n: 2 }, { x: -L * 0.1, y0: -0.7, y1: 0.7, w: 0.7, n: 2 }, { x: L * 0.25, y0: -0.7, y1: 0.7, w: 0.7, n: 2 }, { x: L * 0.42, y0: -0.5, y1: 0.5, w: 0.5, n: 2 }, { x: L / 2, y0: -0.1, y1: 0.1, w: 0.1, n: 2 }], s), { shell: true }),
    part('Sail', C.white, (add) => loft(add, [{ x: -0.35, y0: 0.55, y1: 1.2, w: 0.14, n: 3 }, { x: 0.35, y0: 0.55, y1: 1.2, w: 0.14, n: 3 }], s)),
    part('Periscope', C.gold, (add) => { tube(add, [0.2, 1.2, 0], [0.2, 1.8, 0], 0.03, s * 0.6); tube(add, [0.2, 1.8, 0], [0.4, 1.8, 0], 0.03, s * 0.6); }),
    part('Dive planes', C.gold, (add) => { for (const d of SD) plate(add, rect(-0.3, 0.3, 0, d * 0.5), 'xz', [0.1, 0.9, d * 0.14], 0.03, s); }),
    part('Rudders', C.gold, (add) => { plate(add, [[0, -0.6], [-0.5, -0.5], [-0.5, 0.5], [0, 0.6]], 'xy', [-L * 0.45, 0, 0], 0.05, s); plate(add, rect(-0.45, 0.05, -0.55, 0.55), 'xz', [-L * 0.45, 0, 0], 0.04, s); }),
    part('Propeller', C.orange, (add) => { plate(add, rect(-0.6, 0.6, -0.07, 0.07), 'yz', [-L * 0.5 - 0.15, 0, 0], 0.03, s * 0.8); plate(add, rect(-0.07, 0.07, -0.6, 0.6), 'yz', [-L * 0.5 - 0.15, 0, 0], 0.03, s * 0.8); }, { spin: { a: 'x', w: 10 } }),
    part('Battery', C.green, (add) => boxS(add, [-0.5, -0.2, 0], [1.2, 0.3, 0.7], s), { dim: 0.5 }),
    part('Motor', C.orange, (add) => cylinder(add, [-1.5, 0, 0], 0.3, 0.3, 1.2, 'x', s * 0.8), { dim: 0.5 }),
    part('Torpedo tubes', C.pink, (add) => { for (const d of SD) cylinder(add, [1.7, 0, d * 0.25], 0.09, 0.09, 1.2, 'x', s * 0.7); }, { dim: 0.55 }),
  ];
} });

export const WAR = [
  gnd('MAIN BATTLE TANK', 'war tank army armor mbt', { L: 7.4, W: 3.3, H: 0.9, trk: 1, tl: 2.8, th: 0.85, gl: 4.2, br: 0.1 }),
  gnd('LIGHT TANK', 'war tank army armor light', { L: 6, W: 2.8, H: 0.75, trk: 1, tl: 2.2, th: 0.7, gl: 2.8, br: 0.08 }),
  gnd('TANK DESTROYER', 'war tank army antitank', { L: 6.8, W: 3, H: 0.8, trk: 1, tl: 3, th: 0.6, tw: 1, tx: 0.5, gl: 4.5, br: 0.1 }),
  gnd('SELF-PROPELLED HOWITZER', 'war artillery howitzer army', { L: 7, W: 3.1, H: 0.9, trk: 1, tl: 2.6, th: 1.1, tw: 0.95, how: 1, gl: 4.4 }),
  gnd('ANTI-AIRCRAFT TANK', 'war tank antiair aa radar', { L: 6.4, W: 3, H: 0.8, trk: 1, tl: 2.2, th: 0.8, gc: 2, gl: 2.2, br: 0.07, radar: 1 }),
  gnd('TRACKED APC', 'war apc carrier army troop', { L: 5.4, W: 2.8, H: 1.0, trk: 1, tl: 1.2, th: 0.35, gl: 1.2, br: 0.05 }),
  gnd('INFANTRY FIGHTING VEHICLE', 'war ifv army troop', { L: 6, W: 3, H: 0.95, trk: 1, tl: 1.6, th: 0.6, gl: 1.8, br: 0.06, rail: 1 }),
  gnd('8X8 WHEELED APC', 'war apc wheeled army troop', { L: 7, W: 2.9, H: 1.1, n: 4, R: 0.55, tl: 1.4, th: 0.5, gl: 1.6, br: 0.06 }),
  gnd('MRAP', 'war mrap armored patrol truck', { L: 6, W: 2.6, H: 1.3, n: 2, R: 0.55 }),
  gnd('ARMORED JEEP', 'war jeep armored scout light', { L: 4.2, W: 2.0, H: 0.8, n: 2, R: 0.45, tl: 0.9, th: 0.4, gl: 0.7, br: 0.05 }),
  gnd('ROCKET LAUNCHER TRUCK', 'war rocket mlrs artillery truck', { L: 8, W: 2.7, H: 1.0, n: 3, R: 0.55, rail: 3 }),
  gnd('SAM MISSILE TRUCK', 'war sam missile antiair truck radar', { L: 8.5, W: 2.8, H: 1.0, n: 4, R: 0.55, rail: 4, radar: 1 }),
  heli('ATTACK HELICOPTER', 'war helicopter attack air gunship', { L: 5, W: 1.1, H: 1.0, wing: 1, gun: 1 }),
  heli('TRANSPORT HELICOPTER', 'war helicopter transport chinook air', { L: 7, W: 1.8, H: 1.7, tandem: 1 }),
  jet('FIGHTER JET', 'war jet fighter air plane', { L: 6, span: 4, twin: 1, mis: 1 }),
  jet('STEALTH FIGHTER', 'war jet stealth fighter air plane', { L: 6.5, span: 4.6, twin: 1, r: 0.35, delta: 1 }),
  jet('BOMBER', 'war jet bomber air plane', { L: 9, span: 9, eng: 4, r: 0.6, bomb: 1 }),
  ship('DESTROYER', 'war ship navy destroyer sea', { L: 11, W: 1.7, cells: 1, guns: [0.3] }),
  ship('PATROL BOAT', 'war boat navy patrol sea', { L: 5, W: 1.2, H: 0.4, guns: [0.3] }),
  sub('SUBMARINE', 'war submarine navy sea'),
];
