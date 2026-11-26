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
  assert.match(textsTo(1).at(-2), /Tayyor/);
  assert.match(lastTo(1), /Qaysi viloyatdansiz/);   // viloyat — ixtiyoriy
  const u = user(1);
  assert.equal(u.gender, 'f');
  assert.equal(u.age, 21);
  await press(1, 'set:region:sam');
  assert.equal(user(1).region, 'sam');
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
    [[['👨 Jinsimni 👩', 'set:gender', undefined]], [['📅 Yoshimni', 'set:age', undefined]],
      [['📍 Viloyatimni', 'set:region', undefined]], [['🌐 Til / Язык', 'set:lang', undefined]],
      [['⬅️ Orqaga', 'set:close', undefined]]]);
  assert.ok(kb.flat().every((b) => !b.icon_custom_emoji_id)); // oddiy emojilar

  // Jins: o'sha xabar tahrirlanadi, tanlangach "saqlandi" va tugmalarsiz yopiladi.
  await press(1, 'set:gender');
  assert.match(lastEdit().text, /Jinsingizni tanlang/);
  assert.ok(lastEdit().reply_markup.inline_keyboard.flat().every((b) => !b.icon_custom_emoji_id));
  assert.equal(lastEdit().reply_markup.inline_keyboard[0][0].text, '👨 Yigit');
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
  const withEmoji = all.filter((b) => !(b.text.startsWith('Spam') || ['Haqorat', '18+ kontent', 'Boshqa'].includes(b.text))
    && !String(b.callback_data).startsWith('set:')); // /settings va viloyatlar — oddiy emojilar
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

// ------------------------------------------------------------------ v2

const chatPair = async (a, b) => { await send(a, '/search'); await send(b, '/search'); };
const copies = () => calls.filter((c) => c.method === 'copyMessage').length;

test('spam himoyasi: havola, @username, telefon, kontakt to\'siladi; oddiy matn o\'tadi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await chatPair(1, 2);
  const before = copies();
  for (const text of ['salom', '21 yoshdaman', 'soat 19:30 da', '2+2=4']) await send(1, text);
  assert.equal(copies() - before, 4);

  const bad = ['t.me/kanalim ga kiring', 'https://example.com', 'instagram.com/abc', 'yoz @username_1',
    '+998 90 123 45 67', '90-123-45-67 ga qo\'ng\'iroq qil', 'www.sayt.uz'];
  for (const text of bad) {
    const n = copies();
    await send(1, text);
    assert.equal(copies(), n, text);
    assert.match(lastTo(1), /yuborib bo'lmaydi/, text);
  }
  const n = copies();
  await send(1, '', { contact: { phone_number: '998901234567', first_name: 'A' } });
  await send(1, 'qara', { entities: [{ type: 'url', offset: 0, length: 4 }] });
  assert.equal(copies(), n);
});

test('VIP filtri: viloyat va yosh; ikki tomonlama; oddiy foydalanuvchida ishlamaydi', async () => {
  await register(1, 'm', 25);
  await send(1, '/filter');
  assert.ok(textsTo(1).some((t) => /Viloyat va yosh oralig'i bo'yicha qidirish faqat <b>VIP<\/b>/.test(t))); // oddiy — taklif
  assert.match(lastTo(1), /💎 <b>VIP<\/b>/);
  makePremium(1);
  await send(1, '/filter');
  assert.match(lastTo(1), /Qidiruv filtri/);
  await press(1, 'flt:region:sam');
  await press(1, 'flt:age:18-22');
  assert.deepEqual([user(1).want_region, user(1).age_min, user(1).age_max], ['sam', 18, 22]);

  await register(2, 'f', 21); await press(2, 'set:region:tsh');   // viloyat mos emas
  await register(3, 'f', 30); await press(3, 'set:region:sam');   // yosh mos emas
  await register(4, 'f', 20); await press(4, 'set:region:sam');   // mos
  await send(1, '/search');
  await send(2, '/search');
  await send(3, '/search');
  assert.equal(user(1).state, 'searching');
  assert.equal(user(3).partner_id, 2);   // 2 va 3 bir-biri bilan ulandi (filtrsiz)
  await send(4, '/search');
  assert.equal(user(4).partner_id, 1);

  // VIP tugasa — filtr e'tiborga olinmaydi.
  raw().prepare('UPDATE users SET premium_until = 0 WHERE id = 1').run();
  await send(1, '/stop');
  await register(5, 'f', 40); await press(5, 'set:region:tsh');
  await send(5, '/search');
  await send(1, '/search');
  assert.equal(user(1).partner_id, 5);

  await press(1, 'flt:reset');            // VIP emas — tozalashga ruxsat yo'q
  makePremium(1);
  await press(1, 'flt:reset');
  assert.deepEqual([user(1).want_region, user(1).age_min], [null, null]);
});

