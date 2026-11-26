// plugins/report.js — suhbatdoshdan shikoyat qilish va avtomatik bloklash.

import { config } from '../config.js';
import { usersRepo } from '../repo/users.js';
import { chatsRepo, otherSide } from '../repo/chats.js';
import { reportsRepo } from '../repo/reports.js';
import { inline, btn, RED } from '../core/keyboards.js';

const REASONS = ['spam', 'abuse', 'adult', 'other'];

export default {
  name: 'report',
  setup(bot) {
    const reasonsKb = (ctx, chatId) => inline(
      REASONS.map((r) => [btn(ctx.t(`report.reason.${r}`), `repr:${chatId}:${r}`, RED)]),
    );

    // /report — joriy yoki oxirgi suhbat bo'yicha.
    bot.command('report', async (ctx) => {
      const chat = ctx.user.chat_id ? await chatsRepo.get(ctx.user.chat_id) : await chatsRepo.lastOf(ctx.user.id);
      if (!chat) return ctx.reply(ctx.t('report.nothing'));
      return ctx.reply(ctx.t('report.ask'), { reply_markup: reasonsKb(ctx, chat.id) });
    });

    // "⚠️ Shikoyat qilish" tugmasi (suhbat tugagach chiqadi).
    bot.action('rep', async (ctx) => {
      await ctx.answer();
      return ctx.edit(ctx.t('report.ask'), { reply_markup: reasonsKb(ctx, Number(ctx.args[0])) });
    });

    bot.action('repr', async (ctx) => {
      const [chatIdRaw, reason] = ctx.args;
      const chat = await chatsRepo.get(Number(chatIdRaw));
      const me = ctx.user.id;
      if (!chat || (chat.user_a !== me && chat.user_b !== me) || !REASONS.includes(reason)) {
        return ctx.answer(ctx.t('report.nothing'));
      }
      if (await reportsRepo.exists(me, chat.id)) return ctx.answer(ctx.t('report.dup'), true);

      const target = otherSide(chat, me);
      await reportsRepo.add({ chatId: chat.id, reporterId: me, targetId: target, reason });
      const count = await usersRepo.addReport(target);
      await bot.emit('report:created', { chat, reporterId: me, targetId: target, reason, count });

      if (count >= config.autoBanReports) {
        await bot.services.admin?.ban(target);
      }
      await ctx.answer();
      return ctx.edit(ctx.t('report.done'));
    });
  },
};
