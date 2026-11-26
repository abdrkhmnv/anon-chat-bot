// plugins/premium.js — /vip (VIP tariflar), tarif tanlash, Stars to'lovi.
// Ichki nomlar (premium.*, premium_until) eski holicha; foydalanuvchiga hammasi "VIP" deb ko'rinadi.

import { config } from '../config.js';
import { isPremium } from '../repo/users.js';
import { inline, btn, menuFor, GREEN } from '../core/keyboards.js';
import { createPremium, formatDate } from '../services/premium.js';

export default {
  name: 'premium',
  setup(bot) {
    const premium = createPremium(bot);
    bot.service('premium', premium);

    function plansKeyboard(ctx) {
      const rows = [];
      const plans = config.plans;
      for (let i = 0; i < plans.length; i += 2) {
        rows.push(plans.slice(i, i + 2).map((p) => btn(
          ctx.t('premium.plan_btn', { title: premium.planTitle(ctx.lang, p), stars: p.stars }),
          `buy:${p.id}`,
          GREEN,
        )));
      }
      return inline(rows);
    }

    async function offer(ctx, introKey) {
      if (introKey) await ctx.reply(ctx.t(introKey));
      const status = isPremium(ctx.user)
        ? ctx.t('premium.status_active', { until: formatDate(ctx.user.premium_until) })
        : ctx.t('premium.status_free');
      return ctx.reply(ctx.t('premium.text', { status }), { reply_markup: plansKeyboard(ctx) });
    }
    bot.service('premiumUi', { offer });

    bot.command(['vip', 'premium'], (ctx) => offer(ctx)); // /premium — eski foydalanuvchilar uchun yashirin alias
    bot.hears('btn.premium', (ctx) => offer(ctx));
    // Foydalanuvchida qolgan eski klaviatura tugmasi
    bot.hears((text) => text === '⭐ Premium' || text === 'Premium', (ctx) => offer(ctx));

    bot.action('buy', async (ctx) => {
      await ctx.answer();
      const ok = await premium.sendInvoice(ctx.user, ctx.args[0]);
      if (!ok) await ctx.reply(ctx.t('premium.bad_invoice'));
    });

    // 2-qadam: Telegram to'lovdan oldin so'raydi — 10 soniya ichida javob berish shart.
    bot.on('pre_checkout_query', async (ctx) => {
      const q = ctx.payload;
      const v = premium.validateCheckout(q);
      await ctx.api.answerPreCheckoutQuery(v.ok
        ? { pre_checkout_query_id: q.id, ok: true }
        : { pre_checkout_query_id: q.id, ok: false, error_message: ctx.t('premium.bad_invoice') });
    });

    // 3-qadam: to'lov muvaffaqiyatli.
    bot.on('successful_payment', async (ctx) => {
      const res = await premium.applyPayment(ctx.user, ctx.message.successful_payment);
      if (!res) return;
      await ctx.reply(ctx.t('premium.success', { until: formatDate(res.until) }),
        { reply_markup: menuFor(ctx.user) });
    });
  },
};
