// lib/app.js — botni yig'ish. Modul bir marta yuklanadi va izolyat yashagan
// davomida qayta ishlatiladi, shuning uchun plaginlar har update'da qayta sozlanmaydi.

import { Bot } from './core/bot.js';
import { plugins } from './plugins/index.js';

export function createBot(list = plugins) {
  const bot = new Bot();
  for (const p of list) bot.register(p);
  return bot;
}

export const bot = createBot();
