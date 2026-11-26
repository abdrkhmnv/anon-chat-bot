// plugins/index.js — yoqilgan plaginlar ro'yxati.
//
// YANGI FUNKSIYA QO'SHISH: lib/plugins/<nom>.js yarating va shu ro'yxatga qo'shing.
// TARTIB MUHIM: middleware va message-handlerlar shu tartibda ishlaydi.
//   - `users` doim birinchi (foydalanuvchini yuklaydi, ban tekshiradi);
//   - `registration` ikkinchi (ro'yxatdan o'tmaganlarni to'xtatadi);
//   - yangi plaginlarni `chat` dan OLDIN qo'shing — `chat` suhbatdagi barcha
//     qolgan xabarlarni sherikka uzatadi;
//   - `fallback` doim oxirgi.

import users from './users.js';
import registration from './registration.js';
import info, { fallback } from './help.js'; // /terms, /paysupport, /menu
import premium from './premium.js';
import settings from './settings.js';
import report from './report.js';
import rating from './rating.js';
import filter from './filter.js';
import referral from './referral.js';
import antispam from './antispam.js';
import commands from './commands.js';
import admin from './admin.js';
import broadcast from './broadcast.js';
import chat from './chat.js';

export const plugins = [
  users,
  registration,
  info,
  premium,
  settings,
  report,
  rating,
  filter,
  referral,
  antispam,
  commands,
  admin,
  broadcast,
  // ← yangi plaginlar shu yerga
  chat,
  fallback,
];
