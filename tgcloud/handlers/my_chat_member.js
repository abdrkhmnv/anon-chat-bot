// handlers/my_chat_member.js — platforma har bir `my_chat_member` update'ida chaqiradi (ChatMemberUpdated).
// Hamma mantiq lib/ ichida; bu fayl faqat yadroga uzatadi.
import { bot } from '../lib/app.js';

export default function (payload, ctx) {
  return bot.handle('my_chat_member', payload, ctx);
}
