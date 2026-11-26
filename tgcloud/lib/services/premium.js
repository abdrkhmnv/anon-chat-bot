// lib/services/premium.js — Premium tariflar va Telegram Stars to'lovlari.
//
// To'lov oqimi (Telegram Stars, valyuta "XTR"):
//   1) sendInvoice  — foydalanuvchiga hisob (provider_token kerak emas)
//   2) pre_checkout_query — 10 soniya ichida answerPreCheckoutQuery
//   3) message.successful_payment — premiumni faollashtirish
// Hodisa: 'premium:granted' { userId, plan, until, chargeId }

import { api } from 'sdk';
import { config, getPlan } from '../config.js';
import { usersRepo, isPremium } from '../repo/users.js';
import { paymentsRepo } from '../repo/payments.js';
import { t, resolveLang } from '../core/i18n.js';
import { notify } from './notify.js';

const PAYLOAD_PREFIX = 'prem';

export function formatDate(unixSec) {
  const d = new Date(unixSec * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} (UTC)`;
}

export const encodePayload = (plan, userId) => `${PAYLOAD_PREFIX}:${plan.id}:${userId}:${plan.stars}`;

export function decodePayload(payload) {
  const [prefix, planId, userId, stars] = String(payload || '').split(':');
  if (prefix !== PAYLOAD_PREFIX) return null;
  return { planId, userId: Number(userId), stars: Number(stars) };
}

export function createPremium(bot) {
  const planTitle = (lang, plan) => t(lang, `plan.${plan.id}`);

  async function sendInvoice(user, planId) {
    const plan = getPlan(planId);
    if (!plan) return false;
    const lang = resolveLang(user.lang);
    const title = planTitle(lang, plan);
    await api.sendInvoice({
      chat_id: user.id,
      title: t(lang, 'premium.invoice_title', { title }),
      description: t(lang, 'premium.invoice_desc', { title }),
      payload: encodePayload(plan, user.id),
      currency: 'XTR',
      prices: [{ label: title, amount: plan.stars }],
      provider_token: '',
    });
    return true;
  }

  /** pre_checkout_query tekshiruvi. → { ok, error? } */
  function validateCheckout(q) {
    const p = decodePayload(q.invoice_payload);
    if (!p) return { ok: false, reason: 'payload' };
    const plan = getPlan(p.planId);
    if (!plan || q.currency !== 'XTR' || q.total_amount !== plan.stars || p.userId !== q.from.id) {
      return { ok: false, reason: 'plan' };
    }
    return { ok: true, plan };
  }

  /** successful_payment kelganda. Takroriy update xavfsiz (charge_id unikal). */
  async function applyPayment(user, sp) {
    const p = decodePayload(sp.invoice_payload);
    const plan = p && getPlan(p.planId);
    if (!plan) {
      console.error('successful_payment with unknown payload', sp.invoice_payload);
      return null;
    }
    const isNew = await paymentsRepo.record({
      userId: user.id, planId: plan.id, amount: sp.total_amount,
      chargeId: sp.telegram_payment_charge_id, days: plan.days,
    });
    if (!isNew) return null;
    const until = await usersRepo.extendPremium(user.id, plan.days);
    user.premium_until = until;
    await bot.emit('premium:granted', { userId: user.id, plan, until, chargeId: sp.telegram_payment_charge_id });
    return { plan, until };
  }

  /** Admin: to'lovni qaytarish (Stars foydalanuvchiga qaytadi). */
  async function refund(chargeId) {
    const pay = await paymentsRepo.byCharge(chargeId);
    if (!pay) return { ok: false, reason: 'not_found' };
    if (pay.refunded) return { ok: false, reason: 'already' };
    await api.refundStarsPayment({ user_id: pay.user_id, telegram_payment_charge_id: chargeId });
    if (await paymentsRepo.markRefunded(chargeId)) {
      await usersRepo.reducePremium(pay.user_id, pay.days);
      const u = await usersRepo.get(pay.user_id);
      if (u) await notify(u, 'premium.refunded', { stars: pay.amount });
    }
    return { ok: true, payment: pay };
  }

  /** Admin: qo'lda premium berish. */
  async function grant(userId, days) {
    return usersRepo.extendPremium(userId, days);
  }

  return { plans: config.plans, sendInvoice, validateCheckout, applyPayment, refund, grant, isPremium, planTitle };
}
