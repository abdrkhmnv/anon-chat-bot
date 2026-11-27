// lib/repo/queue.js — kutish navbati va atomar juftlash.
// Navbatda muddat yo'q: qidiruvni bosgan foydalanuvchi o'zi bekor qilmaguncha,
// suhbatdosh topilguncha yoki botni bloklaguncha navbatda faol turadi.

import { run, get } from '../core/db.js';

export const queueRepo = {
  /**
   * Navbatga qo'shadi. region/wantRegion/ageMin/ageMax — VIP filtrlari (oddiy foydalanuvchida null),
   * penalty — yomon baho (navbatda kechroq).
   */
  async join({ userId, gender, age, wantGender = 'any', premium = 0,
    region = null, wantRegion = null, ageMin = null, ageMax = null, penalty = 0 }) {
    await run(
      `INSERT INTO queue (user_id, gender, age, want_gender, premium, created_at,
                          region, want_region, age_min, age_max, penalty)
       -- created_at qat'iy o'sadi: bir millisekundda kelganlarda ham FIFO tartibi aniq.
       VALUES (:userId, :gender, :age, :wantGender, :premium,
               MAX(:ts, COALESCE((SELECT MAX(created_at) FROM queue), 0) + 1),
               :region, :wantRegion, :ageMin, :ageMax, :penalty)
       ON CONFLICT(user_id) DO UPDATE SET
         gender = excluded.gender, age = excluded.age, want_gender = excluded.want_gender,
         premium = excluded.premium, created_at = excluded.created_at,
         region = excluded.region, want_region = excluded.want_region,
         age_min = excluded.age_min, age_max = excluded.age_max, penalty = excluded.penalty`,
      {
        userId, gender, age, wantGender, premium: premium ? 1 : 0, ts: Date.now(),
        region, wantRegion, ageMin, ageMax, penalty: penalty ? 1 : 0,
      },
    );
  },

  async leave(userId) {
    const res = await run('DELETE FROM queue WHERE user_id = :userId', { userId });
    return res.rowsAffected > 0;
  },

  // Mos sherikni topib, ikkalasini BITTA so'rovda navbatdan oladi (atomar).
  // Filtrlar ikki tomonlama: menga mos bo'lishi VA men unga mos bo'lishim kerak.
  // Tartib: kutish vaqti; VIP `boostMs` oldinga, yomon baholi `penaltyMs` orqaga.
  async claimPartner(userId, { boostMs = 0, penaltyMs = 0 } = {}) {
    const res = await run(
      `WITH me AS (
         SELECT * FROM queue WHERE user_id = :me
       ), cand AS (
         SELECT q.user_id FROM queue q, me
         WHERE q.user_id <> me.user_id
           -- "arvoh": navbatda qolgan, lekin endi qidirmayotgan foydalanuvchi bilan ulanmaymiz
           AND EXISTS (SELECT 1 FROM users u WHERE u.id = q.user_id AND u.state = 'searching' AND u.banned = 0)
           AND (me.want_gender = 'any' OR q.gender = me.want_gender)
           AND (q.want_gender = 'any' OR q.want_gender = me.gender)
           AND (me.want_region IS NULL OR q.region = me.want_region)
           AND (q.want_region IS NULL OR me.region = q.want_region)
           AND (me.age_min IS NULL OR q.age >= me.age_min)
           AND (me.age_max IS NULL OR q.age <= me.age_max)
           AND (q.age_min IS NULL OR me.age >= q.age_min)
           AND (q.age_max IS NULL OR me.age <= q.age_max)
         ORDER BY q.created_at - q.premium * :boostMs + q.penalty * :penaltyMs, q.created_at
         LIMIT 1
       )
       DELETE FROM queue
       WHERE user_id IN (SELECT user_id FROM cand UNION ALL SELECT :me FROM cand)
       RETURNING *`,
      { me: userId, boostMs, penaltyMs },
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
