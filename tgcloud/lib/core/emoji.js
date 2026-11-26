// lib/core/emoji.js — tugmalardagi oddiy emojilarni premium (custom) emojiga almashtirish.
//
// Bot API 9.4+ da KeyboardButton / InlineKeyboardButton `icon_custom_emoji_id` maydoniga ega.
// Ikonka tugma matnidan OLDIN ko'rsatiladi, shuning uchun matndagi oddiy emoji olib tashlanadi.
// Shart: bot egasida Telegram Premium bo'lishi kerak (yoki bot Fragment'da username sotib olgan).
//
// Barcha ID'lar https://t.me/addemoji/RestrictedEmoji to'plamidan olingan.
// O'chirib qo'yish uchun: config.premiumEmojiButtons = false (tugmalar oddiy emoji bilan qoladi).

import { config } from '../config.js';

/** Oddiy emoji -> premium emoji ID (RestrictedEmoji to'plami). */
export const BUTTON_EMOJI = {
  '🔎': '5188217332748527444', // lupa (o'ngga)
  '👩': '5190736541521025564', // ayol
  '👨': '5190498849440931467', // erkak
  '⭐': '5435957248314579621', // yulduz (Stars narxi)
  '💎': '5471952986970267163', // olmos (VIP)
  '⏭': '5471978009449731768',  // 👉 o'ngni ko'rsatuvchi qo'l
  '⛔': '5472354553527541051',  // ✋ ko'tarilgan kaft (to'xtash)
  '❌': '5465665476971471368',  // qizil X
  '⚠️': '5467928559664242360', // ❗ qizil undov belgisi (shikoyat)
  '✏️': '5334673106202010226', // qalam
  '📅': '5431897022456145283', // kalendar
  '✅': '5427009714745517609',  // yashil belgi
  '⬅️': '5469735272017043817', // 👈 chapni ko'rsatuvchi qo'l
  '➡️': '5471978009449731768', // 👉 o'ngni ko'rsatuvchi qo'l
};

const VS16 = '️';
const base = (e) => e.replace(VS16, '');
// Kalitlar VS16 (U+FE0F) bilan ham, usiz ham topilsin.
const LOOKUP = new Map(Object.entries(BUTTON_EMOJI).map(([e, id]) => [base(e), id]));
const KEYS = [...LOOKUP.keys()].sort((a, b) => b.length - a.length);

/** Matn boshidagi yoki oxiridagi tanish emojini topadi: { id, rest } yoki null. */
function split(text) {
  const s = String(text ?? '');
  // Avval boshidagi emoji (ikonka matndan oldin turadi), keyin oxiridagi.
  for (const k of KEYS) {
    for (const e of [k + VS16, k]) {
      if (s.startsWith(e + ' ')) return { id: LOOKUP.get(k), rest: s.slice(e.length + 1).trim() };
    }
  }
  for (const k of KEYS) {
    for (const e of [k + VS16, k]) {
      if (s.endsWith(' ' + e)) return { id: LOOKUP.get(k), rest: s.slice(0, -(e.length + 1)).trim() };
    }
  }
  return null;
}

/** Tugma matnidan emojini olib tashlaydi (agar u premium emojiga almashtiriladigan bo'lsa). */
export function stripButtonEmoji(text) {
  const hit = split(text);
  return hit ? hit.rest : text;
}

/** Tugma obyektiga premium emoji qo'shadi: { text, ... } -> { text (emojisiz), icon_custom_emoji_id, ... }. */
export function withIcon(button) {
  if (config.premiumEmojiButtons === false || button.icon_custom_emoji_id) return button;
  const hit = split(button.text);
  if (!hit || !hit.rest) return button;
  return { ...button, text: hit.rest, icon_custom_emoji_id: hit.id };
}
