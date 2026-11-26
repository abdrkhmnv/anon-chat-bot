// lib/core/bot.js — botning yadrosi: marshrutlash, middleware, plaginlar, hodisalar.
//
// Yadro biznes-mantiqni bilmaydi. Hamma funksiyalar (ro'yxatdan o'tish, suhbat,
// premium, shikoyat, admin ...) — plaginlar. Yangi funksiya qo'shish:
//   1) lib/plugins/<nom>.js faylida `export default { name, setup(bot) { ... } }`
//   2) lib/plugins/index.js ro'yxatiga bitta qator.
// Yadro va boshqa plaginlarga tegish shart emas.
//
// Plagin `setup(bot)` ichida quyidagilardan foydalanadi:
//   bot.use(fn)                      — middleware: (ctx, next) => ...
//   bot.command('stop', fn)          — /stop buyrug'i (massiv ham bo'ladi: ['stop','end'])
//   bot.hears('btn.search', fn)      — reply-tugma matni (i18n kaliti yoki RegExp/funksiya)
//   bot.action('buy', fn)            — callback_data "buy" yoki "buy:..." (ctx.args = [...])
//   bot.on('message', fn)            — har qanday xabar (ketma-ket, next() bilan)
//   bot.on('successful_payment', fn) — maxsus xabar turlari (message[<tur>] bor bo'lsa)
//   bot.on('pre_checkout_query', fn) — istalgan update turi
//   bot.onEvent('chat:start', fn)    — ichki hodisalarga obuna
//   bot.emit('chat:start', data)     — hodisa chiqarish
//   bot.service('premium', obj)      — servisni ro'yxatdan o'tkazish / bot.services.premium

import { BotApiError } from 'sdk';
import { Context } from './context.js';
import { allVariants } from './i18n.js';

// Xabar ichidagi maxsus maydonlar — `bot.on('<maydon>')` bilan ushlanadi.
const MESSAGE_SUBTYPES = ['successful_payment', 'refunded_payment'];

export class Bot {
  constructor() {
    this.middlewares = [];
    this.commands = new Map();       // nom -> {fn, opts}
    this.hearers = [];               // {test, fn}
    this.actions = new Map();        // prefiks -> fn
    this.handlers = new Map();       // update turi -> [fn]
    this.events = new Map();         // hodisa -> [fn]
    this.services = {};
    this.plugins = [];
    this.afterHooks = [];
    this.loadUser = null;            // (from) => user qatori; users plagini o'rnatadi
  }

  // ---------- ro'yxatdan o'tkazish API ----------

  register(plugin) {
    if (!plugin || typeof plugin.setup !== 'function') {
      throw new Error('Plugin must export { name, setup(bot) }');
    }
    if (this.plugins.some((p) => p.name === plugin.name)) return this;
    plugin.setup(this);
    this.plugins.push(plugin);
    return this;
  }

  use(fn) { this.middlewares.push(fn); return this; }

  command(names, fn, opts = {}) {
    for (const n of [].concat(names)) this.commands.set(n.toLowerCase(), { fn, opts });
    return this;
  }

  hears(matcher, fn) {
    let test;
    if (typeof matcher === 'function') test = matcher;
    else if (matcher instanceof RegExp) test = (text) => matcher.test(text);
    else {
      // i18n kaliti: matn kalitning istalgan tildagi qiymatiga teng bo'lsa
      test = (text) => allVariants(matcher).has(text);
    }
    this.hearers.push({ test, fn });
    return this;
  }

  action(prefix, fn) { this.actions.set(prefix, fn); return this; }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(fn);
    return this;
  }

  onEvent(name, fn) {
    if (!this.events.has(name)) this.events.set(name, []);
    this.events.get(name).push(fn);
    return this;
  }

  async emit(name, data) {
    for (const fn of this.events.get(name) || []) {
      try { await fn(data, this); } catch (e) { console.error(`event ${name} listener failed`, e); }
    }
  }

  service(name, impl) { this.services[name] = impl; return this; }
  after(fn) { this.afterHooks.push(fn); return this; }

  // ---------- kiruvchi update'ni qayta ishlash ----------

  /** handlers/<tur>.js fayllaridan chaqiriladi. */
  async handle(type, payload, platformCtx = {}) {
    const ctx = new Context(this, type, payload, platformCtx);
    try {
      if (ctx.from && this.loadUser) ctx.user = await this.loadUser(ctx.from, ctx);
      await this.#compose(this.middlewares, (c) => this.#route(c))(ctx);
    } catch (e) {
      await this.#onError(e, ctx);
    }
    for (const fn of this.afterHooks) {
      try { await fn(ctx); } catch (e) { console.error('after hook failed', e); }
    }
   }

  #compose(mws, final) {
    return (ctx) => {
      let idx = -1;
      const dispatch = (i) => {
        if (i <= idx) throw new Error('next() called twice');
        idx = i;
        const fn = i < mws.length ? mws[i] : final;
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
      };
      return dispatch(0);
    };
  }

  async #runChain(fns, ctx) {
    if (!fns || !fns.length) return false;
    let handled = true;
    await this.#compose(fns, () => { handled = false; })(ctx);
    return handled;
  }

  async #route(ctx) {
    const { type, payload } = ctx;

    if (type === 'message') {
      for (const sub of MESSAGE_SUBTYPES) {
        if (payload[sub]) return this.#runChain(this.handlers.get(sub), ctx);
      }
      const text = payload.text;
      if (text && text.startsWith('/')) {
        const [head, ...rest] = text.trim().split(/\s+/);
        const name = head.slice(1).split('@')[0].toLowerCase();
        const cmd = this.commands.get(name);
        if (cmd) {
          ctx.command = name;
          ctx.args = rest;
          return cmd.fn(ctx);
        }
      }
      if (text) {
        for (const h of this.hearers) if (h.test(text, ctx)) return h.fn(ctx);
      }
      return this.#runChain(this.handlers.get('message'), ctx);
    }

    if (type === 'callback_query') {
      const data = payload.data || '';
      const [prefix, ...args] = data.split(':');
      const fn = this.actions.get(prefix);
      ctx.args = args;
      if (fn) return fn(ctx);
      return ctx.answer();
    }

    return this.#runChain(this.handlers.get(type), ctx);
  }

  async #onError(e, ctx) {
    console.error(`update ${ctx.type} failed`, e);
    // Foydalanuvchini javobsiz qoldirmaymiz (bu yerda xato bo'lsa — jim o'tamiz).
    try {
      if (ctx.type === 'callback_query') await ctx.answer(ctx.t('error.generic'));
      else if (ctx.type === 'message' && ctx.chatId) await ctx.reply(ctx.t('error.generic'));
    } catch (_) { /* ignore */ }
    // 429 (flood) yoki boshqa vaqtinchalik xato — Telegram update'ni qayta yubormasligi
    // uchun xatoni yutamiz; xohlasangiz bu yerda qayta tashlash mumkin.
    if (e instanceof BotApiError && e.code === 429) {
      console.warn('rate limited', e.parameters);
    }
  }
}
