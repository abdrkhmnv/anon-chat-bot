// handlers/pre_checkout_query.js — platforma har bir `pre_checkout_query` update'ida chaqiradi (PreCheckoutQuery).
// Hamma mantiq lib/ ichida; bu fayl faqat yadroga uzatadi.
import { bot } from '../lib/app.js';

export default function (payload, ctx) {
  return bot.handle('pre_checkout_query', payload, ctx);
}
