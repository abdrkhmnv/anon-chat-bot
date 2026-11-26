// lib/core/context.js — bitta update uchun kontekst obyekti (ctx).

import { api } from 'sdk';
import { t, resolveLang } from './i18n.js';

export class Context {
  constructor(bot, type, payload, platformCtx) {
    this.bot = bot;
    this.type = type;              // 'message' | 'callback_query' | ...
    this.payload = payload;        // Message / CallbackQuery / PreCheckoutQuery ...
    this.platform = platformCtx;   // platformaning ctx'i (ctx.update — to'liq Update)
    this.update = platformCtx?.update;
    this.api = api;
    this.user = null;              // users jadvalidagi qator (loadUser orqali)
    this.args = [];
    this.state = {};               // middleware'lar orasida ma'lumot almashish uchun

    this.from = payload?.from || null;
    this.message = type === 'message' ? payload
      : type === 'callback_query' ? payload.message || null : null;
    this.chatId = this.message?.chat?.id
      ?? (type === 'my_chat_member' ? payload.chat?.id : null)
      ?? this.from?.id ?? null;
    this.isPrivate = (this.message?.chat?.type ?? 'private') === 'private';
  }

  get lang() { return resolveLang(this.user?.lang || this.from?.language_code); }
  get text() { return this.message?.text ?? ''; }
  get services() { return this.bot.services; }

  t(key, params) { return t(this.lang, key, params); }

  reply(text, extra = {}) {
    return api.sendMessage({ chat_id: this.chatId, text, parse_mode: 'HTML', ...extra });
  }

  /** Boshqa foydalanuvchiga xabar (uning tilida). */
  send(userId, text, extra = {}) {
    return api.sendMessage({ chat_id: userId, text, parse_mode: 'HTML', ...extra });
  }

  /** Callback'ga javob (soat belgisini o'chiradi). */
  answer(text, showAlert = false) {
    if (this.type !== 'callback_query') return Promise.resolve();
    return api.answerCallbackQuery({ callback_query_id: this.payload.id, text, show_alert: showAlert })
      .catch(() => {});
  }

  /** Callback kelgan xabarni tahrirlash. */
  edit(text, extra = {}) {
    if (!this.message) return this.reply(text, extra);
    return api.editMessageText({
      chat_id: this.message.chat.id, message_id: this.message.message_id,
      text, parse_mode: 'HTML', ...extra,
    }).catch((e) => { if (e.code !== 400) throw e; });
  }
}
