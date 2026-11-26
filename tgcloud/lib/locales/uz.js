// lib/locales/uz.js — o'zbekcha matnlar. HTML formatlash ishlatiladi.

export default {
  // umumiy
  'error.generic': '⚠️ Xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring.',
  'error.banned': '🚫 Siz qoidalarni buzganingiz uchun bloklangansiz.\nE\'tiroz uchun: {support}',
  'gender.m': 'Yigit',
  'gender.f': 'Qiz',

  // tugmalar (reply keyboard)
  'btn.search': '🔎 Suhbatdosh qidirish',
  'btn.search_f': '👩 Qiz bola qidirish',
  'btn.search_m': '👨 O\'g\'il bola qidirish',
  'btn.premium': '💎 VIP',
  'btn.next': '⏭ Keyingisi',
  'btn.stop': '⛔ Suhbatni tugatish',
  'btn.cancel': '❌ Qidiruvni bekor qilish',
  'btn.report': '⚠️ Shikoyat qilish',

  // ro'yxatdan o'tish
  'reg.welcome': '👋 <b>Anonim suhbat</b> botiga xush kelibsiz!\n\nBu yerda siz tasodifiy odam bilan butunlay anonim gaplasha olasiz. Boshlash uchun ikkita savolga javob bering.\n\n<b>Jinsingizni tanlang:</b>',
  'reg.ask_gender': '<b>Jinsingizni tanlang:</b>',
  'reg.ask_age': '<b>Yoshingizni yozing</b> (raqam bilan, {min}–{max}):',
  'reg.bad_age': '❗ Iltimos, yoshingizni {min} dan {max} gacha bo\'lgan raqam bilan yozing.',
  'reg.done': '✅ Tayyor! Endi suhbatdosh qidirishingiz mumkin.',

  // bosh menyu / shartlar
  'menu.main': '🏠 Bosh menyu. Quyidagi tugmalardan foydalaning.',
  'terms.text':
    '<b>Foydalanish shartlari</b>\n\n'
    + '1. Bot faqat {minAge} yoshdan katta foydalanuvchilar uchun.\n'
    + '2. Haqorat, tahdid, spam, reklama, noqonuniy kontent taqiqlanadi.\n'
    + '3. Qoidabuzarlar ogohlantirishsiz bloklanadi; bloklanganda VIP qaytarilmaydi.\n'
    + '4. VIP — raqamli xizmat, Telegram Stars orqali to\'lanadi va tanlangan muddat davomida amal qiladi.\n'
    + '5. To\'lov muammolari bo\'yicha: /paysupport.',
  'paysupport.text':
    '💳 <b>To\'lov bo\'yicha yordam</b>\n\nTo\'lov bilan bog\'liq muammo bo\'lsa, {support} ga yozing va quyidagi ma\'lumotni yuboring:\n<code>ID: {id}</code>\n\nE\'tibor bering: Telegram qo\'llab-quvvatlash xizmati bu botdagi xaridlar bo\'yicha yordam bera olmaydi.',

  // qidiruv / suhbat
  'search.searching': '🔎 Suhbatdosh qidirilmoqda...\nTopilishi bilan xabar beraman.',
  'search.searching_f': '🔎 <b>Qiz</b> suhbatdosh qidirilmoqda...',
  'search.searching_m': '🔎 <b>Yigit</b> suhbatdosh qidirilmoqda...',
  'search.already_chatting': '💬 Siz hozir suhbatdasiz. Avval /stop yoki /next bosing.',
  'search.cancelled': '❌ Qidiruv bekor qilindi.',
  'search.not_searching': 'Siz hozir qidiruvda ham, suhbatda ham emassiz.',
  'search.premium_only': '💎 Jins bo\'yicha qidirish faqat <b>VIP</b> foydalanuvchilar uchun.\n\nVIP bilan:\n• qiz yoki yigitni tanlab qidirasiz\n• suhbatdoshning jinsi va yoshini ko\'rasiz',
  'chat.found': 'Muloqotchi topildi 🦄\n\n/next — Boshqa muloqotchini izlash\n/stop — Muloqotni to\'xtatish\n/vip — Jinsini aniqlash💎',
  'chat.found_premium': 'Muloqotchi topildi 🦄\n💎 {gender}, {age} yosh\n\n/next — Boshqa muloqotchini izlash\n/stop — Muloqotni to\'xtatish',
  'chat.ended_by_you': '⛔ Suhbat tugatildi.',
  'chat.ended_by_partner': '⛔️ Muloqotchi siz bilan muloqotni uzdi, yangi muloqotchini izlash uchun 👉 /next',
  'chat.partner_unavailable': '⛔ Suhbatdosh botni bloklagani uchun suhbat tugadi.',
  'chat.after': 'Yangi suhbatdosh topish uchun /search bosing.',
  'chat.cant_copy': '❗ Bu turdagi xabarni yuborib bo\'lmaydi.',
  'search.premium_tip': '💡 VIP bilan qiz yoki yigitni tanlab qidirishingiz mumkin: /vip',

  // sozlamalar (/settings)
  'settings.text': 'Qaysi sozlamani o\'zgartirasiz:',
  'settings.btn_gender': '👨 Jinsimni 👩',
  'settings.btn_age': '📅 Yoshimni',
  'settings.btn_back': '⬅️ Orqaga',
  'settings.busy': 'Suhbat yoki qidiruv vaqtida sozlamalarni o\'zgartirib bo\'lmaydi.',
  'settings.saved': '✅ Muvaffaqiyatli saqlandi.',

  // premium
  'premium.text': '💎 <b>VIP</b>\n\n• 👩👨 Jins bo\'yicha qidirish\n• 🎂 Suhbatdoshning jinsi va yoshini ko\'rish\n\n{status}\n\nTarifni tanlang (to\'lov Telegram Stars ⭐ orqali):',
  'premium.status_free': 'Hozirgi tarif: Oddiy',
  'premium.status_active': 'VIP faol: <b>{until}</b> gacha. Yangi xarid muddatni uzaytiradi.',
  'premium.plan_btn': '{title} — {stars} ⭐',
  'plan.d3': '3 kun',
  'plan.w1': '1 hafta',
  'plan.m1': '1 oy',
  'plan.m3': '3 oy',
  'plan.m6': '6 oy',
  'plan.m12': '12 oy',
  'premium.invoice_title': 'VIP — {title}',
  'premium.invoice_desc': 'Jins bo\'yicha qidirish va suhbatdosh jinsi/yoshini ko\'rish. Muddat: {title}.',
  'premium.bad_invoice': 'Bu tarif eskirgan. /vip orqali qaytadan tanlang.',
  'premium.success': '🎉 <b>Rahmat!</b> VIP faollashtirildi.\nAmal qilish muddati: <b>{until}</b> gacha.',
  'premium.refunded': '↩️ To\'lovingiz qaytarildi ({stars} ⭐). VIP muddati qisqartirildi.',

  // shikoyat
  'report.ask': 'Shikoyat sababini tanlang:',
  'report.reason.spam': 'Spam / reklama',
  'report.reason.abuse': 'Haqorat',
  'report.reason.adult': '18+ kontent',
  'report.reason.other': 'Boshqa',
  'report.done': '✅ Shikoyatingiz qabul qilindi. Rahmat!',
  'report.dup': 'Siz bu suhbat bo\'yicha allaqachon shikoyat qilgansiz.',
  'report.nothing': 'Shikoyat qilish uchun suhbat topilmadi.',
};
