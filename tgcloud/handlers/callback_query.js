// handlers/callback_query.js — platforma har bir `callback_query` update'ida chaqiradi (CallbackQuery).
// Hamma mantiq lib/ ichida; bu fayl faqat yadroga uzatadi.
import { bot } from '../lib/app.js';

export default function (payload, ctx) {
  return bot.handle('callback_query', payload, ctx);
}
