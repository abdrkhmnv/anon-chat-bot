// plugins/admin.js — administrator buyruqlari (config.adminIds dagilar uchun).
//   /stats                — statistika
//   /ban <id>, /unban <id>
//   /grant <id> <kun>     — qo'lda VIP
//   /refund <charge_id>   — Stars to'lovini qaytarish
//   /user <id>            — foydalanuvchi ma'lumoti
//   /users [sahifa]       — barcha foydalanuvchilar (10 tadan)

import { isAdmin } from '../config.js';
import { usersRepo } from '../repo/users.js';
import { queueRepo } from '../repo/queue.js';
import { chatsRepo } from '../repo/chats.js';
import { paymentsRepo } from '../repo/payments.js';
import { formatDate } from '../services/premium.js';
import { btn, BLUE } from '../core/keyboards.js';

export default {
  name: 'admin',
  setup(bot) {
    async function ban(userId) {
      const u = await usersRepo.get(userId);
      if (!u) return false;
      await bot.services.match.detach(u, 'ban');
      await usersRepo.update(userId, { banned: 1 });
      await bot.emit('user:banned', { userId });
      return true;
    }
    bot.service('admin', { ban });

    const admin = (fn) => (ctx) => (isAdmin(ctx.from.id) ? fn(ctx) : ctx.reply(ctx.t('menu.main')));
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const pre = (s) => `<pre>${esc(s)}</pre>`;

    bot.command('stats', admin(async (ctx) => {
      const [u, q, c, p] = await Promise.all([
        usersRepo.stats(), queueRepo.stats(), chatsRepo.stats(), paymentsRepo.stats(),
      ]);
      return ctx.reply(pre(
        `Foydalanuvchilar: ${u.total} (👨 ${u.males ?? 0} / 👩 ${u.females ?? 0})\n`
        + `DAU: ${u.dau ?? 0}   MAU: ${u.mau ?? 0}\n`
        + `VIP: ${u.premium ?? 0}\n`
        + `Navbatda: ${q.total} (👨 ${q.males ?? 0} / 👩 ${q.females ?? 0})\n`
        + `Faol suhbatlar: ${c.active ?? 0}   Bugun: ${c.today ?? 0}   Jami: ${c.total}\n`
        + `To'lovlar: ${p.total}   ⭐ jami: ${p.stars}   ⭐ 30 kun: ${p.stars30}`,
      ));
    }));

    bot.command('ban', admin(async (ctx) => {
      const ok = await ban(Number(ctx.args[0]));
      return ctx.reply(ok ? '✅ banned' : '❌ not found');
    }));

    bot.command('unban', admin(async (ctx) => {
      await usersRepo.update(Number(ctx.args[0]), { banned: 0, reports: 0 });
      return ctx.reply('✅ unbanned');
    }));

    bot.command('grant', admin(async (ctx) => {
      const [id, days] = ctx.args.map(Number);
      if (!id || !days) return ctx.reply('/grant <user_id> <kun>');
      const until = await bot.services.premium.grant(id, days);
      return ctx.reply(until ? `✅ ${formatDate(until)} gacha` : '❌ not found');
    }));

    bot.command('refund', admin(async (ctx) => {
      if (!ctx.args[0]) return ctx.reply('/refund <telegram_payment_charge_id>');
      const r = await bot.services.premium.refund(ctx.args[0]);
      return ctx.reply(r.ok ? `✅ refunded ${r.payment.amount} ⭐ → ${r.payment.user_id}` : `❌ ${r.reason}`);
    }));

    bot.command('user', admin(async (ctx) => {
      const u = await usersRepo.get(Number(ctx.args[0]));
      if (!u) return ctx.reply('❌ not found');
      const pays = await paymentsRepo.ofUser(u.id, 5);
      return ctx.reply(pre(JSON.stringify({ ...u, payments: pays.map((p) => `${p.plan_id} ${p.amount}⭐ ${p.charge_id}${p.refunded ? ' (refunded)' : ''}`) }, null, 1)));
    }));

    const USERS_PER_PAGE = 10;
    const usersPage = async (ctx, requestedPage = 1, edit = false) => {
      const total = Number((await usersRepo.stats()).total || 0);
      const pages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
      const page = Math.min(pages, Math.max(1, Number(requestedPage) || 1));
      const rows = await usersRepo.page(USERS_PER_PAGE, (page - 1) * USERS_PER_PAGE);
      const lines = rows.map((u, i) => {
        const name = esc(u.first_name || 'Ism yo\'q');
        const username = u.username ? `@${esc(u.username)}` : 'username yo\'q';
        const gender = u.gender === 'm' ? '👨' : u.gender === 'f' ? '👩' : '—';
        const state = u.banned ? '🚫 bloklangan' : u.state === 'chatting' ? '💬 suhbatda' : u.state === 'searching' ? '🔎 qidirmoqda' : '🟢 faol';
        const premium = Number(u.premium_until) > Math.floor(Date.now() / 1000) ? ' 💎 VIP' : '';
        return `${(page - 1) * USERS_PER_PAGE + i + 1}. <b>${name}</b>${premium}\n   ID: <code>${u.id}</code> · ${username}\n   ${gender}${u.age ? ` ${u.age} yosh` : ''} · ${state}`;
      });
      const text = `👥 <b>Foydalanuvchilar</b>\nJami: <b>${total}</b> · Sahifa: <b>${page}/${pages}</b>\n\n${lines.length ? lines.join('\n\n') : 'Hozircha foydalanuvchi yo\'q.'}`;
      const keyboard = [];
      if (page > 1 || page < pages) {
        const nav = [];
        if (page > 1) nav.push(btn('⬅️ Oldingi', `adminusers:${page - 1}`, BLUE));
        if (page < pages) nav.push(btn('Keyingi ➡️', `adminusers:${page + 1}`, BLUE));
        keyboard.push(nav);
      }
      const extra = keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {};
      return edit ? ctx.edit(text, extra) : ctx.reply(text, extra);
    };

    bot.command('users', admin((ctx) => usersPage(ctx, ctx.args[0] || 1)));
    bot.action('adminusers', async (ctx) => {
      if (!isAdmin(ctx.from.id)) return ctx.answer('Ruxsat yo\'q', true);
      await ctx.answer();
      return usersPage(ctx, ctx.args[0] || 1, true);
    });
  },
};
