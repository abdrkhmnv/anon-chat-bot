// lib/core/keyboards.js — klaviaturalar.
// Barcha tugmalar `withIcon` orqali o'tadi: oddiy emoji premium emoji ikonkasiga almashtiriladi.

import { t, resolveLang } from './i18n.js';
import { withIcon } from './emoji.js';

const kb = (rows) => ({ keyboard: rows, resize_keyboard: true, is_persistent: true });

/** Foydalanuvchi holatiga mos reply-klaviatura (`user` — users qatori). */
export function menuFor(user, state = user?.state) {
  const lang = resolveLang(user?.lang);
  const b = (k) => withIcon({ text: t(lang, k) });
  if (state === 'chatting') return kb([[b('btn.next'), b('btn.stop')]]);
  if (state === 'searching') return kb([[b('btn.cancel')]]);
  return kb([
    [b('btn.search')],
    [b('btn.search_f'), b('btn.search_m')],
    [b('btn.premium'), b('btn.profile'), b('btn.help')],
  ]);
}

export const inline = (rows) => ({ inline_keyboard: rows });
export const btn = (text, data) => withIcon({ text, callback_data: data });
