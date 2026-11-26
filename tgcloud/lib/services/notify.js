// lib/services/notify.js — foydalanuvchiga uning tilida xabar yuborish.

import { api, BotApiError } from 'sdk';
import { t, resolveLang } from '../core/i18n.js';

/**
 * Xabar yuboradi. Foydalanuvchi botni bloklagan bo'lsa (403) — false qaytaradi,
 * xato tashlamaydi.
 */
export async function sendTo(userId, text, extra = {}) {
  try {
    await api.sendMessage({ chat_id: userId, text, parse_mode: 'HTML', ...extra });
    return true;
  } catch (e) {
    if (e instanceof BotApiError && (e.code === 403 || e.code === 400)) return false;
    throw e;
  }
}

/** i18n kaliti bilan, `user` qatorining tilida. */
export function notify(user, key, params, extra) {
  return sendTo(user.id, t(resolveLang(user.lang), key, params), extra);
}

export function tr(user, key, params) {
  return t(resolveLang(user?.lang), key, params);
}
