// lib/repo/payments.js — Stars to'lovlari.

import { run, get, all, now } from '../core/db.js';

export const paymentsRepo = {
  /**
   * To'lovni yozadi. charge_id unikal: Telegram update'ni qayta yuborsa ham
   * to'lov ikki marta hisoblanmaydi. → true (yangi) | false (allaqachon bor)
   */
  async record({ userId, planId, amount, chargeId, days }) {
    const res = await run(
      `INSERT INTO payments (user_id, plan_id, amount, charge_id, days, created_at)
       VALUES (:userId, :planId, :amount, :chargeId, :days, :ts)
       ON CONFLICT(charge_id) DO NOTHING
       RETURNING id`,
      { userId, planId, amount, chargeId, days, ts: now() },
    );
    return (res.rows || []).length > 0;
  },

  byCharge(chargeId) {
    return get('SELECT * FROM payments WHERE charge_id = :chargeId', { chargeId });
  },

  /** → true agar shu chaqiruv uni refunded qilgan bo'lsa */
  async markRefunded(chargeId) {
    const res = await run(
      'UPDATE payments SET refunded = 1 WHERE charge_id = :chargeId AND refunded = 0',
      { chargeId },
    );
    return res.rowsAffected > 0;
  },

  ofUser(userId, limit = 10) {
    return all(
      'SELECT * FROM payments WHERE user_id = :userId ORDER BY id DESC LIMIT :limit',
      { userId, limit },
    );
  },

  stats() {
    const ts = now();
    return get(
      `SELECT count(*) AS total,
         coalesce(sum(CASE WHEN refunded = 0 THEN amount ELSE 0 END), 0) AS stars,
         coalesce(sum(CASE WHEN refunded = 0 AND created_at > :month THEN amount ELSE 0 END), 0) AS stars30
       FROM payments`,
      { month: ts - 30 * 86400 },
    );
  },
};