test('navbat: VIP oldinga o\'tadi, yomon baholi orqaga suriladi', async () => {
  // VIP: 1 (oddiy qiz) avval keldi, 2 (VIP qiz, faqat yigit qidiradi) keyin — bir-biriga mos emas.
  await register(1, 'f', 25);
  await register(2, 'f', 26); makePremium(2);
  await send(1, '/search');
  await send(2, '/boy');
  assert.equal(user(2).state, 'searching');
  await register(3, 'm', 30);
  await send(3, '/search');                 // ikkalasi ham mos — VIP ustun
  assert.equal(user(3).partner_id, 2);

  await send(1, '/stop');                  // navbatni bo'shatamiz
  // Jarima: navbat darajasida — avval kelgan yomon baholi (10) keyin kelgan (11) dan orqada.
  const { queueRepo } = await import('../tgcloud/lib/repo/queue.js');
  await queueRepo.join({ userId: 10, gender: 'f', age: 20, penalty: 1 });
  await queueRepo.join({ userId: 11, gender: 'f', age: 21 });
  await queueRepo.join({ userId: 12, gender: 'm', age: 22 });
  const p = await queueRepo.claimPartner(12, { boostMs: 30000, penaltyMs: 30000 });
  assert.equal(p.user_id, 11);
  // Jarimasiz — oddiy FIFO.
  await queueRepo.join({ userId: 13, gender: 'm', age: 22 });
  assert.equal((await queueRepo.claimPartner(13)).user_id, 10);
});

test('baho: suhbatdan keyin 👍/👎, bir marta, hisob yuritiladi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await chatPair(1, 2);
  await send(1, '/stop');
  const chatId = raw().prepare('SELECT max(id) AS id FROM chats').get().id;
  const kb = calls.filter((c) => c.params?.chat_id === 2 && c.params?.reply_markup?.inline_keyboard).at(-1)
    .params.reply_markup.inline_keyboard.flat();
  assert.deepEqual(kb.map((b) => b.callback_data), [`rate:${chatId}:1`, `rate:${chatId}:-1`, `rep:${chatId}`]);

  await press(2, `rate:${chatId}:-1`);
  await press(2, `rate:${chatId}:1`);       // takroriy — hisoblanmaydi
  await press(1, `rate:${chatId}:1`);
  assert.deepEqual([user(1).dislikes, user(1).likes, user(2).likes], [1, 0, 1]);
  assert.ok(calls.some((c) => c.method === 'editMessageReplyMarkup'));
  await press(3, `rate:${chatId}:1`);       // suhbat ishtirokchisi emas
  assert.equal(user(1).likes, 0);
});

test('onlayn soni: standart holatda o\'chiq, showOnline = true bo\'lsa ko\'rinadi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await register(3, 'm', 30);
  await chatPair(1, 2);
  await send(3, '/search');
  assert.doesNotMatch(lastTo(3), /Hozir faol|\{online\}/);
  await send(3, '/stop');
  config.showOnline = true;
  try {
    await send(3, '/search');
    assert.match(lastTo(3), /Hozir faol: <b>3<\/b>/);
    await send(3, 'nimadir');               // qidiruv vaqtida boshqa xabar
    assert.match(lastTo(3), /Hozir faol: <b>3<\/b>/);
  } finally {
    config.showOnline = false;
  }
});

