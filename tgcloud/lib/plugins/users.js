// plugins/users.js — asosiy plagin: foydalanuvchini yuklash, faqat shaxsiy chat,
// bloklanganlarni to'xtatish, botni bloklaganlarni suhbatdan chiqarish.

import { config } from '../config.js';
import { usersRepo } from '../repo/users.js';
import { resolveLang } from '../core/i18n.js';

export default {
  name: 'users',
  setup(bot) {
    bot.loadUser = (from) => usersRepo.touch(from, resolveLang(from.language_code));

    // Guruh/kanallarda ishlamaymiz (to'lov so'rovlari bundan mustasno).
    bot.use(async (ctx, next) => {
      if (ctx.type === 'pre_checkout_query' || ctx.type === 'my_chat_member') return next();
      if (!ctx.isPrivate || !ctx.from || ctx.from.is_bot) return;
      return next();
    });

    // Bloklangan foydalanuvchi.
    bot.use(async (ctx, next) => {
      if (ctx.user?.banned && ctx.type !== 'pre_checkout_query') {
        if (ctx.type === 'callback_query') return ctx.answer(ctx.t('error.banned', { support: config.supportContact }), true);
        if (ctx.type === 'message') return ctx.reply(ctx.t('error.banned', { support: config.supportContact }));
        return;
      }
      return next();
    });

    // Foydalanuvchi botni bloklasa — suhbat va navbatdan chiqaramiz.
    bot.on('my_chat_member', async (ctx, next) => {
      const status = ctx.payload.new_chat_member?.status;
      if (ctx.payload.chat?.type === 'private' && status === 'kicked' && ctx.user) {
        await bot.services.match.detach(ctx.user, 'unavailable');
      }
      return next();
    });
  },
};
