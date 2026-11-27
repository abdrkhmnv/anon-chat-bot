// lib/services/matchmaking.js — qidiruv, juftlash, suhbatni tugatish, xabar uzatish.
//
// Hodisalar (boshqa plaginlar obuna bo'lishi mumkin):
//   'search:start' { user, want }
//   'chat:start'   { chatId, a, b }            — a, b: users qatorlari
//   'chat:end'     { chat, by, reason }        — reason: 'stop'|'next'|'unavailable'|'ban'|'idle'
//   'relay:before' { ctx, partnerId }          — ctx.state.blockRelay = true qilib to'xtatish mumkin

import { api, BotApiError } from 'sdk';
import { config } from '../config.js';
import { usersRepo, isPremium } from '../repo/users.js';
import { queueRepo } from '../repo/queue.js';
import { chatsRepo, otherSide } from '../repo/chats.js';
import { menuFor, inline, btn } from '../core/keyboards.js';
import { notify, tr, sendTo } from './notify.js';

const PURGE_PROBABILITY = 0.02; // cron yo'q — eskirgan navbatni vaqti-vaqti bilan tozalaymiz
const IDLE_SWEEP_EVERY_MS = 60_000; // jim suhbatlarni tekshirish (har izolyatda daqiqada ko'pi bilan 1 marta)

/** "Qidirilmoqda" matni; config.showOnline bo'lsa — onlayn soni bilan. */
export async function searchingText(user, key = 'search.searching') {
  let text = tr(user, key);
  if (config.showOnline) {
    const online = Math.max(1, await usersRepo.onlineCount());
    text += '\n\n' + tr(user, 'search.online', { online });
  }
  return text;
}

/** Yomon baho: kamida minVotes ta 👎 va 👎 soni 👍 dan ratio marta ko'p. */
export function isBadRated(user) {
  const { minVotes, ratio } = config.badRating;
  const down = Number(user?.dislikes) || 0;
  const up = Number(user?.likes) || 0;
  return down >= minVotes && down > up * ratio;
}

/** Suhbat tugagach: baho (👍/👎) va shikoyat tugmalari. */
export function afterChatKeyboard(user, chatId) {
  return {
    reply_markup: inline([
      [btn(tr(user, 'btn.like'), `rate:${chatId}:1`), btn(tr(user, 'btn.dislike'), `rate:${chatId}:-1`)],
      [btn(tr(user, 'btn.report'), `rep:${chatId}`)],
    ]),
  };
}

