// plugins/commands.js — "/" menyusidagi buyruqlar ro'yxatini (setMyCommands) avtomatik yangilaydi.
// Ro'yxat: locales/uz.js va locales/ru.js dagi 'bot.commands'. Uni o'zgartirib deploy qilsangiz,
// bot keyingi birinchi update'da ro'yxatni o'zi yangilaydi — BotFather'ga kirish shart emas.
// Qo'lda majburlash: admin /setcommands.

import { api } from 'sdk';
import { t } from '../core/i18n.js';
import { kv } from '../repo/kv.js';

const KV_KEY = 'bot:commands';
const LANGS = [['uz', null], ['ru', 'ru']]; // [til, language_code] — null = standart (hamma uchun)

export function parseCommands(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [command, ...rest] = l.split(' - ');
    return { command: command.trim(), description: rest.join(' - ').trim() };
  });
}

function currentLists() {
  return LANGS.map(([lang, code]) => ({ code, commands: parseCommands(t(lang, 'bot.commands')) }));
}

/** Ro'yxatni Telegram'ga yuboradi (agar o'zgargan bo'lsa yoki force). → yangilandimi */
export async function syncCommands({ force = false } = {}) {
  const lists = currentLists();
  const sig = JSON.stringify(lists);
  if (!force && (await kv.get(KV_KEY)) === sig) return false;
  for (const { code, commands } of lists) {
    await api.setMyCommands(code ? { commands, language_code: code } : { commands });
  }
  await kv.set(KV_KEY, sig);
  return true;
}

export default {
  name: 'commands',
  setup(bot) {
    let checked = false; // har izolyatda bir marta tekshiramiz
    bot.after(async () => {
      if (checked) return;
      checked = true;
      try {
        await syncCommands();
      } catch (e) {
        checked = false; // keyingi update'da qayta urinamiz
        console.error('setMyCommands failed', e);
      }
    });
    bot.service('commands', { sync: syncCommands });
  },
};
