// 20 guns as dotted, stylised silhouettes (outer shape only, no working mechanism).
import { C, part, line, circle, disc, cylinder, tube, ellipsoid, boxS, plate, SPf } from './models.js';

const SD = [-1, 1];
const gun = (name, tags, p) => ({ name, tags, gen: () => {
  const { rl = 1.3, rh = 0.32, bl = 1.2, hg = 0, st = 0, mg = 'box', sc = 0, bp = 0, pg = 1, mx = 0.25, pistol, big, rev, pump, lever, rocket, dbl } = p;
  const len = rl + bl + st + 0.4, s = SPf(len * 0.95), bx = rl / 2, by = rh * 0.18, my = -rh / 2, bR = big ? 0.1 : 0.052;
  const zs = dbl ? [-0.07, 0.07] : [0];
  const P = [
    part(pistol ? 'Slide' : 'Receiver', C.cyan, (a) => { boxS(a, [0, 0, 0], [rl, rh, pistol ? 0.26 : 0.3], s); line(a, [-bx * 0.1, rh * 0.15, 0.15], [bx * 0.4, rh * 0.15, 0.15], s, 1.6); }),
    part('Barrel', C.orange, (a) => { for (const z of zs) cylinder(a, [bx + bl / 2 - 0.05, by, z], bR, bR, bl, 'x', s * 0.7, false); }),
    part('Muzzle', C.gold, (a) => { for (const z of zs) { cylinder(a, [bx + bl - 0.05, by, z], bR * 1.5, bR * 1.5, 0.15, 'x', s * 0.6); circle(a, [bx + bl - 0.12, by, z], bR * 1.5, 'x', s * 0.5, 1.5); } }),
    part('Trigger guard', C.gold, (a) => { tube(a, [0.1, my, 0], [0.16, my - 0.2, 0], 0.012, s * 0.5); tube(a, [0.16, my - 0.2, 0], [0.45, my - 0.2, 0], 0.012, s * 0.5); tube(a, [0.45, my - 0.2, 0], [0.5, my, 0], 0.012, s * 0.5); }),
    part('Trigger', C.white, (a) => tube(a, [0.3, my, 0], [0.27, my - 0.14, 0], 0.014, s * 0.5)),
    part('Sight', C.white, (a) => { tube(a, [bx + bl - 0.25, by + 0.05, 0], [bx + bl - 0.25, by + 0.2, 0], 0.012, s * 0.5); boxS(a, [bx - 0.1, rh / 2 + 0.05, 0], [0.1, 0.1, 0.14], s * 0.6); }),
    part('Bolt handle', C.white, (a) => { tube(a, [0, rh / 2, 0.12], [0.02, rh / 2 + 0.05, 0.28], 0.015, s * 0.5); ellipsoid(a, [0.02, rh / 2 + 0.06, 0.3], [0.03, 0.03, 0.03], s * 0.4); }),
  ];
  if (hg) P.push(part('Handguard', C.white, (a) => { cylinder(a, [bx + hg / 2 - 0.05, by, 0], 0.13, 0.13, hg, 'x', s * 0.8, false); boxS(a, [bx + hg / 2 - 0.05, by + 0.16, 0], [hg, 0.04, 0.1], s * 0.7); for (let i = 1; i < 5; i++) circle(a, [bx + (hg * i) / 5, by, 0], 0.13, 'x', s * 0.6, 1.3); }));
  if (st) P.push(part('Stock', C.blue, (a) => { plate(a, [[-bx, rh * 0.45], [-bx - st, rh * 0.3], [-bx - st, -rh * 1.25], [-bx, -rh * 0.5]], 'xy', [0, 0, 0], 0.22, s); }), part('Butt pad', C.gold, (a) => plate(a, [[-bx - st, rh * 0.32], [-bx - st - 0.06, rh * 0.32], [-bx - st - 0.06, -rh * 1.27], [-bx - st, -rh * 1.27]], 'xy', [0, 0, 0], 0.24, s * 0.8)));
  if (pg) P.push(part('Pistol grip', C.green, (a) => plate(a, [[-bx * 0.3, my], [-bx * 0.3 + 0.22, my], [-bx * 0.3 + 0.1, my - 0.58], [-bx * 0.3 - 0.14, my - 0.58]], 'xy', [0, 0, 0], 0.2, s)));
  if (mg === 'box') P.push(part('Magazine', C.pink, (a) => plate(a, [[mx, my], [mx + 0.28, my], [mx + 0.22, my - 0.8], [mx - 0.06, my - 0.8]], 'xy', [0, 0, 0], 0.22, s)));
  if (mg === 'curve') P.push(part('Magazine', C.pink, (a) => { plate(a, [[mx, my], [mx + 0.28, my], [mx + 0.27, my - 0.45], [mx - 0.01, my - 0.45]], 'xy', [0, 0, 0], 0.22, s); plate(a, [[mx - 0.01, my - 0.45], [mx + 0.27, my - 0.45], [mx + 0.12, my - 0.88], [mx - 0.16, my - 0.88]], 'xy', [0, 0, 0], 0.22, s); }));
  if (mg === 'drum') P.push(part('Drum magazine', C.pink, (a) => { cylinder(a, [mx + 0.1, my - 0.38, 0], 0.34, 0.34, 0.26, 'z', s * 0.8); circle(a, [mx + 0.1, my - 0.38, 0.14], 0.2, 'z', s * 0.6, 1.5); }));
  if (mg === 'tube') P.push(part('Tube magazine', C.pink, (a) => cylinder(a, [bx + bl * 0.4, by - 0.14, 0], 0.045, 0.045, bl * 0.8, 'x', s * 0.6, false)));
  if (sc) P.push(part('Scope', C.green, (a) => { cylinder(a, [0.1, rh / 2 + 0.24, 0], 0.11, 0.11, sc, 'x', s * 0.7); cylinder(a, [0.1 + sc / 2 + 0.07, rh / 2 + 0.24, 0], 0.11, 0.16, 0.14, 'x', s * 0.6); cylinder(a, [0.1 - sc / 2 - 0.05, rh / 2 + 0.24, 0], 0.13, 0.1, 0.1, 'x', s * 0.6); cylinder(a, [0.1, rh / 2 + 0.36, 0], 0.03, 0.03, 0.08, 'y', s * 0.5); }), part('Scope mounts', C.gold, (a) => { for (const dx of [-sc * 0.3, sc * 0.3]) boxS(a, [0.1 + dx, rh / 2 + 0.1, 0], [0.07, 0.2, 0.1], s * 0.6); }));
  if (bp) P.push(part('Bipod', C.gold, (a) => { for (const d of SD) { tube(a, [bx + bl * 0.55, by - 0.1, d * 0.05], [bx + bl * 0.55 + 0.3, -0.8, d * 0.4], 0.016, s * 0.6); } }));
  if (rev) P.push(part('Revolver cylinder', C.gold, (a) => { cylinder(a, [0.15, 0, 0], 0.24, 0.24, 0.4, 'x', s * 0.7); for (let i = 0; i < 6; i++) circle(a, [0.35, 0.15 * Math.cos((i / 6) * 6.283), 0.15 * Math.sin((i / 6) * 6.283)], 0.045, 'x', s * 0.4, 1.4); ellipsoid(a, [-bx - 0.02, rh * 0.5, 0], [0.06, 0.1, 0.04], s * 0.5); }));
  if (pump) P.push(part('Pump forearm', C.white, (a) => cylinder(a, [bx + 0.5, by - 0.1, 0], 0.12, 0.12, 0.6, 'x', s * 0.7)));
  if (lever) P.push(part('Lever', C.gold, (a) => { tube(a, [0.1, my, 0], [0.1, my - 0.3, 0], 0.016, s * 0.5); tube(a, [0.1, my - 0.3, 0], [0.6, my - 0.3, 0], 0.016, s * 0.5); tube(a, [0.6, my - 0.3, 0], [0.6, my, 0], 0.016, s * 0.5); }));
  if (rocket) P.push(part('Launch tube', C.white, (a) => cylinder(a, [0.2, 0.25, 0], 0.28, 0.28, rl + bl, 'x', s * 0.9, false)), part('Rocket warhead', C.orange, (a) => cylinder(a, [bx + bl + 0.25, 0.25, 0], 0.2, 0.03, 0.5, 'x', s * 0.7)));
  return P;
} });

