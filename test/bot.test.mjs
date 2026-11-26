// Ishga tushirish: npm test
// Haqiqiy platforma o'rniga mock `sdk` (node:sqlite + yozib boruvchi api) ishlatiladi.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as schema from '../tgcloud/schema.js';
import { applySchema, raw } from './mock/sdk-db.mjs';
import { calls, blocked, reset } from './mock/sdk.mjs';
import { createBot } from '../tgcloud/lib/app.js';
import { config } from '../tgcloud/lib/config.js';

let bot;
let nextMsg = 1;

beforeEach(() => {
  applySchema(schema);
  reset();
  bot = createBot();
});

const from = (id) => ({ id, is_bot: false, first_name: `U${id}`, language_code: 'uz' });
const send = (id, text, extra = {}) => bot.handle('message', {
  message_id: nextMsg++, from: from(id), chat: { id, type: 'private' }, date: 0, text, ...extra,
}, {});
const press = (id, data) => bot.handle('callback_query', {
  id: String(nextMsg++), from: from(id), data,
  message: { message_id: nextMsg++, chat: { id, type: 'private' } },
}, {});
const user = (id) => raw().prepare('SELECT * FROM users WHERE id = ?').get(id);
const textsTo = (id) => calls.filter((c) => c.method === 'sendMessage' && c.params.chat_id === id).map((c) => c.params.text);
const lastTo = (id) => textsTo(id).at(-1) ?? '';

async function register(id, gender, age) {
  await send(id, '/start');
  await press(id, `reg:g:${gender}`);
  await send(id, String(age));
}
const makePremium = (id, days = 30) =>
  raw().prepare('UPDATE users SET premium_until = unixepoch() + ? WHERE id = ?').run(days * 86400, id);

test("ro'yxatdan o'tish: jins, yosh, yosh chegarasi", async () => {
  await send(1, '/start');
  assert.match(lastTo(1), /Jinsingizni tanlang/);
  await send(1, '/search'); // ro'yxatdan o'tmagan — qidiruv ishlamaydi
  assert.equal(user(1).state, 'idle');
  await press(1, 'reg:g:f');
  assert.match(lastTo(1), /Yoshingizni yozing/);
  await send(1, '15');
  assert.match(lastTo(1), /18 dan 99 gacha/);
  await send(1, '21');
  assert.match(lastTo(1), /Tayyor/);
  const u = user(1);
  assert.equal(u.gender, 'f');
  assert.equal(u.age, 21);
});

test('ikki oddiy foydalanuvchi ulanadi; jins/yosh ko\'rinmaydi; xabar anonim uzatiladi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await send(1, '/search');
  assert.equal(user(1).state, 'searching');
  await send(2, '/search');
  assert.equal(user(1).state, 'chatting');
  assert.equal(user(1).partner_id, 2);
  assert.equal(user(2).partner_id, 1);
  assert.match(lastTo(1), /Muloqotchi topildi/);
  assert.doesNotMatch(lastTo(1), /yosh/);
  assert.doesNotMatch(lastTo(2), /Yigit|yosh/);

  await send(1, 'salom');
  const copy = calls.filter((c) => c.method === 'copyMessage').at(-1);
  assert.deepEqual([copy.params.chat_id, copy.params.from_chat_id], [2, 1]);
});

test('oddiy foydalanuvchi jins bo\'yicha qidira olmaydi', async () => {
  await register(1, 'm', 25);
  await send(1, '/girl');
  assert.equal(user(1).state, 'idle');
  assert.ok(textsTo(1).some((t) => /faqat <b>VIP<\/b>/.test(t)));
  assert.ok(calls.some((c) => c.params.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data === 'buy:d3'));
});

test('premium yigit qiz qidiradi: yigit bilan ulanmaydi, qizga ulanadi va uning jinsi/yoshini ko\'radi', async () => {
  await register(3, 'm', 27);
  makePremium(3);
  await send(3, '/girl');
  await register(1, 'm', 30);
  await send(1, '/search');            // yigit — premium yigitga mos emas
  assert.equal(user(1).state, 'searching');
  assert.equal(user(3).state, 'searching');
  await register(4, 'f', 21);
  await send(4, '/search');            // qiz: navbatda 3 (qiz kutyapti) va 1 (har kim)
  // FIFO: 3 birinchi navbatga turgan — qiz 3 ga ulanadi
  assert.equal(user(4).partner_id, 3);
  assert.match(lastTo(3), /Qiz, 21 yosh/);          // premium — ko'radi
  assert.doesNotMatch(lastTo(4), /Yigit|yosh/);     // oddiy — ko'rmaydi
  assert.equal(user(1).state, 'searching');
});

