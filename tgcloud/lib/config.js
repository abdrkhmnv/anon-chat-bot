// lib/config.js — botning barcha sozlamalari bir joyda.
// Platformada muhit o'zgaruvchilari yo'q, shuning uchun sozlamalar shu faylda.
// Bu faylda maxfiy ma'lumot (token va h.k.) saqlamang — bot tokeni kerak emas,
// platforma `api` ni o'zi avtorizatsiya qiladi.

export const config = {
  // Administratorlarning Telegram ID raqamlari (admin buyruqlari uchun).
  // O'zingizning ID'ingizni @userinfobot orqali bilib, shu yerga yozing.
  adminIds: [5375243478],

  defaultLang: 'uz',

  // Tugmalardagi emojilarni premium (custom) emojiga almashtirish (lib/core/emoji.js).
  // Bot egasida Telegram Premium bo'lishi shart. false = oddiy emojilar qoladi.
  premiumEmojiButtons: true,

  // Minimal / maksimal yosh. Tanishuv boti — 18+ tavsiya etiladi.
  minAge: 18,
  maxAge: 99,

  // Navbatdagi yozuv shuncha sekunddan eski bo'lsa, "o'lik" hisoblanadi
  // (foydalanuvchi qidiruvni unutib ketgan) va tanlovga kirmaydi.
  

  // Qancha shikoyatdan keyin foydalanuvchi avtomatik bloklanadi.
  autoBanReports: 5,

  // Premium tariflar. `stars` — narx (Telegram Stars, XTR), `days` — muddat.
  // Narxlarni xohlagancha o'zgartiring; yangi tarif qo'shish = shu ro'yxatga qator qo'shish.
  plans: [
    { id: 'd3',  days: 3,   stars: 25 },
    { id: 'w1',  days: 7,   stars: 50 },
    { id: 'm1',  days: 30,  stars: 150 },
    { id: 'm3',  days: 90,  stars: 400 },
    { id: 'm6',  days: 180, stars: 700 },
    { id: 'm12', days: 365, stars: 1200 },
  ],

  broadcast: {
    chunkSize: 25,      // bitta bo'lakda nechta odam
    intervalMs: 1100,   // bo'laklar orasidagi vaqt (~20 xabar/soniya)
    adminLoopSec: 20,   // "Yuborish" bosilgach shu handlerda necha soniya yuborish
    paid: false,        // true = Telegram pullik broadcast (tezroq, Stars to'lanadi)
  },

  // To'lov bo'yicha murojaat uchun kontakt (/paysupport). Telegram talabi.
  supportContact: '@abdrkhmnv17',
};

export function getPlan(id) {
  return config.plans.find((p) => p.id === id) || null;
}

export function isAdmin(userId) {
  return config.adminIds.includes(Number(userId));
}
