// plugins/filter.js — /filter (VIP): viloyat va yosh oralig'i bo'yicha qidirish.
// Filtr har qanday qidiruvga (/next, qiz/yigit) qo'shiladi va faqat VIP faol bo'lsa amal qiladi.
// Oqim settings kabi: bitta xabar tahrirlanadi, saqlangach yopiladi.

import { api } from 'sdk';
import { config } from '../config.js';
import { usersRepo, isPremium } from '../repo/users.js';
import { inline, btn } from '../core/keyboards.js';
import { regionName, regionRows } from '../core/regions.js';

export default {
  name: 'filter',
  setup(bot) {
    const back = (ctx, data) => [btn(ctx.t('settings.btn_back'), data)];
    const ageLabel = (ctx, u) => (u.age_min || u.age_max
      ? `${u.age_min ?? config.minAge}–${u.age_max ?? config.maxAge}`
      : ctx.t('filter.any'));
    const menuText = (ctx) => ctx.t('filter.text', {
      region: regionName(ctx, ctx.user.want_region, 'filter.any'), age: ageLabel(ctx, ctx.user),
    });
    const menuKb = (ctx) => inline([
      [btn(ctx.t('filter.btn_region'), 'flt:region'), btn(ctx.t('filter.btn_age'), 'flt:age')],
      [btn(ctx.t('filter.btn_reset'), 'flt:reset')],
      back(ctx, 'flt:close'),
    ]);

    bot.command('filter', (ctx) => {
      if (!isPremium(ctx.user)) return bot.services.premiumUi.offer(ctx, 'filter.vip_only');
      return ctx.reply(menuText(ctx), { reply_markup: menuKb(ctx) });
    });

    bot.action('flt', async (ctx) => {
      await ctx.answer();
      const [what, value] = ctx.args;
      if (what === 'close') {
        return api.deleteMessage({ chat_id: ctx.message.chat.id, message_id: ctx.message.message_id })
          .catch(() => ctx.edit(ctx.t('menu.main')));
      }
      if (!isPremium(ctx.user)) return ctx.edit(ctx.t('filter.vip_only'));
      if (what === 'menu') return ctx.edit(menuText(ctx), { reply_markup: menuKb(ctx) });

      if (what === 'region' && !value) {
        return ctx.edit(ctx.t('filter.ask_region'), {
          reply_markup: inline([...regionRows(ctx, 'flt:region', btn), [btn(ctx.t('region.any'), 'flt:region:any')], back(ctx, 'flt:menu')]),
        });
      }
      if (what === 'region') {
        const wantRegion = config.regions.includes(value) ? value : null;
        await usersRepo.update(ctx.user.id, { wantRegion });
        return ctx.edit(ctx.t('settings.saved'));
      }
      if (what === 'age' && !value) {
        const ranges = config.ageRanges.map(([a, b]) => btn(b >= config.maxAge ? `${a}+` : `${a}–${b}`, `flt:age:${a}-${b}`));
        const rows = [];
        for (let i = 0; i < ranges.length; i += 2) rows.push(ranges.slice(i, i + 2));
        return ctx.edit(ctx.t('filter.ask_age'), {
          reply_markup: inline([...rows, [btn(ctx.t('filter.any'), 'flt:age:any')], back(ctx, 'flt:menu')]),
        });
      }
      if (what === 'age') {
        const m = /^(\d+)-(\d+)$/.exec(value || '');
        const ok = m && config.ageRanges.some(([a, b]) => a === +m[1] && b === +m[2]);
        await usersRepo.update(ctx.user.id, { ageMin: ok ? +m[1] : null, ageMax: ok ? +m[2] : null });
        return ctx.edit(ctx.t('settings.saved'));
      }
      if (what === 'reset') {
        await usersRepo.update(ctx.user.id, { wantRegion: null, ageMin: null, ageMax: null });
        return ctx.edit(ctx.t('settings.saved'));
      }
    });
  },
};