test('/stop: ikkala tomon ham bo\'shaydi; takroriy /stop xavfsiz; /next yangi qidiradi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await send(1, '/search');
  await send(2, '/search');
  await Promise.all([send(1, '/stop'), send(2, '/stop')]);
  assert.equal(user(1).state, 'idle');
  assert.equal(user(2).state, 'idle');
  const ended = calls.filter((c) => c.method === 'sendMessage' && /^⛔/.test(c.params.text));
  assert.equal(ended.length, 2, 'har biriga bitta xabar');

  await send(1, '/search');
  await send(2, '/search');
  await send(1, '/next');
  assert.equal(user(1).state, 'searching');
  assert.equal(user(2).state, 'idle');
  assert.match(textsTo(2).join('\n'), /Muloqotchi siz bilan muloqotni uzdi/);
});

test('sherik botni bloklagan bo\'lsa suhbat yopiladi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await send(1, '/search');
  await send(2, '/search');
  blocked.add(2);
  await send(1, 'salom');
  assert.equal(user(1).state, 'idle');
  assert.equal(user(2).state, 'idle');
  assert.match(lastTo(1), /bloklagani/);
});

test('bir vaqtda 200 kishi qidirsa — hech kim ikki suhbatga tushmaydi', async () => {
  const ids = Array.from({ length: 200 }, (_, i) => 100 + i);
  for (const id of ids) await register(id, id % 3 ? 'm' : 'f', 20 + (id % 10));
  ids.filter((id) => id % 5 === 0).forEach((id) => makePremium(id));
  await Promise.all(ids.map((id) => send(id, id % 5 === 0 ? (id % 2 ? '/girl' : '/boy') : '/search')));
  const rows = raw().prepare("SELECT * FROM users WHERE id >= 100").all();
  for (const u of rows) {
    if (u.state === 'chatting') {
      const p = rows.find((r) => r.id === u.partner_id);
      assert.equal(p.partner_id, u.id, 'juftlik simmetrik');
      assert.equal(p.chat_id, u.chat_id);
    }
  }
  const chatting = rows.filter((u) => u.state === 'chatting').length;
  const queued = raw().prepare('SELECT count(*) AS c FROM queue').get().c;
  assert.equal(chatting + queued, 200);
  const open = raw().prepare('SELECT count(*) AS c FROM chats WHERE ended_at IS NULL').get().c;
  assert.equal(open * 2, chatting);
  // premium filtrlar buzilmagan
  for (const u of rows.filter((r) => r.state === 'chatting' && r.last_want !== 'any')) {
    assert.equal(user(u.partner_id).gender, u.last_want);
  }
});

test("Stars to'lovi: tekshiruv, faollashtirish, takroriy update", async () => {
  await register(1, 'm', 25);
  await press(1, 'buy:m1');
  const inv = calls.find((c) => c.method === 'sendInvoice').params;
  assert.equal(inv.currency, 'XTR');
  assert.equal(inv.prices[0].amount, 150);

  await bot.handle('pre_checkout_query', {
    id: 'q1', from: from(1), currency: 'XTR', total_amount: 150, invoice_payload: inv.payload,
  }, {});
  assert.equal(calls.at(-1).params.ok, true);
  await bot.handle('pre_checkout_query', {
    id: 'q2', from: from(1), currency: 'XTR', total_amount: 1, invoice_payload: inv.payload,
  }, {});
  assert.equal(calls.at(-1).params.ok, false);

  const sp = { currency: 'XTR', total_amount: 150, invoice_payload: inv.payload, telegram_payment_charge_id: 'ch_1' };
  await send(1, undefined, { successful_payment: sp });
  await send(1, undefined, { successful_payment: sp }); // takroriy
  const u = user(1);
  const days = (u.premium_until - Math.floor(Date.now() / 1000)) / 86400;
  assert.ok(days > 29.9 && days <= 30, `30 kun, olindi ${days}`);
  assert.equal(raw().prepare('SELECT count(*) AS c FROM payments').get().c, 1);

  config.adminIds.push(999);
  await register(999, 'm', 40);
  await send(999, '/refund ch_1');
  assert.ok(calls.some((c) => c.method === 'refundStarsPayment' && c.params.telegram_payment_charge_id === 'ch_1'));
  assert.ok(user(1).premium_until <= Math.floor(Date.now() / 1000) + 5);
  config.adminIds.pop();
});