export const GUNS = [
  gun('COMPACT PISTOL', 'gun pistol handgun compact', { pistol: 1, rl: 0.9, rh: 0.28, bl: 0.5, mx: 0.15 }),
  gun('FULL-SIZE PISTOL', 'gun pistol handgun', { pistol: 1, rl: 1.1, rh: 0.3, bl: 0.6, mx: 0.2 }),
  gun('REVOLVER', 'gun revolver handgun', { rl: 0.9, bl: 0.9, mg: 'none', rev: 1 }),
  gun('MACHINE PISTOL', 'gun machine pistol auto', { pistol: 1, rl: 0.9, bl: 0.5, mx: 0.15 }),
  gun('SUBMACHINE GUN', 'gun smg submachine', { rl: 1, bl: 0.7, hg: 0.3, st: 0.9 }),
  gun('ASSAULT RIFLE AK-STYLE', 'gun rifle assault ak', { rl: 1.2, bl: 1.0, hg: 0.8, st: 1, mg: 'curve' }),
  gun('ASSAULT RIFLE M4-STYLE', 'gun rifle assault m4', { rl: 1.1, bl: 1.0, hg: 0.9, st: 1, sc: 0.5 }),
  gun('CARBINE', 'gun carbine short rifle', { rl: 1.1, bl: 0.7, hg: 0.6, st: 0.8 }),
  gun('BULLPUP RIFLE', 'gun rifle bullpup', { rl: 2, bl: 1.0, hg: 0.3, st: 0.1, mx: -0.3, sc: 0.5 }),
  gun('BATTLE RIFLE', 'gun rifle battle heavy', { rl: 1.3, bl: 1.2, hg: 0.7, st: 1.1 }),
  gun('MARKSMAN RIFLE', 'gun dmr marksman rifle', { rl: 1.3, bl: 1.4, hg: 0.8, st: 1.1, sc: 0.8, bp: 1 }),
  gun('SNIPER RIFLE', 'gun sniper bolt rifle', { rl: 1.3, bl: 1.7, hg: 0.5, st: 1.1, sc: 1, bp: 1 }),
  gun('ANTI-MATERIEL RIFLE', 'gun sniper heavy antimateriel', { rl: 1.5, rh: 0.35, bl: 2.2, hg: 0.6, st: 1, sc: 0.9, bp: 1, big: 1 }),
  gun('LIGHT MACHINE GUN', 'gun lmg machine gun squad', { rl: 1.3, bl: 1.6, hg: 0.8, st: 1, mg: 'drum', bp: 1 }),
  gun('PUMP SHOTGUN', 'gun shotgun pump', { rl: 1.1, bl: 1.8, st: 1, mg: 'tube', pump: 1, pg: 0 }),
  gun('DOUBLE-BARREL SHOTGUN', 'gun shotgun double hunting', { rl: 0.9, bl: 1.7, hg: 0.5, st: 1, mg: 'none', dbl: 1, pg: 0 }),
  gun('LEVER-ACTION RIFLE', 'gun rifle lever western', { rl: 1.0, bl: 1.7, st: 0.9, mg: 'tube', lever: 1, pg: 0 }),
  gun('HUNTING RIFLE', 'gun rifle hunting bolt', { rl: 1.1, bl: 1.5, st: 1, mg: 'none', sc: 0.7, pg: 0 }),
  gun('GRENADE LAUNCHER', 'gun launcher grenade', { rl: 1.0, bl: 1.0, st: 0.8, mg: 'none', big: 1 }),
  gun('ROCKET LAUNCHER', 'gun rocket rpg launcher war', { rl: 0.6, bl: 1.6, st: 0, mg: 'none', rocket: 1 }),
];
