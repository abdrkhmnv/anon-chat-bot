// lib/core/regions.js — viloyatlar ro'yxati va tanlash klaviaturasi.

import { config } from '../config.js';

/** Viloyat nomi (foydalanuvchi tilida). `code` yo'q bo'lsa — 'Hammasi'/'Не указан' kabi `emptyKey`. */
export function regionName(ctx, code, emptyKey = 'region.any') {
  return code && config.regions.includes(code) ? ctx.t(`region.${code}`) : ctx.t(emptyKey);
}

/** Viloyat tugmalari: 2 tadan qatorda. `makeBtn(text, data)` — btn yoki plainBtn. */
export function regionRows(ctx, prefix, makeBtn) {
  const rows = [];
  const list = config.regions;
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2).map((c) => makeBtn(ctx.t(`region.${c}`), `${prefix}:${c}`)));
  }
  return rows;
}