test(`shikoyat: ${config.autoBanReports} ta shikoyatdan keyin avtomatik ban`, async () => {
  await register(1, 'f', 22);
  for (let i = 0; i < config.autoBanReports; i++) {
    const r = 10 + i;
    await register(r, 'm', 25);
    await send(1, '/search');
    await send(r, '/search');
    await send(r, '/stop');
    const chatId = raw().prepare('SELECT max(id) AS id FROM chats').get().id;
    await press(r, `repr:${chatId}:abuse`);
    await press(r, `repr:${chatId}:abuse`); // takroriy — hisoblanmaydi
  }
  assert.equal(user(1).reports, config.autoBanReports);
  assert.equal(user(1).banned, 1);
  await send(1, '/search');
  assert.match(lastTo(1), /bloklangansiz/);
  assert.equal(user(1).state, 'idle');
});

test('/settings: bitta o\'zgartirishdan keyin yopiladi; Orqaga ishlaydi; tugmalar rangsiz', async () => {
  const edits = () => calls.filter((c) => c.method === 'editMessageText');
  const lastEdit = () => edits().at(-1).params;
  await register(1, 'm', 25);

  await send(1, '/settings');
  assert.equal(lastTo(1), "Qaysi sozlamani o'zgartirasiz:");
  const kb = calls.at(-1).params.reply_markup.inline_keyboard;
  assert.deepEqual(kb.map((r) => r.map((b) => [b.text, b.callback_data, b.style])),
    [[['Jinsimni 👩', 'set:gender', undefined]], [['Yoshimni', 'set:age', undefined]], [['Orqaga', 'set:close', undefined]]]);
  assert.ok(kb.flat().every((b) => b.icon_custom_emoji_id));

  // Jins: o'sha xabar tahrirlanadi, tanlangach "saqlandi" va tugmalarsiz yopiladi.
  await press(1, 'set:gender');
  assert.match(lastEdit().text, /Jinsingizni tanlang/);
  await press(1, 'set:gender:f');
  assert.equal(user(1).gender, 'f');
  assert.equal(lastEdit().text, '✅ Muvaffaqiyatli saqlandi.');
  assert.equal(lastEdit().reply_markup, undefined);

  // Orqaga: jins tanlashdan bosh menyuga, bosh menyudan — xabar o'chadi.
  await press(1, 'set:gender');
  await press(1, 'set:menu');
  assert.equal(lastEdit().text, "Qaysi sozlamani o'zgartirasiz:");
  await press(1, 'set:close');
  assert.equal(calls.at(-1).method, 'deleteMessage');

  // Yosh: noto'g'ri raqam — qayta so'raydi; to'g'ri — saqlanadi va yopiladi.
  await press(1, 'set:age');
  assert.match(lastEdit().text, /Yoshingizni yozing/);
  assert.ok(user(1).step.startsWith('set_age'));
  await send(1, '12');
  assert.match(lastTo(1), /18 dan 99 gacha/);
  await send(1, '30');
  assert.equal(user(1).age, 30);
  assert.equal(user(1).step, null);
  assert.equal(lastTo(1), '✅ Muvaffaqiyatli saqlandi.');
  await send(1, '40'); // yopilgan — endi yosh sifatida qabul qilinmaydi
  assert.equal(user(1).age, 30);

  // Yosh kiritish o'rtasida menyu tugmasi bosilsa — bekor bo'ladi va tugma ishlaydi.
  await press(1, 'set:age');
  await register(2, 'f', 20);
  await send(1, 'Suhbatdosh qidirish');
  assert.equal(user(1).step, null);
  assert.equal(user(1).state, 'searching');
  await send(2, '/search');
  await press(1, 'set:gender');
  assert.match(lastEdit().text, /sozlamalarni o'zgartirib bo'lmaydi/);
});

