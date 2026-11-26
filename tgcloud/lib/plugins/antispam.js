// plugins/antispam.js — suhbatda havola, @username, telefon raqam va kontakt yuborishni to'sadi.
// O'chirish: config.antispam = false.

import { config } from '../config.js';

const BLOCKED_ENTITIES = new Set(['url', 'text_link', 'mention', 'text_mention', 'phone_number', 'email']);
const LINK_RE = /(https?:\/\/|www\.|t\.me\/|telegram\.(me|dog)\/|tg:\/\/|\b[a-z0-9-]{2,}\.(com|uz|ru|org|net|me|io|app|info|xyz|link|site|online|shop|pro)\b)/i;
const MENTION_RE = /(^|[^\w])@[a-z][\w]{3,}/i;

/** 9 va undan ko'p raqamdan iborat ketma-ketlik (orasida bo'sh joy, -, (, ) bo'lishi mumkin). */
function hasPhone(text) {
  const runs = text.match(/\+?\d[\d\s\-().]{6,}\d/g) || [];
  return runs.some((r) => r.replace(/\D/g, '').length >= 9);
}

export function containsContact(msg) {
  if (!msg) return false;
  if (msg.contact) return true;
  const entities = [...(msg.entities || []), ...(msg.caption_entities || [])];
  if (entities.some((e) => BLOCKED_ENTITIES.has(e.type))) return true;
  const text = `${msg.text || ''} ${msg.caption || ''}`;
  if (!text.trim()) return false;
  return LINK_RE.test(text) || MENTION_RE.test(text) || hasPhone(text);
}

export default {
  name: 'antispam',
  setup(bot) {
    bot.onEvent('relay:before', async ({ ctx }) => {
      if (config.antispam === false) return;
      if (!containsContact(ctx.message)) return;
      ctx.state.blockRelay = true;
      await ctx.reply(ctx.t('chat.blocked_contact'));
    });
  },
};
