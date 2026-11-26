// plugins/profile.js — /profile: ma'lumotlarni ko'rish va o'zgartirish.

import { config } from '../config.js';
import { usersRepo, isPremium } from '../repo/users.js';
import { inline, btn, menuFor, BLUE } from '../core/keyboards.js';
import { formatDate } from '../services/premium.js';
import { genderKeyboard, parseAge } from './registration.js';

export default {
  name: 'profile',
  setup(bot) {
    function show(ctx) {
      const u = ctx.user;
      const plan = isPremium(u)
        ? ctx.t('profile.plan_premium', { until: formatDate(u.premium_until) })
        : ctx.t('profile.plan_free');
      return ctx.reply(ctx.t('profile.text', {
        gender: ctx.t(`gender.${u.gender}`), age: u.age, chats: u.chats_count, plan,
      }), {
        reply_markup: inline([
          [btn(ctx.t('profile.btn_age'), 'prof:age', BLUE), btn(ctx.t('profile.btn_gender'), 'prof:gender', BLUE)],
        ]),
      });
    }

    bot.command(['profile', 'me'], show);
    bot.hears('btn.profile', show);

    bot.action('prof', async (ctx) => {
      await ctx.answer();
      if (ctx.user.state !== 'idle') return ctx.reply(ctx.t('profile.busy'));
      const [what, value] = ctx.args;
      if (what === 'age') {
        await usersRepo.update(ctx.user.id, { step: 'prof_age' });
        return ctx.reply(ctx.t('reg.ask_age', { min: config.minAge, max: config.maxAge }));
      }
      if (what === 'gender' && !value) {
        return ctx.reply(ctx.t('reg.ask_gender'), { reply_markup: genderKeyboard(ctx, 'prof:gender') });
      }
      if (what === 'gender' && (value === 'm' || value === 'f')) {
        await usersRepo.update(ctx.user.id, { gender: value });
        ctx.user.gender = value;
        await ctx.edit(ctx.t('profile.saved'));
        return show(ctx);
      }
    });

    // Yoshni yozish bosqichi.
    bot.on('message', async (ctx, next) => {
      if (ctx.user?.step !== 'prof_age' || !ctx.text || ctx.text.startsWith('/')) return next();
      const age = parseAge(ctx.text);
      if (!age) return ctx.reply(ctx.t('reg.bad_age', { min: config.minAge, max: config.maxAge }));
      await usersRepo.update(ctx.user.id, { age, step: null });
      ctx.user.age = age;
      await ctx.reply(ctx.t('profile.saved'), { reply_markup: menuFor(ctx.user) });
    });
  },
};
