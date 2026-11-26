// plugins/broadcast.js — ommaviy xabar (faqat adminlar uchun).
// Xabarga reply qilib: /broadcast [all|vip|free|m|f] → "✅ Yuborish".
// /bcstatus, /bcpause, /bcresume, /bccancel
// Cron yo'q: bo'laklarni tasdiqlash handleri va keyin har bir kelgan update yuboradi.

import { api, BotApiError } from 'sdk';
import { config, isAdmin } from '../config.js';
import { run, get, all, now } from '../core/db.js';
import { inline, btn } from '../core/keyboards.js';

const AUDIENCES = {
  all:     '1 = 1',
  vip:     'premium_until > :ts',
  premium: 'premium_until > :ts', // eski nom
  free:    'premium_until <= :ts',
  m:       "gender = 'm'",
  f:       "gender = 'f'",
};
const AUDIENCE_TITLES = { all: 'hamma', vip: 'VIP', premium: 'VIP', free: 'oddiy', m: 'yigitlar', f: 'qizlar' };
const audienceSql = (a) => `banned = 0 AND ${AUDIENCES[a] || AUDIENCES.all}`;

const sleep = (ms) => (typeof setTimeout === 'function'
  ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

const repo = {
  get: (id) => get('SELECT * FROM broadcasts WHERE id = :id', { id }),
  active: () => get("SELECT * FROM broadcasts WHERE status = 'running' ORDER BY id LIMIT 1"),
  latest: () => get('SELECT * FROM broadcasts ORDER BY id DESC LIMIT 1'),

  async create({ adminId, fromChatId, messageId, audience }) {
    const total = await get(`SELECT count(*) AS c FROM users WHERE ${audienceSql(audience)}`, { ts: now() });
    const res = await run(
      `INSERT INTO broadcasts (admin_id, from_chat_id, message_id, audience, total, created_at)
       VALUES (:adminId, :fromChatId, :messageId, :audience, :total, :ts) RETURNING *`,
      { adminId, fromChatId, messageId, audience, total: total.c, ts: now() },
    );
    return res.rows[0];
  },

  async setStatus(id, status, fromStatuses) {
    const allowed = fromStatuses.map((s) => `'${s}'`).join(', ');
    const res = await run(
      `UPDATE broadcasts SET status = :status,
         finished_at = CASE WHEN :status IN ('done', 'cancelled') THEN :ts ELSE finished_at END
       WHERE id = :id AND status IN (${allowed}) RETURNING *`,
      { id, status, ts: now() },
    );
    return res.rows?.[0] ?? null;
  },

  // Keyingi bo'lakni atomar band qiladi; bo'lak qolmasa status = 'done'.
  async claimChunk(b, minGapMs) {
    const nowMs = Date.now();
    const res = await run(
      `UPDATE broadcasts SET
         prev_cursor = cursor_id,
         cursor_id = coalesce((
           SELECT max(id) FROM (
             SELECT id FROM users WHERE id > broadcasts.cursor_id AND ${audienceSql(b.audience)}
             ORDER BY id LIMIT :n)), cursor_id),
         status = CASE WHEN NOT EXISTS (
             SELECT 1 FROM users WHERE id > broadcasts.cursor_id AND ${audienceSql(b.audience)})
           THEN 'done' ELSE status END,
         finished_at = CASE WHEN NOT EXISTS (
             SELECT 1 FROM users WHERE id > broadcasts.cursor_id AND ${audienceSql(b.audience)})
           THEN :tsSec ELSE finished_at END,
         last_tick = :nowMs
       WHERE id = :id AND status = 'running' AND last_tick <= :since
       RETURNING *`,
      { id: b.id, n: config.broadcast.chunkSize, nowMs, since: nowMs - minGapMs, ts: now(), tsSec: now() },
    );
    return res.rows?.[0] ?? null;
  },

  chunkUsers(b) {
    return all(
      `SELECT id, state FROM users
       WHERE id > :from AND id <= :to AND ${audienceSql(b.audience)} ORDER BY id`,
      { from: b.prev_cursor, to: b.cursor_id, ts: now() },
    );
  },

  addCounts(id, sent, failed) {
    return run('UPDATE broadcasts SET sent = sent + :sent, failed = failed + :failed WHERE id = :id',
      { id, sent, failed });
  },
};

function statusText(b) {
  const pct = b.total ? Math.min(100, Math.round(((b.sent + b.failed) / b.total) * 100)) : 100;
  return `📢 Broadcast #${b.id} — <b>${b.status}</b>\n`
    + `Auditoriya: ${AUDIENCE_TITLES[b.audience] || b.audience}\n`
    + `Yuborildi: ${b.sent}  ·  Yetib bormadi: ${b.failed}  ·  Jami: ${b.total}  (${pct}%)`;
}

async function sendOne(b, user) {
  const extra = config.broadcast.paid ? { allow_paid_broadcast: true } : {};
  const copy = () => api.copyMessage({ chat_id: user.id, from_chat_id: b.from_chat_id, message_id: b.message_id, ...extra });
  try {
    if (user.state === 'chatting') {
      await api.sendMessage({ chat_id: user.id, text: '📢 <b>Bot xabari:</b>', parse_mode: 'HTML', ...extra });
    }
    await copy();
    return true;
  } catch (e) {
    if (e instanceof BotApiError && e.code === 429) {
      await sleep(Math.min(Number(e.parameters?.retry_after) || 1, 5) * 1000);
      try { await copy(); return true; } catch (_) { return false; }
    }
    if (e instanceof BotApiError) return false;
    throw e;
  }
}

async function tick(b, minGapMs) {
  const claimed = await repo.claimChunk(b, minGapMs);
  if (!claimed) return false;
  if (claimed.cursor_id !== claimed.prev_cursor) {
    const users = await repo.chunkUsers(claimed);
    const results = await Promise.all(users.map((u) => sendOne(claimed, u)));
    const sent = results.filter(Boolean).length;
    await repo.addCounts(claimed.id, sent, results.length - sent);
  }
  if (claimed.status === 'done') {
    const fin = await repo.get(claimed.id);
    await api.sendMessage({ chat_id: fin.admin_id, text: `✅ Tugadi.\n${statusText(fin)}`, parse_mode: 'HTML' })
      .catch(() => {});
    return false;
  }
  return true;
}

export default {
  name: 'broadcast',
  setup(bot) {
    const admin = (fn) => (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : ctx.reply(ctx.t('menu.main')));
    let nextCheckAt = 0;
    let activeId = null;

    async function runLoop(id, seconds) {
      const until = Date.now() + seconds * 1000;
      while (Date.now() < until) {
        const b = await repo.get(id);
        if (!b || b.status !== 'running') return;
        await tick(b, config.broadcast.intervalMs);
        if (typeof setTimeout !== 'function') return;
        await sleep(config.broadcast.intervalMs);
      }
    }

    // Har update'dan keyin: faol broadcast bo'lsa — bitta bo'lak.
    bot.after(async () => {
      const t = Date.now();
      if (!activeId && t < nextCheckAt) return;
      if (!activeId) {
        nextCheckAt = t + 15000;
        const b = await repo.active();
        if (!b) return;
        activeId = b.id;
      }
      const b = await repo.get(activeId);
      if (!b || b.status !== 'running') { activeId = null; return; }
      await tick(b, config.broadcast.intervalMs);
    });

    bot.command('broadcast', admin(async (ctx) => {
      const src = ctx.message.reply_to_message;
      if (!src) {
        return ctx.reply('Xabaringizni botga yuboring, so\'ng unga reply qilib <code>/broadcast</code> yozing.\n'
          + 'Filtrlar: <code>all</code>, <code>vip</code>, <code>free</code>, <code>m</code>, <code>f</code>');
      }
      const audience = (ctx.args[0] || 'all').toLowerCase();
      if (!AUDIENCES[audience]) return ctx.reply('Noma\'lum filtr. Mumkin: all, vip, free, m, f');
      const running = await repo.active();
      if (running) return ctx.reply(`Avval joriy broadcastni tugating:\n${statusText(running)}`);

      const b = await repo.create({ adminId: ctx.from.id, fromChatId: ctx.chatId, messageId: src.message_id, audience });
      await ctx.reply('👇 Oldindan ko\'rish:');
      await api.copyMessage({ chat_id: ctx.chatId, from_chat_id: ctx.chatId, message_id: src.message_id });
      return ctx.reply(`Bu xabar <b>${b.total}</b> ta foydalanuvchiga (${AUDIENCE_TITLES[audience]}) yuboriladi.`,
        { reply_markup: inline([[btn('✅ Yuborish', `bc:go:${b.id}`), btn('❌ Bekor', `bc:no:${b.id}`)]]) });
    }));

    bot.action('bc', async (ctx) => {
      if (!isAdmin(ctx.from.id)) return ctx.answer();
      const [op, idRaw] = ctx.args;
      const id = Number(idRaw);
      if (op === 'no') {
        await repo.setStatus(id, 'cancelled', ['draft']);
        await ctx.answer();
        return ctx.edit('❌ Bekor qilindi.');
      }
      if (op === 'go') {
        if (await repo.active()) return ctx.answer('Boshqa broadcast ketmoqda', true);
        const b = await repo.setStatus(id, 'running', ['draft']);
        if (!b) return ctx.answer('Allaqachon boshlangan yoki bekor qilingan', true);
        activeId = b.id;
        await ctx.answer('Boshlandi');
        await ctx.edit(`🚀 Yuborish boshlandi. Holat: /bcstatus\n${statusText(b)}`);
        await runLoop(b.id, config.broadcast.adminLoopSec);
      }
    });

    bot.command('bcstatus', admin(async (ctx) => {
      const b = (await repo.active()) || (await repo.latest());
      return ctx.reply(b ? statusText(b) : 'Hali broadcast bo\'lmagan.');
    }));

    bot.command('bcpause', admin(async (ctx) => {
      const b = await repo.active();
      if (!b) return ctx.reply('Faol broadcast yo\'q.');
      const r = await repo.setStatus(b.id, 'paused', ['running']);
      activeId = null;
      return ctx.reply(r ? `⏸ To'xtatildi.\n${statusText(r)}` : 'Bo\'lmadi.');
    }));

    bot.command('bcresume', admin(async (ctx) => {
      const last = await repo.latest();
      if (!last || last.status !== 'paused') return ctx.reply('To\'xtatilgan broadcast yo\'q.');
      const r = await repo.setStatus(last.id, 'running', ['paused']);
      if (!r) return ctx.reply('Bo\'lmadi.');
      activeId = r.id;
      await ctx.reply(`▶️ Davom etmoqda.\n${statusText(r)}`);
      await runLoop(r.id, config.broadcast.adminLoopSec);
    }));

    bot.command('bccancel', admin(async (ctx) => {
      const last = await repo.latest();
      const r = last && await repo.setStatus(last.id, 'cancelled', ['draft', 'running', 'paused']);
      activeId = null;
      return ctx.reply(r ? `🛑 Bekor qilindi.\n${statusText(r)}` : 'Bekor qiladigan broadcast yo\'q.');
    }));
  },
};
