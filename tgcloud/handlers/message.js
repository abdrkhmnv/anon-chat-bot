// handlers/message.js — platforma har bir `message` update'ida chaqiradi (Message).
// Hamma mantiq lib/ ichida; bu fayl faqat yadroga uzatadi.
import { bot } from '../lib/app.js';

export default function (payload, ctx) {
  return bot.handle('message', payload, ctx);
}
