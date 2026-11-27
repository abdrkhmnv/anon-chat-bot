# Anonim suhbat boti (Telegram Serverless)

Tasodifiy odamlar bir-biri bilan anonim gaplashadigan Telegram bot.
[Telegram Serverless](https://core.telegram.org/bots/serverless) (`tgcloud`) platformasida ishlaydi:
server, hosting va ma'lumotlar bazasini o'zingiz ko'tarmaysiz. Kod JavaScript,
ma'lumotlar bazasi platformaning o'zidagi SQLite.

## Imkoniyatlar

| | Oddiy (bepul) | 💎 VIP |
|---|---|---|
| Tasodifiy suhbatdosh qidirish | ✅ | ✅ |
| Jins bo'yicha qidirish (`/girl`, `/boy`) | ❌ | ✅ |
| Suhbatdoshning jinsi va yoshini ko'rish | ❌ | ✅ |
| Viloyat va yosh oralig'i bo'yicha qidirish (`/filter`, hozircha o'chiq — `vipFilters`) | ❌ | ✅ |
| Navbatda ustuvorlik (`vipBoostSec`) | ❌ | ✅ |

- VIP tariflari: **3 kun, 1 hafta, 1 oy, 3 oy, 6 oy, 12 oy**. To'lov **Telegram Stars (XTR)** bilan.
  Yangi xarid amaldagi muddat ustiga qo'shiladi.
- Ro'yxatdan o'tishda hamma jins va yoshini kiritadi. Bepul foydalanuvchilar ham kiritadi,
  aks holda VIP foydalanuvchi "qiz qidirish"ni bosganda navbatdan kimni tanlashni bilib bo'lmaydi.
- Filtr ikki tomonga ishlaydi. VIP yigit qiz qidirsa, unga faqat jinsi "qiz" deb
  ro'yxatdan o'tganlar ulanadi. VIP qiz yigit qidirayotgan bo'lsa, unga qiz ulanmaydi.
- Xabarlar `copyMessage` orqali uzatiladi, shuning uchun ism, username va "forwarded" belgisi ko'rinmaydi.
  Matn, rasm, video, ovozli xabar, stiker va boshqa turlar ishlaydi.
- **Spam himoyasi:** suhbatda havola, `@username`, telefon raqam va kontakt yuborib bo'lmaydi (`config.antispam`).
- **Baho:** suhbatdan keyin 👍/👎. Ko'p 👎 olganlar navbatda orqaroq turadi (`config.badRating`, `badPenaltySec`).
- **Jimlik (hozircha o'chiq):** `inactivityMin` daqiqa hech kim yozmasa, suhbat avtomatik yopiladi. Yoqish: `inactivityMin: 10`.
- **Onlayn soni (hozircha o'chiq):** qidiruv xabarida "🟢 Hozir faol: N kishi". Yoqish: `showOnline: true`.
- **Do'st taklif qilish (`/invite`):** har 3 ta ro'yxatdan o'tgan do'st uchun 3 kun VIP (`config.referral`).
- **Ikki til:** o'zbek va rus (`locales/uz.js`, `locales/ru.js`). Til Telegram tiliga qarab tanlanadi,
  `/settings` → "🌐 Til / Язык" orqali almashtiriladi.
- **Viloyat (hozircha o'chiq, `vipFilters`):** ro'yxatdan o'tgach ixtiyoriy so'raladi, `/settings` da o'zgartiriladi.
- Bundan tashqari: `/next`, `/stop`, `/settings` (jins, yosh, viloyat, til), shikoyat va avtomatik ban, admin buyruqlari
  (`/stats`, `/users`, `/user`, `/ban`, `/unban`, `/grant`, `/refund`), hamda Telegram to'lov
  qoidalari talab qiladigan `/terms` va `/paysupport`.

## Admin buyruqlari

Quyidagi buyruqlar faqat `tgcloud/lib/config.js` dagi `adminIds` ro'yxatiga kiritilgan Telegram ID'lar uchun ishlaydi:

- `/stats` — umumiy statistika.
- `/users` yoki `/users 2` — foydalanuvchilar ro'yxati, 10 tadan sahifalab; har bir foydalanuvchining Telegram ID'si ko'rsatiladi. Sahifalar inline tugmalar bilan almashadi.
- `/user <id>` — bitta foydalanuvchi va oxirgi to'lovlari.
- `/ban <id>` va `/unban <id>` — bloklash / blokdan chiqarish.
- `/grant <id> <kun>` — VIP muddatini qo'lda uzaytirish.
- `/refund <charge_id>` — Telegram Stars to'lovini qaytarish.
- `/queue` — qidiruv navbati: kim navbatda, "o'lik" qidiruvlar, baza migratsiyasi holati. `/queuefix` — ularni tozalaydi.
- `/setcommands` — "/" menyusidagi buyruqlar ro'yxatini darhol qayta o'rnatadi. Odatda shart emas: deploy'dan keyin bot ro'yxatni o'zi yangilaydi.

`/users` ro'yxati bazadagi `users` jadvalidan olinadi; foydalanuvchilar botga kamida bir marta yozgan bo'lishi kerak.

## O'rnatish va ishga tushirish

Node.js 22.5 yoki undan yangisi kerak (testlar `node:sqlite` dan foydalanadi; CLI'ning o'ziga 18+ yetadi).

1. Bog'liqliklarni o'rnating:
   ```bash
   npm install
   ```
2. CLI holat papkasini (`.tgcloud/`) yarating. Bu buyruq mavjud fayllarni o'zgartirmaydi:
   ```bash
   npx tgcloud init --no-git
   ```
3. @BotFather'da botingizni oching, **Serverless** bo'limini yoqing va tokenni oling. Keyin loyihani botga bog'lang:
   ```bash
   npx tgcloud login
   ```
4. `tgcloud/lib/config.js` faylida `adminIds` (o'zingizning Telegram ID'ingiz), `supportContact` va tarif narxlarini belgilang.
5. Kodni yuklang:
   ```bash
   npx tgcloud push
   ```
6. Ma'lumotlar bazasi jadvallarini yarating. Bu qadam interaktiv, faqat birinchi marta va sxema o'zgarganda kerak:
   ```bash
   npx tgcloud migrate
   ```
7. Webhook handlerlar bilan mos ekanini tekshiring:
   ```bash
   npx tgcloud webhook
   ```

Lokal testlar (platformasiz, soxta `sdk` bilan):
```bash
npm test
```

"/" menyusidagi buyruqlar `locales/uz.js` va `locales/ru.js` dagi `bot.commands` dan olinadi.
Ro'yxatni o'zgartirib deploy qilsangiz, bot birinchi kelgan xabardan keyin uni Telegram'da
o'zi yangilaydi (o'zbekcha — hamma uchun, ruscha — Telegram tili rus bo'lganlar uchun).

## GitHub'dan avtomatik deploy

`.github/workflows/deploy.yml` — `main` ga har push bo'lganda testlarni ishga tushiradi va
kodni `npx tgcloud push --force` bilan Telegram Serverless'ga yuklaydi.

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**:
   nomi `TGCLOUD_TOKEN`, qiymati — `npx tgcloud login` da kiritgan CLI tokeningiz.
2. **Actions** bo'limida workflow'ni yoqing; `Deploy to Telegram Serverless` → **Run workflow**
   bilan qo'lda ham ishga tushirish mumkin. Har deploy'dan keyin `tgcloud migrate --safe` avtomatik bajariladi
   (yangi ustun/jadvallar qo'shiladi; o'chirish kabi xavfli o'zgarishlar qo'llanmaydi).

Muhim: endi GitHub asosiy manba. Termux'dan to'g'ridan-to'g'ri `tgcloud push` qilingan, lekin
GitHub'ga tushmagan o'zgarishlar keyingi avtomatik deploy'da ustidan yoziladi.

## Tuzilma

```
tgcloud/
  schema.js                 ma'lumotlar bazasi jadvallari
  handlers/                 platforma kirish nuqtalari (fayl nomi = update turi)
    message.js  callback_query.js  pre_checkout_query.js  my_chat_member.js
  lib/
    app.js                  botni yig'ish (plaginlarni ulash)
    config.js               barcha sozlamalar: tariflar, adminlar, yosh chegarasi...
    core/                   YADRO: biznes-mantiqni bilmaydi
      bot.js                marshrutlash, middleware, plaginlar, hodisalar (event bus)
      context.js            ctx: reply/edit/answer/t(), ctx.user
      db.js  i18n.js  keyboards.js
    repo/                   SQL so'rovlari (users, queue, chats, payments, reports, kv)
    services/               mantiq: matchmaking.js (qidiruv/juftlash), premium.js (Stars)
    plugins/                FUNKSIYALAR: har biri alohida fayl
      index.js              yoqilgan plaginlar ro'yxati
      users  registration  help(/terms, /paysupport)  premium  settings  report  rating  filter  referral  antispam  admin  chat
    locales/uz.js           barcha matnlar
test/                       mock sdk + testlar
docs/tgcloud-sdk.md         platforma SDK ma'lumotnomasi
```

**Handler fayllar faqat yadroga uzatadi.** Barcha funksiyalar plaginlarda yozilgan.

## Yangi funksiya qo'shish

Yadroni ham, boshqa plaginlarni ham o'zgartirish kerak emas.

1. `tgcloud/lib/plugins/mening_funksiyam.js` faylini yarating:
   ```js
   import { kv } from '../repo/kv.js';

   export default {
     name: 'referral',
     setup(bot) {
       // yangi buyruq
       bot.command('invite', (ctx) =>
         ctx.reply(`Do'stlaringizni taklif qiling: https://t.me/BOT?start=ref${ctx.user.id}`));

       // mavjud hodisalarga obuna
       bot.onEvent('start', async ({ ctx, payload }) => {
         if (payload?.startsWith('ref') && ctx.user.__isNew) {
           await kv.set(`ref:${ctx.user.id}`, { by: Number(payload.slice(3)) });
         }
       });
       bot.onEvent('chat:start', async ({ a, b }) => { /* ... */ });
     },
   };
   ```
2. `tgcloud/lib/plugins/index.js` faylida ro'yxatga, `chat` dan oldin, bitta qator qo'shing.
3. Plaginga yangi jadval kerak bo'lsa, `schema.js` ga qo'shib `push` va `migrate` qiling. Kichik ma'lumot uchun `kv` omborining o'zi yetadi.

**Plagin API:**
- `bot.command(nom, fn)` — buyruq.
- `bot.hears(i18nKaliti, fn)` — tugma matni.
- `bot.action(prefiks, fn)` — inline tugma (`callback_data = "prefiks:arg"`).
- `bot.on('message' | 'successful_payment' | <istalgan update turi>, (ctx, next) => …)` — xabar va update'lar.
- `bot.use(mw)` — middleware.
- `bot.onEvent / bot.emit` — hodisalar.
- `bot.service(nom, obj)` — servis ro'yxatdan o'tkazish; boshqa plaginlar uni `bot.services.<nom>` orqali oladi.

**Tayyor hodisalar:**
- `start`
- `user:registered`
- `search:start`
- `chat:start`
- `chat:end`
- `relay:before` — `ctx.state.blockRelay = true` qilsangiz xabar uzatilmaydi. Antispam yoki link filtri uchun qulay.
- `premium:granted`
- `report:created`
- `user:banned`

Yangi update turi uchun (masalan `edited_message`) `tgcloud/handlers/edited_message.js` faylini
boshqa handlerlar kabi yarating va plaginda `bot.on('edited_message', ...)` bilan ushlang.

Yangi til qo'shish uchun `lib/locales/ru.js` yarating va uni `lib/core/i18n.js` dagi `locales` ga qo'shing.

## Yuklama (100 000 MAU) bo'yicha qarorlar

- **Juftlash bitta atomar SQL so'rovda bajariladi** (`queue.js → claimPartner`). Bir vaqtda
  yuzlab odam qidirsa ham hech kim ikki suhbatga tushmaydi. Testda 200 ta parallel qidiruv bilan tekshirilgan.
- **Suhbatdagi har bir xabar = 1 ta o'qish + 1 ta `copyMessage`.** Yozish yo'q:
  `last_seen_at` 5 daqiqada bir marta yangilanadi.
- Navbatda qidiruv indekslar orqali ishlaydi (`gender, created_at`).
- `/stop` ikki marta yoki ikkala tomondan bir vaqtda bosilsa ham suhbat bir marta yopiladi.
- Takroriy `successful_payment` VIP'ni ikki marta bermaydi, chunki `charge_id` unikal.
- Sherik botni bloklagan bo'lsa (403), suhbat avtomatik yopiladi. Telegram 429 qaytarsa, bir marta kutib qayta uriniladi.
- Platformada cron yo'q, shuning uchun 30 daqiqadan eski navbat yozuvlari qidiruv paytida
  tasodifiy (2%) tozalanadi va tanlovga kirmaydi.

## Bilib qo'yish kerak

- **Rasmiy hujjatni o'qib bo'lmadi**, chunki bu muhitdan core.telegram.org ochilmadi.
  Kod platformaning rasmiy CLI paketi `@tgcloud/cli@0.2.0` ichidagi SDK hujjatiga
  (`docs/tgcloud-sdk.md`, `AGENTS.md`) asoslangan. Birinchi `push` dan keyin
  `npx tgcloud run handlers/message '{...}'` bilan tekshirib ko'ring.
- SDK hujjatida tranzaksiya, cron va maxfiy o'zgaruvchilar (env) haqida hech narsa yo'q.
  Shuning uchun kod ularsiz ishlaydigan qilib yozilgan.
- Telegram Stars obunasi (`subscription_period`) faqat 30 kunlik bo'ladi. Shuning uchun barcha tariflar
  bir martalik to'lov, muddat esa bot ichida hisoblanadi. Avtomatik yangilanadigan oylik obuna kerak bo'lsa,
  uni alohida plagin qilib qo'shish mumkin.
- Ommaviy xabar yuborish (broadcast) kiritilmagan. 100 000 kishiga bitta handler ichidan yuborib
  bo'lmaydi. Buni navbat va bo'laklarga bo'lib yuboradigan alohida plagin sifatida qilish kerak.
