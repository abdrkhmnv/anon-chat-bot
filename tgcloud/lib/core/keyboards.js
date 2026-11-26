// lib/core/keyboards.js — klaviaturalar.
// Barcha tugmalar `withIcon` orqali o'tadi: oddiy emoji premium emoji ikonkasiga almashtiriladi.
// Ranglar (Bot API 9.4 `style`): 'primary' — ko'k, 'success' — yashil, 'danger' — qizil,
// berilmasa — oddiy (ilova rangi). O'chirish: config.coloredButtons = false.

import { t, resolveLang } from './i18n.js';
import { withIcon } from './emoji.js';
import { config } from '../config.js';

export const BLUE = 'primary';
export const GREEN = 'success';
export const RED = 'danger';

/** Pastki menyu tugmalarining ranglari (kalit -> rang). Bu yerda o'zgartiring. */
export const MENU_COLORS = {
  'btn.search': GREEN,    // 🔎 Suhbatdosh qidirish
  'btn.search_f': RED,    // 👩 Qiz qidirish
  'btn.search_m': BLUE,   // 👨 Yigit qidirish
  'btn.premium': BLUE,    // 💎 VIP
  'btn.profile': null,    // 👤 Profil — oddiy
  'btn.help': null,       // ℹ️ Yordam — oddiy
  'btn.next': BLUE,       // ⏭ Keyingisi
  'btn.stop': RED,        // ⛔ Suhbatni tugatish
  'btn.cancel': RED,      // ❌ Qidiruvni bekor qilish
};

const paint = (button, style) =>
  (style && config.coloredButtons !== false ? { ...button, style } : button);

const kb = (rows) => ({ keyboard: rows, resize_keyboard: true, is_persistent: true });

/** Foydalanuvchi holatiga mos reply-klaviatura (`user` — users qatori). */
export function menuFor(user, state = user?.state) {
  const lang = resolveLang(user?.lang);
  const b = (k) => paint(withIcon({ text: t(lang, k) }), MENU_COLORS[k]);
  if (state === 'chatting') return kb([[b('btn.next'), b('btn.stop')]]);
  if (state === 'searching') return kb([[b('btn.cancel')]]);
  return kb([
    [b('btn.search')],
    [b('btn.search_f'), b('btn.search_m')],
    [b('btn.premium'), b('btn.profile'), b('btn.help')],
  ]);
}

export const inline = (rows) => ({ inline_keyboard: rows });
/** Inline tugma. `style`: BLUE | GREEN | RED yoki berilmasa oddiy. */
export const btn = (text, data, style) => paint(withIcon({ text, callback_data: data }), style);
