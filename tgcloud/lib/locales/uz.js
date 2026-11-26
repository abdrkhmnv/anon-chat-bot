// lib/locales/uz.js — o'zbekcha matnlar. HTML formatlash ishlatiladi.

export default {
  // umumiy
  'error.generic': '⚠️ Xatolik yuz berdi. Birozdan so\'ng qayta urinib ko\'ring.',
  'error.banned': '🚫 Siz qoidalarni buzganingiz uchun bloklangansiz.\nE\'tiroz uchun: {support}',
  'gender.m': 'Yigit',
  'gender.f': 'Qiz',

  // tugmalar (reply keyboard)
  'btn.search': '🔎 Suhbatdosh qidirish',
  'btn.search_f': '👩 Qiz qidirish',
  'btn.search_m': '👨 Yigit qidirish',
  'btn.premium': '⭐ Premium',
  'btn.profile': '👤 Profil',
  'btn.help': 'ℹ️ Yordam',
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

  // bosh menyu / yordam
  'menu.main': '🏠 Bosh menyu. Quyidagi tugmalardan foydalaning.',
  'help.text':
    '<b>Qanday ishlaydi?</b>\n'
    + '🔎 /search — tasodifiy suhbatdosh topish\n'
    + '⏭ /next — joriy suhbatni tugatib, yangisini qidirish\n'
    + '⛔ /stop — suhbatni yoki qidiruvni to\'xtatish\n'
    + '👩 /girl, 👨 /boy — jins bo\'yicha qidirish (⭐ Premium)\n'
    + '👤 /profile — profilingiz\n'
    + '⭐ /premium — Premium tariflar\n'
    + '⚠️ /report — oxirgi suhbatdoshdan shikoyat\n'
    + '📄 /terms — foydalanish shartlari\n'
    + '💳 /paysupport — to\'lov bo\'yicha yordam\n\n'
    + 'Suhbatdoshingiz siz kimligingizni bilmaydi: ismingiz, username va raqamingiz ko\'rinmaydi.',
  'terms.text':
    '<b>Foydalanish shartlari</b>\n\n'
    + '1. Bot faqat {minAge} yoshdan katta foydalanuvchilar uchun.\n'
    + '2. Haqorat, tahdid, spam, reklama, noqonuniy kontent taqiqlanadi.\n'
    + '3. Qoidabuzarlar ogohlantirishsiz bloklanadi; bloklanganda Premium qaytarilmaydi.\n'
    + '4. Premium — raqamli xizmat, Telegram Stars orqali to\'lanadi va tanlangan muddat davomida amal qiladi.\n'
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
  'search.premium_only': '⭐ Jins bo\'yicha qidirish faqat <b>Premium</b> foydalanuvchilar uchun.\n\nPremium bilan:\n• qiz yoki yigitni tanlab qidirasiz\n• suhbatdoshning jinsi va yoshini ko\'rasiz',
  'chat.found': '✅ <b>Suhbatdosh topildi!</b>\nSalom bering 👋\n\n/next — keyingisi, /stop — tugatish',
  'chat.found_premium': '✅ <b>Suhbatdosh topildi!</b>\n{gender}, {age} yosh\nSalom bering 👋\n\n/next — keyingisi, /stop — tugatish',
  'chat.ended_by_you': '⛔ Suhbat tugatildi.',
  'chat.ended_by_partner': '⛔ Suhbatdosh suhbatni tugatdi.',
  'chat.partner_unavailable': '⛔ Suhbatdosh botni bloklagani uchun suhbat tugadi.',
  'chat.after': 'Yangi suhbatdosh topish uchun /search bosing.',
  'chat.cant_copy': '❗ Bu turdagi xabarni yuborib bo\'lmaydi.',
  'search.premium_tip': '💡 Premium bilan qiz yoki yigitni tanlab qidirishingiz mumkin: /premium',

  // profil
  'profile.text': '👤 <b>Profilingiz</b>\n\nJins: {gender}\nYosh: {age}\nSuhbatlar soni: {chats}\nTarif: {plan}',
  'profile.plan_free': 'Oddiy',
  'profile.plan_premium': '⭐ Premium ({until} gacha)',
  'profile.btn_age': '✏️ Yoshni o\'zgartirish',
  'profile.btn_gender': '✏️ Jinsni o\'zgartirish',
  'profile.busy': 'Suhbat yoki qidiruv vaqtida profilni o\'zgartirib bo\'lmaydi.',
  'profile.saved': '✅ Saqlandi.',

  // premium
  'premium.text': '⭐ <b>Premium</b>\n\n• 👩👨 Jins bo\'yicha qidirish\n• 🎂 Suhbatdoshning jinsi va yoshini ko\'rish\n\n{status}\n\nTarifni tanlang (to\'lov Telegram Stars ⭐ orqali):',
  'premium.status_free': 'Hozirgi tarif: Oddiy',
  'premium.status_active': 'Premium faol: <b>{until}</b> gacha. Yangi xarid muddatni uzaytiradi.',
  'premium.plan_btn': '{title} — {stars} ⭐',
  'plan.d3': '3 kun',
  'plan.w1': '1 hafta',
  'plan.m1': '1 oy',
  'plan.m3': '3 oy',
  'plan.m6': '6 oy',
  'plan.m12': '12 oy',
  'premium.invoice_title': 'Premium — {title}',
  'premium.invoice_desc': 'Jins bo\'yicha qidirish va suhbatdosh jinsi/yoshini ko\'rish. Muddat: {title}.',
  'premium.bad_invoice': 'Bu tarif eskirgan. /premium orqali qaytadan tanlang.',
  'premium.success': '🎉 <b>Rahmat!</b> Premium faollashtirildi.\nAmal qilish muddati: <b>{until}</b> gacha.',
  'premium.refunded': '↩️ To\'lovingiz qaytarildi ({stars} ⭐). Premium muddati qisqartirildi.',

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
