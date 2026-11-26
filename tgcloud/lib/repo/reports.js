// lib/repo/reports.js — shikoyatlar.

import { run, get, now } from '../core/db.js';

export const reportsRepo = {
  async exists(reporterId, chatId) {
    return !!(await get(
      'SELECT 1 AS x FROM reports WHERE reporter_id = :r AND chat_id = :c',
      { r: reporterId, c: chatId },
    ));
  },

  async add({ chatId, reporterId, targetId, reason }) {
    await run(
      `INSERT INTO reports (chat_id, reporter_id, target_id, reason, created_at)
       VALUES (:chatId, :reporterId, :targetId, :reason, :ts)`,
      { chatId, reporterId, targetId, reason: reason ?? null, ts: now() },
    );
  },
};
