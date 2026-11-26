// plugins/help.js — /terms, /paysupport (Telegram to'lov qoidalari talabi), /menu
// va tanilmagan xabarlarga javob.

import { config } from '../config.js';
import { menuFor } from '../core/keyboards.js';
import { searchingText } from '../services/matchmaking.js';

export default {
  name: 'info',
  setup(bot) {
    bot.command('terms', (ctx) => ctx.reply(ctx.t('terms.text', { minAge: config.minAge })));
    bot.command('paysupport', (ctx) => ctx.reply(ctx.t('paysupport.text', {
      support: config.supportContact, id: ctx.user.id,
    })));
    bot.command('menu', (ctx) => ctx.reply(ctx.t('menu.main'), { reply_markup: menuFor(ctx.user) }));
  },
};

/** Eng oxirgi plagin: hech kim ushlamagan xabarga bosh menyu. */
export const fallback = {
  name: 'fallback',
  setup(bot) {
    bot.on('message', async (ctx) => {
      if (ctx.user?.state === 'searching') {
        return ctx.reply(await searchingText(ctx.user), { reply_markup: menuFor(ctx.user) });
      }
      return ctx.reply(ctx.t('menu.main'), { reply_markup: menuFor(ctx.user) });
    });
  },
};
