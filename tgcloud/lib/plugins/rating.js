// plugins/rating.js — suhbatdan keyingi baho (👍/👎).
// Yomon baholi foydalanuvchilar navbatda kechroq turadi (config.badRating, badPenaltySec).

import { api } from 'sdk';
import { usersRepo } from '../repo/users.js';
import { chatsRepo, otherSide } from '../repo/chats.js';
import { ratingsRepo } from '../repo/ratings.js';
import { inline, btn } from '../core/keyboards.js';

export default {
  name: 'rating',
  setup(bot) {
    bot.action('rate', async (ctx) => {
      const [chatIdRaw, valueRaw] = ctx.args;
      const value = Number(valueRaw) > 0 ? 1 : -1;
      const chat = await chatsRepo.get(Number(chatIdRaw));
      const me = ctx.user.id;
      if (!chat || (chat.user_a !== me && chat.user_b !== me) || !chat.ended_at) return ctx.answer();

      const target = otherSide(chat, me);
      const added = await ratingsRepo.add({ chatId: chat.id, raterId: me, targetId: target, value });
      if (added) await usersRepo.addRating(target, value);
      await ctx.answer(ctx.t(added ? 'rate.thanks' : 'rate.dup'));
      await bot.emit('rating:created', { chat, raterId: me, targetId: target, value });

      // Baho tugmalarini olib tashlaymiz, shikoyat tugmasi qoladi.
      if (ctx.message) {
        await api.editMessageReplyMarkup({
          chat_id: ctx.message.chat.id, message_id: ctx.message.message_id,
          reply_markup: inline([[btn(ctx.t('btn.report'), `rep:${chat.id}`)]]),
        }).catch(() => {});
      }
    });
  },
};
