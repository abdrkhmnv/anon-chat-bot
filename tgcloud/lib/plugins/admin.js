// plugins/admin.js — administrator buyruqlari (config.adminIds dagilar uchun).
//   /stats                — statistika
//   /ban <id>, /unban <id>
//   /grant <id> <kun>     — qo'lda VIP
//   /refund <charge_id>   — Stars to'lovini qaytarish
//   /user <id>            — foydalanuvchi ma'lumoti
//   /users [sahifa]       — barcha foydalanuvchilar (10 tadan)
//   /queue, /queuefix     — qidiruv navbatini tekshirish va tozalash
//   /setcommands          — "/" menyusidagi buyruqlarni o'rnatish (uz + ru)

import { isAdmin } from '../config.js';
import { syncCommands } from './commands.js';
import { usersRepo } from '../repo/users.js';
import { queueRepo } from '../repo/queue.js';
import { chatsRepo } from '../repo/chats.js';
import { paymentsRepo } from '../repo/payments.js';
import { formatDate } from '../services/premium.js';
import { btn, menuFor } from '../core/keyboards.js';
import { all } from '../core/db.js';
import { notify } from '../services/notify.js';

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
        if (page > 1) nav.push(btn('⬅️ Oldingi', `adminusers:${page - 1}`));
        if (page < pages) nav.push(btn('Keyingi ➡️', `adminusers:${page + 1}`));
        keyboard.push(nav);
      }
      const extra = keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {};
      return edit ? ctx.edit(text, extra) : ctx.reply(text, extra);
    };

    bot.command('users', admin((ctx) => usersPage(ctx, ctx.args[0] || 1)));

    // /queue — qidiruv navbatini tekshirish: kim navbatda, "o'lik" qidiruvlar, migratsiya holati.
    // /queuefix — o'lik qidiruvlarni (qidiruvda, lekin navbatda yo'q) va arvohlarni tozalaydi.
    async function queueReport() {
      // Migratsiya: yangi ustunlarni o'qib ko'ramiz (all — SELECT uchun), xato bo'lsa matnini ko'rsatamiz.
      let schemaError = null;
      try {
        await all('SELECT region, want_region, age_min, age_max, penalty FROM queue LIMIT 1');
        await all('SELECT region, want_region, age_min, age_max, likes, dislikes, referred_by, referrals FROM users LIMIT 1');
      } catch (e) {
        schemaError = String(e?.message || e).slice(0, 200);
      }
      const rows = schemaError ? await all(
        `SELECT q.user_id, q.gender, q.age, q.want_gender, q.premium, u.state, u.banned
         FROM queue q LEFT JOIN users u ON u.id = q.user_id ORDER BY q.created_at LIMIT 20`,
      ) : await all(
        `SELECT q.*, u.state, u.banned
         FROM queue q LEFT JOIN users u ON u.id = q.user_id ORDER BY q.created_at LIMIT 20`,
      );
      const dead = await all(
        `SELECT id FROM users WHERE state = 'searching'
         AND id NOT IN (SELECT user_id FROM queue) LIMIT 50`,
      );
      const ghosts = rows.filter((r) => r.state !== 'searching');
      return { schemaError, rows, dead, ghosts };
    }

    // Ikki navbatdagi odam nega ulanmasligi (claimPartner shartlari bilan bir xil).
    function whyNot(a, b) {
      const r = [];
      const side = (me, q, who) => {
        if (me.want_gender !== 'any' && q.gender !== me.want_gender) r.push(`${who} faqat ${me.want_gender === 'f' ? 'qiz' : 'yigit'} qidiryapti`);
        if (me.want_region && q.region !== me.want_region) r.push(`${who} filtri: viloyat ${me.want_region} (u: ${q.region || 'yo\'q'})`);
        if (me.age_min != null && q.age < me.age_min) r.push(`${who} filtri: yosh ${me.age_min}+ (u: ${q.age})`);
        if (me.age_max != null && q.age > me.age_max) r.push(`${who} filtri: yosh ≤${me.age_max} (u: ${q.age})`);
      };
      side(a, b, `<code>${a.user_id}</code>`);
      side(b, a, `<code>${b.user_id}</code>`);
      if (a.state !== 'searching' || b.state !== 'searching') r.push('biri qidirmayapti (arvoh)');
      if (a.banned || b.banned) r.push('biri bloklangan');
      return r;
    }

    bot.command('queue', admin(async (ctx) => {
      const { schemaError, rows, dead, ghosts } = await queueReport();
      const filt = (r) => [
        r.region ? `📍${r.region}` : '',
        r.want_region ? `🎯${r.want_region}` : '',
        r.age_min != null || r.age_max != null ? `🎂${r.age_min ?? ''}–${r.age_max ?? ''}` : '',
        r.penalty ? '👎' : '',
      ].filter(Boolean).join(' ');
      const lines = rows.map((r) => `• <code>${r.user_id}</code> ${r.gender}/${r.age} → ${r.want_gender}`
        + `${r.premium ? ' 💎' : ''} ${filt(r)}${r.state !== 'searching' ? ` ⚠️ (${r.state ?? 'yo\'q'})` : ''}`);
      const why = [];
      if (!schemaError) {
        for (let i = 0; i < rows.length && why.length < 5; i++) {
          for (let k = i + 1; k < rows.length && why.length < 5; k++) {
            const reasons = whyNot(rows[i], rows[k]);
            why.push(`<code>${rows[i].user_id}</code> ↔ <code>${rows[k].user_id}</code>: `
              + (reasons.length ? reasons.join('; ') : '✅ mos — keyingi qidiruvda ulanadi'));
          }
        }
      }
      return ctx.reply(
        `<b>Navbat</b>: ${rows.length} kishi\n${lines.join('\n') || '—'}\n`
        + (why.length ? `\n<b>Nega ulanmayapti:</b>\n${why.join('\n')}\n` : '')
        + `\n💀 O'lik qidiruv (qidiruvda, navbatda yo'q): <b>${dead.length}</b>\n`
        + `👻 Arvoh (navbatda, qidirmayapti): <b>${ghosts.length}</b>\n`
        + `🗄 Baza migratsiyasi: ${schemaError ? `❌ <code>${schemaError.replace(/[<>&]/g, '')}</code>` : '✅'}`
        + (dead.length || ghosts.length ? '\n\nTozalash: /queuefix' : ''),
      );
    }));

    bot.command('queuefix', admin(async (ctx) => {
      const { dead, ghosts } = await queueReport();
      for (const d of dead) {
        await usersRepo.update(d.id, { state: 'idle' });
        const u = await usersRepo.get(d.id);
        // Foydalanuvchiga: qidiruv to'xtadi, qaytadan /next bosing.
        await notify(u, 'chat.after', null, { reply_markup: menuFor(u, 'idle') }).catch(() => {});
      }
      for (const g of ghosts) await queueRepo.leave(g.user_id);
      return ctx.reply(`✅ Tozalandi: o'lik qidiruv ${dead.length}, arvoh ${ghosts.length}.`);
    }));

    // /setcommands — "/" menyusidagi buyruqlarni darhol qayta o'rnatadi (uz + ru).
    // Odatda shart emas: commands plagini deploy'dan keyin o'zi yangilaydi.
    bot.command('setcommands', admin(async (ctx) => {
      await syncCommands({ force: true });
      return ctx.reply('✅ Buyruqlar ro\'yxati yangilandi (uz + ru).');
    }));
    bot.action('adminusers', async (ctx) => {
      if (!isAdmin(ctx.from.id)) return ctx.answer('Ruxsat yo\'q', true);
      await ctx.answer();
      return usersPage(ctx, ctx.args[0] || 1, true);
    });
  },
};