test("/help, /profile o'chirilgan; menyuda Profil/Yordam yo'q; suhbat tugaganda shikoyat tugmasi bor", async () => {
  await register(1, 'm', 25);
  for (const cmd of ['/help', '/profile', 'Profil', 'ℹ️ Yordam']) {
    await send(1, cmd);
    assert.match(lastTo(1), /Bosh menyu/, cmd);
  }
  const kb = calls.filter((c) => c.params?.reply_markup?.keyboard).at(-1).params.reply_markup.keyboard.flat();
  assert.deepEqual(kb.map((b) => b.text).filter((t) => /Profil|Yordam/.test(t)), []);

  await register(2, 'f', 22);
  await send(1, '/search');
  await send(2, '/search');
  await send(1, '/stop');
  const inl = calls.flatMap((c) => c.params?.reply_markup?.inline_keyboard?.flat() || []);
  assert.equal(inl.filter((b) => /^rep:/.test(b.callback_data)).length, 2); // ikkala tomonga
  await send(1, '/report');
  assert.match(lastTo(1), /Shikoyat sababini tanlang/);
});

test('plagin qo\'shish: yadroga tegmasdan yangi buyruq va hodisa', async () => {
  const seen = [];
  const { plugins } = await import('../tgcloud/lib/plugins/index.js');
  const hello = {
    name: 'hello',
    setup(b) {
      b.command('hello', (ctx) => ctx.reply('hi!'));
      b.onEvent('chat:start', ({ chatId }) => seen.push(chatId));
    },
  };
  const list = [...plugins];
  list.splice(list.length - 2, 0, hello);
  bot = createBot(list);
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await send(1, '/hello');
  assert.equal(lastTo(1), 'hi!');
  await send(1, '/search');
  await send(2, '/search');
  assert.equal(seen.length, 1);
});


test('admin /users ro\'yxati 10 tadan sahifalaydi va Telegram ID ko\'rsatadi', async () => {
  config.adminIds.push(999);
  await register(999, 'm', 40);
  for (let id = 2000; id < 2013; id++) await register(id, id % 2 ? 'm' : 'f', 20 + (id % 10));

  await send(999, '/users');
  assert.match(lastTo(999), /Foydalanuvchilar/);
  assert.match(lastTo(999), /Jami: <b>14<\/b>/);
  assert.match(lastTo(999), /Sahifa: <b>1\/2<\/b>/);
  assert.match(lastTo(999), /ID: <code>2012<\/code>/);
  assert.doesNotMatch(lastTo(999), /ID: <code>2002<\/code>/);
  const firstKeyboard = calls.filter((c) => c.method === 'sendMessage' && c.params.chat_id === 999).at(-1).params.reply_markup.inline_keyboard;
  assert.equal(firstKeyboard[0][0].callback_data, 'adminusers:2');

  await press(999, 'adminusers:2');
  assert.match(calls.filter((c) => c.method === 'editMessageText').at(-1).params.text, /Sahifa: <b>2\/2<\/b>/);
  assert.match(calls.filter((c) => c.method === 'editMessageText').at(-1).params.text, /ID: <code>2000<\/code>/);

  await send(2000, '/users');
  assert.match(lastTo(2000), /menu|Asosiy|Bosh menyu/i);
  config.adminIds.pop();
});

