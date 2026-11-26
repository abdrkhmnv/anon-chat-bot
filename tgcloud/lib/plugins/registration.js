// plugins/registration.js — /start va ro'yxatdan o'tish (jins + yosh).
// Jins va yosh hamma uchun so'raladi: premium foydalanuvchilar jins bo'yicha
// qidira olishi uchun har bir foydalanuvchining jinsi ma'lum bo'lishi kerak.

import { config } from '../config.js';
import { usersRepo } from '../repo/users.js';
import { menuFor, inline, btn, BLUE, RED } from '../core/keyboards.js';

export const genderKeyboard = (ctx, prefix = 'reg:g') => inline([[
  btn('👨 ' + ctx.t('gender.m'), `${prefix}:m`, BLUE),
  btn('👩 ' + ctx.t('gender.f'), `${prefix}:f`, RED),
]]);

// Ro'yxatdan o'tmasdan ham ishlaydigan buyruqlar.
const ALWAYS_ALLOWED = ['start', 'help', 'terms', 'paysupport'];

export function isRegistered(user) {
  return !!(user && user.gender && user.age);
}

async function askAge(ctx) {
  await usersRepo.update(ctx.user.id, { step: 'reg_age' });
  ctx.user.step = 'reg_age';
  return ctx.reply(ctx.t('reg.ask_age', { min: config.minAge, max: config.maxAge }),
    { reply_markup: { remove_keyboard: true } });
}

export function parseAge(text) {
  const n = Number(String(text || '').trim());
  if (!Number.isInteger(n) || n < config.minAge || n > config.maxAge) return null;
  return n;
}

export default {
  name: 'registration',
  setup(bot) {
    bot.command('start', async (ctx) => {
      // /start <payload> — deep-link (masalan referal plagin uchun)
      await bot.emit('start', { ctx, payload: ctx.args[0] || null });
      if (!ctx.user.gender) {
        return ctx.reply(ctx.t('reg.welcome'), { reply_markup: genderKeyboard(ctx) });
      }
      if (!ctx.user.age) return askAge(ctx);
      return ctx.reply(ctx.t('menu.main'), { reply_markup: menuFor(ctx.user) });
    });

    bot.action('reg', async (ctx) => {
      const [field, value] = ctx.args;
      if (field === 'g' && (value === 'm' || value === 'f')) {
        if (ctx.user.gender && ctx.user.age) return ctx.answer(); // allaqachon ro'yxatdan o'tgan
        await usersRepo.update(ctx.user.id, { gender: value });
        ctx.user.gender = value;
        await ctx.answer();
        await ctx.edit(`${ctx.t('reg.ask_gender')} ${value === 'm' ? '👨' : '👩'} ${ctx.t(`gender.${value}`)}`);
        if (!ctx.user.age) return askAge(ctx);
        return ctx.reply(ctx.t('reg.done'), { reply_markup: menuFor(ctx.user) });
      }
      return ctx.answer();
    });

    // Ro'yxatdan o'tmagan foydalanuvchini boshqa joyga o'tkazmaymiz.
    bot.use(async (ctx, next) => {
      if (ctx.type !== 'message' && ctx.type !== 'callback_query') return next();
      if (ctx.type === 'message' && ctx.message?.successful_payment) return next();
      if (isRegistered(ctx.user)) return next();

      const text = ctx.text;
      const cmd = text.startsWith('/') ? text.slice(1).split(/[\s@]/)[0].toLowerCase() : null;
      if (cmd && ALWAYS_ALLOWED.includes(cmd)) return next();
      if (ctx.type === 'callback_query' && (ctx.payload.data || '').startsWith('reg:')) return next();

      if (ctx.type === 'message' && ctx.user.step === 'reg_age' && ctx.user.gender) {
        const age = parseAge(text);
        if (!age) return ctx.reply(ctx.t('reg.bad_age', { min: config.minAge, max: config.maxAge }));
        await usersRepo.update(ctx.user.id, { age, step: null });
        ctx.user.age = age;
        ctx.user.step = null;
        await bot.emit('user:registered', { user: ctx.user });
        return ctx.reply(ctx.t('reg.done'), { reply_markup: menuFor(ctx.user) });
      }

      if (ctx.type === 'callback_query') await ctx.answer();
      if (!ctx.user.gender) return ctx.reply(ctx.t('reg.ask_gender'), { reply_markup: genderKeyboard(ctx) });
      return askAge(ctx);
    });
  },
};
