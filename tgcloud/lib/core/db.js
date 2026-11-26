// lib/core/db.js — ma'lumotlar bazasiga yupqa qobiq.
import { db } from 'sdk';

export const now = () => Math.floor(Date.now() / 1000);

// Faqat so'rovda uchraydigan parametrlar uzatiladi.
function prep(query, params) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    const name = k.startsWith(':') ? k : ':' + k;
    if (!new RegExp(`${name}\\b`).test(query)) continue;
    out[name] = v === undefined ? null : v;
  }
  return out;
}

export const run = (query, params) => db.run(query, prep(query, params));
export const all = (query, params) => db.all(query, prep(query, params));
export const get = (query, params) => db.get(query, prep(query, params));
