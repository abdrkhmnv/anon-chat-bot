// lib/core/i18n.js — ko'p tillilik.
// Yangi til qo'shish: lib/locales/<kod>.js yarating va quyidagi `locales` ga qo'shing.
// Topilmagan kalit standart tildan (uz) olinadi.

import uz from '../locales/uz.js';
import { config } from '../config.js';
import { stripButtonEmoji } from './emoji.js';

const locales = { uz };

/** Plaginlar o'z matnlarini qo'shishi uchun: extendLocale('uz', { 'myplugin.hello': '...' }) */
export function extendLocale(lang, strings) {
  locales[lang] = Object.assign(locales[lang] || {}, strings);
}

export function resolveLang(code) {
  if (code && locales[code]) return code;
  const short = code ? String(code).slice(0, 2) : '';
  return locales[short] ? short : config.defaultLang;
}

export function t(lang, key, params) {
  let s = locales[lang]?.[key] ?? locales[config.defaultLang]?.[key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m));
  return s;
}

/**
 * Kalitning barcha tillardagi qiymatlari (tugma matnlarini aniqlash uchun).
 * Premium emoji ikonkali tugma bosilganda Telegram faqat matnni (emojisiz) yuboradi,
 * shuning uchun emojisiz variant ham qo'shiladi; eski klaviaturalar ham ishlayveradi.
 */
export function allVariants(key) {
  const out = new Set();
  for (const loc of Object.values(locales)) {
    if (!loc[key]) continue;
    out.add(loc[key]);
    out.add(stripButtonEmoji(loc[key]));
  }
  return out;
}