test('premium emoji: barcha tugmalarda icon_custom_emoji_id, matnda oddiy emoji yo\'q', async () => {
  const { BUTTON_EMOJI } = await import('../tgcloud/lib/core/emoji.js');
  const ids = new Set(Object.values(BUTTON_EMOJI));
  const emojiRe = /\p{Extended_Pictographic}/u;
  const buttonsOf = (c) => {
    const rm = c.params?.reply_markup;
    return rm ? [...(rm.keyboard || []), ...(rm.inline_keyboard || [])].flat() : [];
  };

  config.adminIds.push(998);
  await register(998, 'm', 30);   // jins tugmalari + bosh menyu
  await register(997, 'f', 25);
  makePremium(998);
  await send(998, '/vip');          // tarif tugmalari (⭐)
  await send(998, '/settings');     // ✏️ tugmalari
  await send(998, '/search');       // ❌ bekor qilish
  await send(997, '/search');       // ⏭ / ⛔ (suhbat)
  await send(998, '/stop');         // ⚠️ shikoyat
  for (let id = 3000; id < 3011; id++) await register(id, 'm', 20);
  await send(998, '/users');        // ➡️ keyingi
  await press(998, 'adminusers:2'); // ⬅️ oldingi

  const all = calls.flatMap(buttonsOf).concat(calls.filter((c) => c.method === 'editMessageText').flatMap(buttonsOf));
  const withEmoji = all.filter((b) => !(b.text.startsWith('Spam') || ['Haqorat', '18+ kontent', 'Boshqa'].includes(b.text)));
  assert.ok(withEmoji.length >= 15, `tugmalar soni: ${withEmoji.length}`);
  for (const b of withEmoji) {
    assert.ok(ids.has(b.icon_custom_emoji_id), `ikonka yo'q: ${JSON.stringify(b)}`);
    assert.doesNotMatch(b.text, new RegExp('^' + emojiRe.source, 'u'), `matn boshida emoji qoldi: ${b.text}`);
  }
  config.adminIds.pop();
});

test('premium emoji: emojisiz va eski (emojili) tugma matnlari ham ishlaydi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await send(1, 'Suhbatdosh qidirish');           // yangi tugma (ikonka + matn)
  assert.equal(user(1).state, 'searching');
  await send(1, '❌ Qidiruvni bekor qilish');      // eski klaviatura
  assert.equal(user(1).state, 'idle');
  await send(1, '🔎 Suhbatdosh qidirish');
  await send(2, 'Suhbatdosh qidirish');
  assert.equal(user(1).state, 'chatting');
  await send(1, 'Suhbatni tugatish');
  assert.equal(user(1).state, 'idle');
  await send(1, '/settings');
  assert.match(lastTo(1), /Qaysi sozlamani/);
});

test('premium emoji: config.premiumEmojiButtons = false bo\'lsa oddiy emojilar qoladi', async () => {
  config.premiumEmojiButtons = false;
  try {
    await register(1, 'm', 25);
    const kb = calls.filter((c) => c.params?.reply_markup?.keyboard).at(-1).params.reply_markup.keyboard;
    assert.equal(kb[0][0].text, '🔎 Suhbatdosh qidirish');
    assert.equal(kb[0][0].icon_custom_emoji_id, undefined);
  } finally {
    config.premiumEmojiButtons = true;
  }
});

test("VIP: /vip, /premium va eski '⭐ Premium' tugmasi tariflarni ochadi; matnda Premium yo'q", async () => {
  await register(1, 'm', 25);
  for (const msg of ['/vip', '/premium', '⭐ Premium', 'VIP', '💎 VIP']) {
    await send(1, msg);
    assert.match(lastTo(1), /💎 <b>VIP<\/b>/, msg);
  }
  const { default: uz } = await import('../tgcloud/lib/locales/uz.js');
  for (const [k, v] of Object.entries(uz)) assert.doesNotMatch(v, /premium/i, k);
});

test('rangli tugmalar: menyu va inline tugmalarda style, o\'chirsa yo\'qoladi', async () => {
  const { menuFor, btn } = await import('../tgcloud/lib/core/keyboards.js');
  const allowed = new Set(['primary', 'success', 'danger', undefined]);
  const styles = [];
  for (const s of ['idle', 'searching', 'chatting']) {
    for (const b of menuFor({ lang: 'uz' }, s).keyboard.flat()) {
      assert.ok(allowed.has(b.style), b.text);
      styles.push(b.style);
    }
  }
  assert.ok(new Set(styles.filter(Boolean)).size === 3, 'uchala rang ham ishlatilgan');
  assert.equal(btn('❌ Bekor', 'x').style, undefined); // inline tugmalar rangsiz
  config.coloredButtons = false;
  try {
    assert.equal(menuFor({ lang: 'uz' }, 'chatting').keyboard[0][1].style, undefined);
  } finally {
    config.coloredButtons = true;
  }
});
