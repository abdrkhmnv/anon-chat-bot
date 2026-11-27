// plugins/settings.js — /settings: jins yoki yoshni o'zgartirish.
//
// Oqim (hammasi bitta xabar ichida tahrirlanadi):
//   /settings → [Jinsimni] [Yoshimni] [Viloyatim] [Til] [Orqaga]
//     Jinsimni → [Yigit] [Qiz] [Orqaga] → tanlansa: "✅ Muvaffaqiyatli saqlandi." (menyu yopiladi)
//     Yoshimni → "Yoshingizni yozing" [Orqaga] → yozilsa: "✅ Muvaffaqiyatli saqlandi." (menyu yopiladi)
//     Orqaga   → oldingi bosqich; bosh bosqichda xabar o'chiriladi.

import { api } from 'sdk';
import { config } from '../config.js';
import { usersRepo } from '../repo/users.js';
import { inline, plainBtn as btn, menuFor } from '../core/keyboards.js'; // bu menyuda emojilar oddiy
import { regionRows } from '../core/regions.js';
import { parseAge } from './registration.js';

const AGE_STEP = 'set_age'; // step = 'set_age:<so'rov xabari id>'

export default {
  name: 'settings',
  setup(bot) {
    const back = (ctx, data) => [btn(ctx.t('settings.btn_back'), data)];
    const menuKb = (ctx) => inline([
      [btn(ctx.t('settings.btn_gender'), 'set:gender')],
      [btn(ctx.t('settings.btn_age'), 'set:age')],
      [btn(ctx.t('settings.btn_region'), 'set:region')],
      [btn(ctx.t('settings.btn_lang'), 'set:lang')],
      back(ctx, 'set:close'),
    ]);
    const genderKb = (ctx) => inline([
      [btn('👨 ' + ctx.t('gender.m'), 'set:gender:m'), btn('👩 ' + ctx.t('gender.f'), 'set:gender:f')],
      back(ctx, 'set:menu'),
    ]);
    const askAge = (ctx) => ctx.t('reg.ask_age', { min: config.minAge, max: config.maxAge });

    async function clearAgeStep(ctx) {
      const step = String(ctx.user?.step || '');
      if (step.startsWith(AGE_STEP) || step === 'prof_age') {
        await usersRepo.update(ctx.user.id, { step: null });
        ctx.user.step = null;
      }
    }

    bot.command('settings', async (ctx) => {
      await clearAgeStep(ctx);
      return ctx.reply(ctx.t('settings.text'), { reply_markup: menuKb(ctx) });
    });

    async function onAction(ctx) {
      await ctx.answer();
      const [what, value] = ctx.args;

      if (what === 'close') {
        await clearAgeStep(ctx);
        return api.deleteMessage({ chat_id: ctx.message.chat.id, message_id: ctx.message.message_id })
          .catch(() => ctx.edit(ctx.t('menu.main')));
      }
      if (what === 'menu') {
        await clearAgeStep(ctx);
        return ctx.edit(ctx.t('settings.text'), { reply_markup: menuKb(ctx) });
      }
      // Til va viloyat suhbat vaqtida ham o'zgartirilishi mumkin.
      if (what === 'lang' && !value) {
        return ctx.edit(ctx.t('settings.ask_lang'), { reply_markup: inline([
          [btn('🇺🇿 O\'zbekcha', 'set:lang:uz'), btn('🇷🇺 Русский', 'set:lang:ru')],
          back(ctx, 'set:menu'),
        ]) });
      }
      if (what === 'lang' && (value === 'uz' || value === 'ru')) {
        await usersRepo.update(ctx.user.id, { lang: value });
        ctx.user.lang = value;
        await ctx.edit(ctx.t('settings.saved'));
        // Pastki menyu tugmalari yangi tilda bo'lishi uchun menyuni qayta yuboramiz.
        return ctx.reply(ctx.t('menu.main'), { reply_markup: menuFor(ctx.user) });
      }
      if (what === 'region' && !value) {
        return ctx.edit(ctx.t('settings.ask_region'), {
          reply_markup: inline([...regionRows(ctx, 'set:region', btn), back(ctx, 'set:menu')]),
        });
      }
      if (what === 'region' && value === 'skip') return ctx.edit(ctx.t('reg.region_later'));
      if (what === 'region' && config.regions.includes(value)) {
        await usersRepo.update(ctx.user.id, { region: value });
        ctx.user.region = value;
        return ctx.edit(ctx.t('settings.saved'));
      }
      if (ctx.user.state !== 'idle') return ctx.edit(ctx.t('settings.busy'));

      if (what === 'age') {
        const step = `${AGE_STEP}:${ctx.message?.message_id ?? ''}`;
        await usersRepo.update(ctx.user.id, { step });
        return ctx.edit(askAge(ctx), { reply_markup: inline([back(ctx, 'set:menu')]) });
      }
      if (what === 'gender' && !value) {
        return ctx.edit(ctx.t('reg.ask_gender'), { reply_markup: genderKb(ctx) });
      }
      if (what === 'gender' && (value === 'm' || value === 'f')) {
        await usersRepo.update(ctx.user.id, { gender: value });
        ctx.user.gender = value;
        return ctx.edit(ctx.t('settings.saved'));
      }
    }
    bot.action('set', onAction);
    bot.action('prof', onAction); // eski /profile xabarlaridagi tugmalar uchun

    // Yosh kutilayotganda buyruq yoki menyu tugmasi kelsa — yosh kiritish bekor bo'ladi,
    // xabar esa odatdagidek ishlanadi. (Middleware: buyruq va tugmalardan oldin ishlaydi.)
    bot.use(async (ctx, next) => {
      if (ctx.type === 'message' && ctx.user?.step && !/^\d+$/.test((ctx.text || '').trim())) {
        await clearAgeStep(ctx);
      }
      return next();
    });

    // Yoshni yozish bosqichi.
    bot.on('message', async (ctx, next) => {
      const step = String(ctx.user?.step || '');
      if (!(step.startsWith(AGE_STEP) || step === 'prof_age') || !ctx.text) return next();
      const age = parseAge(ctx.text.trim());
      if (!age) return ctx.reply(ctx.t('reg.bad_age', { min: config.minAge, max: config.maxAge }));

      await usersRepo.update(ctx.user.id, { age, step: null });
      ctx.user.age = age;
      ctx.user.step = null;
      const promptId = Number(step.split(':')[1]);
      if (promptId) {
        // So'rov xabaridagi "Orqaga" tugmasini olib tashlaymiz — menyu yopiladi.
        await api.editMessageText({ chat_id: ctx.chatId, message_id: promptId, text: askAge(ctx), parse_mode: 'HTML' })
          .catch(() => {});
      }
      return ctx.reply(ctx.t('settings.saved'));
    });
  },
};
