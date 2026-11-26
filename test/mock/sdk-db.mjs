// sdk/db mock: node:sqlite ustida. Faqat loyihada ishlatilgan qism.
import { DatabaseSync } from 'node:sqlite';

let sqlite = new DatabaseSync(':memory:');

function exec(query, params, mode) {
  const stmt = sqlite.prepare(query);
  const p = params || {};
  if (mode === 'run') {
    if (/\bRETURNING\b/i.test(query)) {
      const rows = stmt.all(p);
      return { rowsAffected: rows.length, lastInsertRowid: 0, rows };
    }
    const r = stmt.run(p);
    return { rowsAffected: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid), rows: [] };
  }
  if (mode === 'all') return stmt.all(p);
  if (mode === 'get') return stmt.get(p) ?? null;
}

export const db = {
  run: async (q, p) => exec(q, p, 'run'),
  all: async (q, p) => exec(q, p, 'all'),
  get: async (q, p) => exec(q, p, 'get'),
};
export default db;

// --- sxema DSL (DDL yaratish uchun minimal) ---
function col(type) {
  return (name, opts) => {
    const c = { name, type, mods: [], opts };
    const api = {
      __col: c,
      primaryKey(o) { c.mods.push(o?.autoIncrement ? 'PRIMARY KEY AUTOINCREMENT' : 'PRIMARY KEY'); return api; },
      notNull() { c.mods.push('NOT NULL'); return api; },
      unique() { c.mods.push('UNIQUE'); return api; },
      default(v) { c.mods.push(`DEFAULT ${typeof v === 'string' ? `'${v}'` : typeof v === 'boolean' ? Number(v) : v}`); return api; },
      references() { throw new Error('FKs not supported'); },
    };
    return api;
  };
}
export const integer = col('INTEGER');
export const text = col('TEXT');
export const real = col('REAL');
export const index = (name) => ({ on: (...cols) => ({ __index: { name, cols } }) });
export const uniqueIndex = (name) => ({ on: (...cols) => ({ __index: { name, cols, unique: true } }) });

export function table(name, cols, cb) {
  const refs = {};
  for (const [k, v] of Object.entries(cols)) { v.__col.name ??= k; refs[k] = v.__col.name; }
  const extras = cb ? Object.values(cb(refs)) : [];
  return { __table: { name, cols: Object.values(cols).map((c) => c.__col), extras } };
}

export function applySchema(schema) {
  sqlite = new DatabaseSync(':memory:');
  for (const t of Object.values(schema)) {
    if (!t?.__table) continue;
    const { name, cols, extras } = t.__table;
    sqlite.exec(`CREATE TABLE ${name} (${cols.map((c) => `${c.name} ${c.type} ${c.mods.join(' ')}`).join(', ')})`);
    for (const e of extras) {
      if (e.__index) sqlite.exec(`CREATE ${e.__index.unique ? 'UNIQUE ' : ''}INDEX ${e.__index.name} ON ${name} (${e.__index.cols.join(', ')})`);
    }
  }
}
export const raw = () => sqlite;
