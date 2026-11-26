// plugins/chat.js — qidiruv buyruqlari va suhbatdagi xabarlarni uzatish.

import { menuFor } from '../core/keyboards.js';
import { createMatchmaking } from '../services/matchmaking.js';

export default {
  name: 'chat',
  setup(bot) {
    const match = createMatchmaking(bot);
    bot.service('match', match);

    // Jim suhbatlarni yopish: har qanday update'dan keyin (daqiqada ko'pi bilan bir marta).
    bot.after(() => match.sweepIdle());

    async function doSearch(ctx, want) {
      const res = await match.search(ctx.user, want);
      if (res.status === 'chatting') return ctx.reply(ctx.t('search.already_chatting'));
      if (res.status === 'premium_only') return bot.services.premiumUi.offer(ctx, 'search.premium_only');
      return res;
    }

    bot.hears('btn.search', (ctx) => doSearch(ctx, 'any'));
    bot.command(['girl', 'girls'], (ctx) => doSearch(ctx, 'f'));
    bot.hears('btn.search_f', (ctx) => doSearch(ctx, 'f'));
    bot.command(['boy', 'boys'], (ctx) => doSearch(ctx, 'm'));
    bot.hears('btn.search_m', (ctx) => doSearch(ctx, 'm'));

    const stop = async (ctx) => {
      const r = await match.stop(ctx.user);
      if (r === 'cancelled') return ctx.reply(ctx.t('search.cancelled'), { reply_markup: menuFor(ctx.user, 'idle') });
      if (r === 'idle') return ctx.reply(ctx.t('search.not_searching'), { reply_markup: menuFor(ctx.user, 'idle') });
    };
    bot.command(['stop', 'cancel'], stop);
    bot.hears('btn.stop', stop);
    bot.hears('btn.cancel', stop);

    // /next suhbatni TUGATMAYDI: suhbat davomida avval /stop bosish kerak.
    // Suhbat tugagach (yoki suhbat bo'lmasa) — yangi muloqotchi qidiradi.
    const next = async (ctx) => {
      if (ctx.user.state === 'chatting') return ctx.reply(ctx.t('search.already_chatting'));
      const res = await match.next(ctx.user);
      if (res.status === 'chatting') return ctx.reply(ctx.t('search.already_chatting'));
    };
    bot.command(['next', 'skip'], next);
    bot.hears('btn.next', next);

    // Suhbatdagi har qanday xabar — sherikka. Bu oxirgi message-handler bo'lishi kerak,
    // shuning uchun chat plagini ro'yxatda pastroqda turadi.
    bot.on('message', async (ctx, nextFn) => {
      if (ctx.user?.state === 'chatting' && ctx.user.partner_id) {
        // Noma'lum buyruq (masalan eski /search) sherikka uzatilmaydi.
        if (ctx.text.startsWith('/')) return ctx.reply(ctx.t('chat.unknown_command'));
        return match.relay(ctx);
      }
      return nextFn();
    });
  },
};