test('jimlik: standart holatda o\'chiq; inactivityMin > 0 bo\'lsa suhbat yopiladi', async () => {
  await register(1, 'm', 25);
  await register(2, 'f', 22);
  await chatPair(1, 2);
  await send(1, 'salom');
  const chatId = user(1).chat_id;
  raw().prepare('UPDATE chats SET last_msg_at = unixepoch() - 3600 WHERE id = ?').run(chatId);
  assert.equal(await bot.services.match.sweepIdle({ force: true }), 0);   // standart: o'chiq (inactivityMin = 0)
  assert.equal(user(1).state, 'chatting');
  config.inactivityMin = 10;
  try {
  raw().prepare('UPDATE chats SET last_msg_at = unixepoch() WHERE id = ?').run(chatId);
  assert.ok(raw().prepare('SELECT last_msg_at FROM chats WHERE id = ?').get(chatId).last_msg_at > 0);
  assert.equal(await bot.services.match.sweepIdle({ force: true }), 0);   // hali faol

  raw().prepare('UPDATE chats SET last_msg_at = unixepoch() - ? WHERE id = ?').run(config.inactivityMin * 60 + 5, chatId);
  assert.equal(await bot.services.match.sweepIdle({ force: true }), 1);
  assert.equal(user(1).state, 'idle');
  assert.equal(user(2).state, 'idle');
  assert.ok(textsTo(1).some((t) => /daqiqa hech kim yozmagani/.test(t)));
  assert.ok(textsTo(2).some((t) => /daqiqa hech kim yozmagani/.test(t)));
  } finally {
    config.inactivityMin = 0;
  }
});

test('referal: 3 do\'st ro\'yxatdan o\'tsa 3 kun VIP; o\'zini taklif qilib bo\'lmaydi', async () => {
  config.botUsername = 'testbot';
  try {
    await register(1, 'm', 25);
    await send(1, '/invite');
    assert.match(lastTo(1), /https:\/\/t\.me\/testbot\?start=ref_1/);
    await send(1, '/start ref_1');                        // o'zini — hisoblanmaydi
    for (const id of [2, 3]) {
      await send(id, '/start ref_1');
      await press(id, 'reg:g:f');
      await send(id, '22');
    }
    assert.equal(user(1).referrals, 2);
    assert.match(lastTo(1), /yana 1 ta do'st qoldi/);
    assert.equal(user(1).premium_until, 0);
    await register(9, 'f', 23);                           // havolasiz — hisoblanmaydi
    await send(9, '/start ref_1');                        // ro'yxatdan o'tgan — hisoblanmaydi
    await send(4, '/start ref_1'); await press(4, 'reg:g:m'); await send(4, '30');
    assert.equal(user(1).referrals, 3);
    assert.ok(user(1).premium_until > Date.now() / 1000 + 2.9 * 86400);
    assert.match(lastTo(1), /3 kun VIP/);
  } finally {
    config.botUsername = '';
  }
});

test('rus tili: matnlar to\'liq; ru foydalanuvchi ruscha oladi; tilni almashtirish', async () => {
  const { default: uz } = await import('../tgcloud/lib/locales/uz.js');
  const { default: ru } = await import('../tgcloud/lib/locales/ru.js');
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(uz).sort());
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const k of Object.keys(uz)) assert.equal(ph(ru[k]), ph(uz[k]), k);

  const ruMsg = (id, text) => bot.handle('message', {
    message_id: nextMsg++, from: { id, is_bot: false, first_name: 'R', language_code: 'ru' },
    chat: { id, type: 'private' }, date: 0, text,
  }, {});
  await ruMsg(50, '/start');
  assert.match(lastTo(50), /Выберите ваш пол/);

  await register(1, 'm', 25);
  await press(1, 'set:lang:ru');
  assert.equal(user(1).lang, 'ru');
  assert.match(lastTo(1), /Главное меню/);
  const kb = calls.filter((c) => c.params?.reply_markup?.keyboard).at(-1).params.reply_markup.keyboard.flat();
  assert.ok(kb.some((b) => b.text === 'Найти собеседника'));
  await send(1, 'Найти собеседника');                     // ruscha tugma ishlaydi
  assert.equal(user(1).state, 'searching');
  await send(1, 'Qidiruvni bekor qilish');                // eski o'zbekcha tugma ham
  assert.equal(user(1).state, 'idle');
});

test('/setcommands: uz va ru buyruqlar ro\'yxati o\'rnatiladi', async () => {
  config.adminIds.push(777);
  try {
    await register(777, 'm', 30);
    await send(777, '/setcommands');
    const sets = calls.filter((c) => c.method === 'setMyCommands');
    assert.equal(sets.length, 2);
    assert.ok(sets[0].params.commands.some((c) => c.command === 'filter'));
    assert.equal(sets[1].params.language_code, 'ru');
    assert.equal(sets[1].params.commands.length, sets[0].params.commands.length);
  } finally {
    config.adminIds.pop();
  }
});