export function createMatchmaking(bot) {
  async function search(user, want = 'any') {
    if (user.state === 'chatting') return { status: 'chatting' };
    if (want !== 'any' && !isPremium(user)) return { status: 'premium_only' };

    await usersRepo.update(user.id, { state: 'searching', lastWant: want });
    user.state = 'searching';
    user.last_want = want;

    // "Qidirilmoqda" xabarini navbatga qo'shishdan OLDIN yuboramiz — aks holda
    // juftlik darhol topilsa, xabarlar teskari tartibda kelishi mumkin.
    const key = want === 'f' ? 'search.searching_f' : want === 'm' ? 'search.searching_m' : 'search.searching';
    await sendTo(user.id, await searchingText(user, key), { reply_markup: menuFor(user, 'searching') });

    await bot.emit('search:start', { user, want });
    const vip = isPremium(user);
    let partner;
    try {
      await queueRepo.join({
        userId: user.id, gender: user.gender, age: user.age,
        wantGender: want, premium: vip,
        region: user.region ?? null,
        // VIP filtrlari faqat VIP faol va config.vipFilters yoqilgan bo'lsa amal qiladi.
        wantRegion: vip && config.vipFilters ? user.want_region ?? null : null,
        ageMin: vip && config.vipFilters ? user.age_min ?? null : null,
        ageMax: vip && config.vipFilters ? user.age_max ?? null : null,
        penalty: isBadRated(user),
      });

      partner = await queueRepo.claimPartner(user.id, {
        boostMs: config.vipBoostSec * 1000, penaltyMs: config.badPenaltySec * 1000,
      });
      if (!partner) return { status: 'queued' };
    } catch (e) {
      // Navbatga qo'shib bo'lmadi — foydalanuvchi "qidiruvda, lekin navbatda yo'q"
      // (o'lik qidiruv) holatida qolib ketmasin.
      await queueRepo.leave(user.id).catch(() => {});
      await usersRepo.update(user.id, { state: 'idle' }).catch(() => {});
      user.state = 'idle';
      throw e;
    }

    await startChat(user.id, partner.user_id);
    return { status: 'matched', partnerId: partner.user_id };
  }

  async function startChat(aId, bId) {
    const chatId = await chatsRepo.create(aId, bId);
    await usersRepo.pair(aId, bId, chatId);
    const [a, b] = await Promise.all([usersRepo.get(aId), usersRepo.get(bId)]);

    const results = await Promise.all([foundMessage(a, b), foundMessage(b, a)]);
    if (results.some((ok) => !ok)) {
      // Kimdir botni bloklagan — suhbatni darhol yopamiz.
      const gone = results[0] ? b : a;
      await endChat(chatId, gone.id, 'unavailable');
      return;
    }
    await bot.emit('chat:start', { chatId, a, b });
  }

  function foundMessage(viewer, partner) {
    // Premium foydalanuvchi suhbatdoshining jinsi va yoshini ko'radi, oddiy — yo'q.
    const extra = { reply_markup: menuFor(viewer, 'chatting') };
    if (isPremium(viewer)) {
      return notify(viewer, 'chat.found_premium', {
        gender: tr(viewer, `gender.${partner.gender}`), age: partner.age ?? '?',
      }, extra);
    }
    return notify(viewer, 'chat.found', null, extra);
  }

  /**
   * Suhbatni yopadi. `by` — tugatgan (yoki mavjud bo'lmay qolgan) foydalanuvchi.
   * `silentFor` — shu foydalanuvchiga xabar yubormaslik (masalan /next da, chunki
   * unga darhol "qidirilmoqda" yuboriladi).
   */
  async function endChat(chatId, by, reason = 'stop', { silentFor = null } = {}) {
    const chat = await chatsRepo.end(chatId, by);
    if (!chat) return null; // allaqachon yopilgan
    await usersRepo.unpair(chatId);

    const ids = [chat.user_a, chat.user_b];
    const users = await Promise.all(ids.map((id) => usersRepo.get(id)));
    await Promise.all(users.map((u) => {
      if (!u || u.id === silentFor) return null;
      const reportKb = afterChatKeyboard(u, chat.id);
      if (reason === 'unavailable') {
        if (u.id === by) return null; // botni bloklagan odamga yubora olmaymiz
        return notify(u, 'chat.partner_unavailable', null, { reply_markup: menuFor(u, 'idle') });
      }
      if (reason === 'idle') {
        return notify(u, 'chat.ended_idle', { min: config.inactivityMin }, reportKb)
          .then(() => notify(u, 'chat.after', null, { reply_markup: menuFor(u, 'idle') }));
      }
      if (u.id === by) {
        return notify(u, 'chat.ended_by_you', null, reportKb)
          .then(() => notify(u, 'chat.after', null, { reply_markup: menuFor(u, 'idle') }));
      }
      return notify(u, 'chat.ended_by_partner', null, reportKb)
        .then(() => notify(u, 'chat.after', null, { reply_markup: menuFor(u, 'idle') }));
    }));

    await bot.emit('chat:end', { chat, by, reason });
    return chat;
  }

  /** /stop: suhbatni yoki qidiruvni to'xtatadi. */
  async function stop(user) {
    if (user.state === 'chatting' && user.chat_id) {
      await endChat(user.chat_id, user.id, 'stop');
      return 'ended';
    }
    const wasQueued = await queueRepo.leave(user.id);
    if (user.state === 'searching' || wasQueued) {
      await usersRepo.update(user.id, { state: 'idle' });
      user.state = 'idle';
      return 'cancelled';
    }
    return 'idle';
  }

  /** /next: joriy suhbatni tugatib, xuddi shu filtr bilan yangisini qidiradi. */
  async function next(user) {
    if (user.state === 'chatting' && user.chat_id) {
      await endChat(user.chat_id, user.id, 'next', { silentFor: user.id });
      user.state = 'idle';
      user.chat_id = null;
      user.partner_id = null;
    }
    let want = user.last_want || 'any';
    if (want !== 'any' && !isPremium(user)) want = 'any'; // premium tugagan bo'lsa
    return search(user, want);
  }

  /** Suhbatdagi xabarni sherikka anonim nusxalaydi (copyMessage — "forwarded" belgisisiz). */
  async function relay(ctx) {
    const user = ctx.user;
    const partnerId = user.partner_id;
    if (!partnerId) return false;

    await bot.emit('relay:before', { ctx, partnerId });
    if (ctx.state.blockRelay) return true;

    const msg = ctx.message;
    const params = { chat_id: partnerId, from_chat_id: msg.chat.id, message_id: msg.message_id };
    try {
      await api.copyMessage(params);
      if (user.chat_id) await chatsRepo.touch(user.chat_id);
    } catch (e) {
      if (!(e instanceof BotApiError)) throw e;
      if (e.code === 403) {
        await endChat(user.chat_id, partnerId, 'unavailable');
      } else if (e.code === 429) {
        // Telegram vaqtincha cheklagan — bir marta kutib qayta urinamiz.
        const wait = Math.min(Number(e.parameters?.retry_after) || 1, 5);
        if (typeof setTimeout !== 'function') throw e;
        await new Promise((r) => setTimeout(r, wait * 1000));
        await api.copyMessage(params);
      } else if (e.code === 400) {
        await ctx.reply(ctx.t('chat.cant_copy'));
      } else {
        throw e;
      }
    }
    return true;
  }

  /** `inactivityMin` daqiqa jim turgan suhbatlarni yopadi (cron yo'q — update kelganda). */
  let lastSweep = 0;
  async function sweepIdle({ force = false } = {}) {
    if (!config.inactivityMin) return 0;
    const t = Date.now();
    if (!force && t - lastSweep < IDLE_SWEEP_EVERY_MS) return 0;
    lastSweep = t;
    const rows = await chatsRepo.idle(config.inactivityMin * 60);
    for (const r of rows) await endChat(r.id, null, 'idle');
    return rows.length;
  }

  async function purgeStale() {
    const ids = await queueRepo.purgeStale(config.queueTtlSec);
    if (ids.length) await usersRepo.resetSearching(ids);
  }

  /** Foydalanuvchini hamma joydan chiqarish (ban, botni bloklash). */
  async function detach(user, reason) {
    if (user.state === 'chatting' && user.chat_id) {
      await endChat(user.chat_id, user.id, reason);
    }
    await queueRepo.leave(user.id);
    await usersRepo.update(user.id, { state: 'idle' });
  }

  return { search, startChat, endChat, stop, next, relay, purgeStale, sweepIdle, detach, otherSide };
}
