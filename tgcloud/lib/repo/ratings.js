// lib/repo/ratings.js — suhbat baholari.

import { run, now } from '../core/db.js';

export const ratingsRepo = {
  /** Baho qo'shadi. Shu suhbatga allaqachon baho bergan bo'lsa — false. */
  async add({ chatId, raterId, targetId, value }) {
    const res = await run(
      `INSERT INTO ratings (chat_id, rater_id, target_id, value, created_at)
       VALUES (:chatId, :raterId, :targetId, :value, :ts)
       ON CONFLICT(rater_id, chat_id) DO NOTHING`,
      { chatId, raterId, targetId, value, ts: now() },
    );
    return (res.rowsAffected ?? res.changes ?? 0) > 0;
  },
};
