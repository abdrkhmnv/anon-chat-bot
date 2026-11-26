// plugins/settings.js — /settings: jins va yoshni ko'rish va o'zgartirish.

import { config } from '../config.js';
import { usersRepo } from '../repo/users.js';
import { inline, btn, menuFor } from '../core/keyboards.js';
import { genderKeyboard, parseAge } from './registration.js';

export default {
  name: 'settings',
  setup(bot) {
    function show(ctx) {
      return ctx.reply(ctx.t('settings.text'), {
        reply_markup: inline([
          [btn(ctx.t('settings.btn_gender'), 'set:gender')],
          [btn(ctx.t('settings.btn_age'), 'set:age')],
        ]),
      });
    }

    bot.command('settings', show);

    async function onAction(ctx) {
      await ctx.answer();
      if (ctx.user.state !== 'idle') return ctx.reply(ctx.t('settings.busy'));
      const [what, value] = ctx.args;
      if (what === 'age') {
        await usersRepo.update(ctx.user.id, { step: 'set_age' });
        return ctx.reply(ctx.t('reg.ask_age', { min: config.minAge, max: config.maxAge }));
      }
      if (what === 'gender' && !value) {
        return ctx.reply(ctx.t('reg.ask_gender'), { reply_markup: genderKeyboard(ctx, 'set:gender') });
      }
      if (what === 'gender' && (value === 'm' || value === 'f')) {
        await usersRepo.update(ctx.user.id, { gender: value });
        ctx.user.gender = value;
        await ctx.edit(ctx.t('settings.saved'));
        return show(ctx);
      }
    }
    bot.action('set', onAction);
    bot.action('prof', onAction); // eski /profile xabarlaridagi tugmalar uchun

    // Yoshni yozish bosqichi.
    bot.on('message', async (ctx, next) => {
      const step = ctx.user?.step;
      if ((step !== 'set_age' && step !== 'prof_age') || !ctx.text || ctx.text.startsWith('/')) return next();
      const age = parseAge(ctx.text);
      if (!age) return ctx.reply(ctx.t('reg.bad_age', { min: config.minAge, max: config.maxAge }));
      await usersRepo.update(ctx.user.id, { age, step: null });
      ctx.user.age = age;
      await ctx.reply(ctx.t('settings.saved'), { reply_markup: menuFor(ctx.user) });
      return show(ctx);
    });
  },
};
