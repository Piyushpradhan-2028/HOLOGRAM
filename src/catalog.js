// The 80-model catalogue. Models are generated lazily and cached, so start-up is instant.
import { CARS, finish } from './models.js';
import { BIKES, WAR } from './vehicles.js';
import { GUNS } from './guns.js';

const tag = (cat, list) => list.map((r) => ({ ...r, cat, tags: `${cat.toLowerCase()} ${r.tags}` }));
export const CATS = ['All', 'Cars', 'Bikes', 'War', 'Guns'];
export const MODELS = [...tag('Cars', CARS), ...tag('Bikes', BIKES), ...tag('War', WAR), ...tag('Guns', GUNS)];
export const ALL = MODELS;

const cache = new Map();
export function getModel(i) {
  if (!cache.has(i)) { const r = MODELS[i]; cache.set(i, finish(r.cat, r.name, r.tags, r.gen())); }
  return cache.get(i);
}
