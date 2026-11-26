// lib/repo/kv.js — plaginlar uchun umumiy kalit-qiymat ombori (JSON qiymatlar).
// Yangi plagin sxemaga jadval qo'shmasdan ham o'z ma'lumotini saqlay oladi:
//   await kv.set(`referral:${userId}`, { invitedBy: 123 })

import { run, get, now } from '../core/db.js';

export const kv = {
  async get(key) {
    const row = await get('SELECT value, expires_at FROM kv WHERE key = :key', { key });
    if (!row) return null;
    if (row.expires_at && row.expires_at <= now()) return null;
    return row.value == null ? null : JSON.parse(row.value);
  },

  async set(key, value, ttlSec = 0) {
    await run(
      `INSERT INTO kv (key, value, expires_at) VALUES (:key, :value, :exp)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
      { key, value: JSON.stringify(value), exp: ttlSec ? now() + ttlSec : 0 },
    );
  },

  async del(key) {
    await run('DELETE FROM kv WHERE key = :key', { key });
  },
};
