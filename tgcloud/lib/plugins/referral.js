// plugins/referral.js — do'st taklif qilish: /invite, t.me/<bot>?start=ref_<id>.
// Har config.referral.need ta do'st RO'YXATDAN O'TSA (jins + yosh) — config.referral.days kun VIP.

import { api } from 'sdk';
import { config } from '../config.js';
import { usersRepo } from '../repo/users.js';
import { inline } from '../core/keyboards.js';
import { withIcon } from '../core/emoji.js';
import { notify } from '../services/notify.js';
import { formatDate } from '../services/premium.js';

let cachedUsername = null;
async function botUsername() {
  if (config.botUsername) return config.botUsername.replace(/^@/, '');
  if (!cachedUsername) cachedUsername = (await api.getMe())?.username || null;
  return cachedUsername;
}

export default {
  name: 'referral',
  setup(bot) {
    // /start ref_123 — faqat hali ro'yxatdan o'tmagan yangi foydalanuvchi uchun.
    bot.onEvent('start', async ({ ctx, payload }) => {
      const m = /^ref_(\d+)$/.exec(payload || '');
      if (!m || !ctx.user || ctx.user.gender || ctx.user.referred_by) return;
      const refId = Number(m[1]);
      if (refId === ctx.user.id) return;
      const referrer = await usersRepo.get(refId);
      if (!referrer) return;
      await usersRepo.update(ctx.user.id, { referredBy: refId });
      ctx.user.referred_by = refId;
    });

    bot.onEvent('user:registered', async ({ user }) => {
      if (!user?.referred_by) return;
      const count = await usersRepo.addReferral(user.referred_by);
      const referrer = await usersRepo.get(user.referred_by);
      if (!referrer) return;
      const { need, days } = config.referral;
      if (count % need === 0) {
        const until = await usersRepo.extendPremium(referrer.id, days);
        await bot.emit('premium:granted', { userId: referrer.id, plan: { id: 'referral', days }, until, chargeId: null });
        await notify(referrer, 'ref.reward', { need, days, until: formatDate(until) });
      } else {
        await notify(referrer, 'ref.joined', { left: need - (count % need) });
      }
    });

    bot.command(['invite', 'ref'], async (ctx) => {
      const username = await botUsername();
      if (!username) return ctx.reply(ctx.t('error.generic'));
      const link = `https://t.me/${username}?start=ref_${ctx.user.id}`;
      const share = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(ctx.t('ref.share_text'))}`;
      const { need, days } = config.referral;
      return ctx.reply(ctx.t('ref.text', { need, days, link, count: ctx.user.referrals ?? 0 }), {
        reply_markup: inline([[withIcon({ text: ctx.t('ref.btn_share'), url: share })]]),
        link_preview_options: { is_disabled: true },
      });
    });
  },
};
