// lib/repo/chats.js — suhbatlar tarixi.

import { run, get, now } from '../core/db.js';

export const chatsRepo = {
  async create(a, b) {
    const res = await run(
      'INSERT INTO chats (user_a, user_b, started_at) VALUES (:a, :b, :ts) RETURNING id',
      { a, b, ts: now() },
    );
    return res.rows?.[0]?.id ?? res.lastInsertRowid;
  },

  get(id) {
    return get('SELECT * FROM chats WHERE id = :id', { id });
  },

  /**
   * Suhbatni yopadi. Faqat birinchi chaqiruv muvaffaqiyatli bo'ladi (atomar) —
   * ikkala tomon bir vaqtda /stop bossa ham xabar ikki marta yuborilmaydi.
   * → yopilgan chat qatori yoki null.
   */
  async end(id, endedBy) {
    const res = await run(
      `UPDATE chats SET ended_at = :ts, ended_by = :by
       WHERE id = :id AND ended_at IS NULL RETURNING *`,
      { id, by: endedBy ?? null, ts: now() },
    );
    return res.rows?.[0] ?? null;
  },

  /** Foydalanuvchining oxirgi suhbati. */
  lastOf(userId) {
    return get(
      `SELECT * FROM chats WHERE id = (
         SELECT max(id) FROM (
           SELECT max(id) AS id FROM chats WHERE user_a = :u
           UNION ALL SELECT max(id) FROM chats WHERE user_b = :u))`,
      { u: userId },
    );
  },

  stats() {
    const ts = now();
    return get(
      `SELECT count(*) AS total,
         sum(CASE WHEN started_at > :day THEN 1 ELSE 0 END) AS today,
         sum(CASE WHEN ended_at IS NULL THEN 1 ELSE 0 END) AS active
       FROM chats`,
      { day: ts - 86400 },
    );
  },
};

export const otherSide = (chat, userId) => (chat.user_a === userId ? chat.user_b : chat.user_a);
