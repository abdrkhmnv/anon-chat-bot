// lib/repo/users.js — users jadvali bilan ishlash.

import { run, get, all, now } from '../core/db.js';

// JS maydon nomi -> ustun nomi. update() faqat shu ro'yxatdagilarni qabul qiladi.
const COLUMNS = {
  firstName: 'first_name', username: 'username', lang: 'lang', gender: 'gender',
  age: 'age', step: 'step', state: 'state', lastWant: 'last_want', partnerId: 'partner_id', chatId: 'chat_id',
  premiumUntil: 'premium_until', banned: 'banned', reports: 'reports',
};

const TOUCH_EVERY_SEC = 300; // last_seen_at ni har xabarda emas, 5 daqiqada bir yangilaymiz

export const usersRepo = {
  get(id) {
    return get('SELECT * FROM users WHERE id = :id', { id });
  },

  /**
   * Update kelganda chaqiriladi: foydalanuvchini qaytaradi, yo'q bo'lsa yaratadi.
   * Odatda bitta o'qish (SELECT) — yozish faqat yangi foydalanuvchi yoki eskirgan
   * last_seen_at bo'lsa. Yuqori yuklamada bu muhim.
   */
  async touch(from, lang) {
    const ts = now();
    const row = await this.get(from.id);
    if (row && ts - row.last_seen_at < TOUCH_EVERY_SEC
        && row.username === (from.username ?? null)
        && row.first_name === (from.first_name ?? null)) {
      return row;
    }
    const res = await run(
      `INSERT INTO users (id, first_name, username, lang, created_at, last_seen_at)
       VALUES (:id, :fn, :un, :lang, :ts, :ts)
       ON CONFLICT(id) DO UPDATE SET
         first_name = excluded.first_name, username = excluded.username, last_seen_at = :ts
       RETURNING *`,
      { id: from.id, fn: from.first_name ?? null, un: from.username ?? null, lang, ts },
    );
    const user = res.rows?.[0] ?? (await this.get(from.id));
    if (user) user.__isNew = !row;
    return user;
  },

  async update(id, fields) {
    const sets = [];
    const params = { id };
    for (const [k, v] of Object.entries(fields)) {
      const col = COLUMNS[k];
      if (!col) throw new Error(`usersRepo.update: unknown field ${k}`);
      sets.push(`${col} = :${k}`);
      params[k] = v;
    }
    if (!sets.length) return;
    await run(`UPDATE users SET ${sets.join(', ')} WHERE id = :id`, params);
  },

  /** Premiumni `days` kunga uzaytiradi (amaldagi muddat ustiga qo'shiladi). → yangi muddat */
  async extendPremium(id, days) {
    const res = await run(
      `UPDATE users SET premium_until = MAX(premium_until, :ts) + :sec WHERE id = :id
       RETURNING premium_until`,
      { id, ts: now(), sec: days * 86400 },
    );
    return res.rows?.[0]?.premium_until ?? null;
  },

  async reducePremium(id, days) {
    await run(
      'UPDATE users SET premium_until = MAX(0, premium_until - :sec) WHERE id = :id',
      { id, sec: days * 86400 },
    );
  },

  /** Ikki foydalanuvchini suhbatga ulaydi. */
  async pair(a, b, chatId) {
    await run(
      `UPDATE users SET state = 'chatting', chat_id = :cid, step = NULL,
         partner_id = CASE id WHEN :a THEN :b ELSE :a END,
         chats_count = chats_count + 1
       WHERE id IN (:a, :b)`,
      { a, b, cid: chatId },
    );
  },

  /** Suhbatdan ajratadi (faqat shu chat_id da bo'lganlarni — takroriy chaqiruv xavfsiz). */
  async unpair(chatId) {
    await run(
      `UPDATE users SET state = 'idle', partner_id = NULL, chat_id = NULL
       WHERE chat_id = :cid AND state = 'chatting'`,
      { cid: chatId },
    );
  },

  /** Navbatdan tozalangan (eskirgan) foydalanuvchilarni 'idle' holatga qaytaradi. */
  async resetSearching(ids) {
    await run(
      `UPDATE users SET state = 'idle'
       WHERE id IN (SELECT value FROM json_each(:ids)) AND state = 'searching'
         AND id NOT IN (SELECT user_id FROM queue)`,
      { ids: JSON.stringify(ids) },
    );
  },

  async stats() {
    const ts = now();
    return get(
      `SELECT count(*) AS total,
         sum(CASE WHEN premium_until > :ts THEN 1 ELSE 0 END) AS premium,
         sum(CASE WHEN state = 'chatting' THEN 1 ELSE 0 END) AS chatting,
         sum(CASE WHEN last_seen_at > :day THEN 1 ELSE 0 END) AS dau,
         sum(CASE WHEN last_seen_at > :month THEN 1 ELSE 0 END) AS mau,
         sum(CASE WHEN gender = 'm' THEN 1 ELSE 0 END) AS males,
         sum(CASE WHEN gender = 'f' THEN 1 ELSE 0 END) AS females
       FROM users`,
      { ts, day: ts - 86400, month: ts - 30 * 86400 },
    );
  },

  list(where, params) {
    return all(`SELECT * FROM users WHERE ${where}`, params);
  },

  /** Admin ro'yxati uchun eng yangi foydalanuvchilarni sahifalab oladi. */
  page(limit = 10, offset = 0) {
    return all(
      `SELECT id, first_name, username, gender, age, state, banned, premium_until, created_at
       FROM users ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset`,
      { limit, offset },
    );
  },
};

export const isPremium = (user, ts = now()) => !!user && user.premium_until > ts;
