// lib/repo/queue.js — kutish navbati va atomar juftlash.
// Navbatda muddat yo'q: qidiruvni bosgan foydalanuvchi o'zi bekor qilmaguncha,
// suhbatdosh topilguncha yoki botni bloklaguncha navbatda faol turadi.

import { run, get } from '../core/db.js';

export const queueRepo = {
  async join({ userId, gender, age, wantGender = 'any', premium = 0 }) {
    await run(
      `INSERT INTO queue (user_id, gender, age, want_gender, premium, created_at)
       -- created_at qat'iy o'sadi: bir millisekundda kelganlarda ham FIFO tartibi aniq.
       VALUES (:userId, :gender, :age, :wantGender, :premium,
               MAX(:ts, COALESCE((SELECT MAX(created_at) FROM queue), 0) + 1))
       ON CONFLICT(user_id) DO UPDATE SET
         gender = excluded.gender, age = excluded.age, want_gender = excluded.want_gender,
         premium = excluded.premium, created_at = excluded.created_at`,
      { userId, gender, age, wantGender, premium: premium ? 1 : 0, ts: Date.now() },
    );
  },

  async leave(userId) {
    const res = await run('DELETE FROM queue WHERE user_id = :userId', { userId });
    return res.rowsAffected > 0;
  },

  // Mos sherikni topib, ikkalasini BITTA so'rovda navbatdan oladi (atomar).
  async claimPartner(userId) {
    const res = await run(
      `WITH me AS (
         SELECT * FROM queue WHERE user_id = :me
       ), cand AS (
         SELECT q.user_id FROM queue q, me
         WHERE q.user_id <> me.user_id
           AND (me.want_gender = 'any' OR q.gender = me.want_gender)
           AND (q.want_gender = 'any' OR q.want_gender = me.gender)
         ORDER BY q.created_at
         LIMIT 1
       )
       DELETE FROM queue
       WHERE user_id IN (SELECT user_id FROM cand UNION ALL SELECT :me FROM cand)
       RETURNING *`,
      { me: userId },
    );
    const rows = res.rows || [];
    if (rows.length !== 2) return null;
    return rows.find((r) => r.user_id !== userId) || null;
  },

  async stats() {
    return get(
      `SELECT count(*) AS total,
         sum(CASE WHEN gender = 'm' THEN 1 ELSE 0 END) AS males,
         sum(CASE WHEN gender = 'f' THEN 1 ELSE 0 END) AS females
       FROM queue`,
    );
  },
};
