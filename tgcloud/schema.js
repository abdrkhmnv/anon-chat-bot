// tgcloud/schema.js — ma'lumotlar bazasi sxemasi (SQLite).
//
// Qoidalar (platforma talabi):
//  - jadvallar named export bo'lishi shart;
//  - foreign key YO'Q (platforma ruxsat bermaydi) — bog'liqlik kodda nazorat qilinadi;
//  - ustun/jadvalni o'chirish faqat `.deprecated('sabab')` orqali;
//  - yangi ustun/jadval qo'shish xavfsiz: `npx tgcloud push` + `npx tgcloud migrate`.
//
// Yangi funksiya (plagin) o'z jadvaliga muhtoj bo'lsa — shu faylga yangi jadval
// qo'shiladi, mavjudlariga tegilmaydi.

import { table, integer, text, index } from 'sdk/db';

// Foydalanuvchilar. `id` = Telegram user id.
export const users = table('users', {
  id:           integer('id').primaryKey(),
  firstName:    text('first_name'),
  username:     text('username'),
  lang:         text('lang').default('uz'),
  gender:       text('gender'),                       // 'm' | 'f' | null (hali tanlanmagan)
  age:          integer('age'),
  step:         text('step'),                         // ro'yxatdan o'tish / dialog bosqichi
  state:        text('state').notNull().default('idle'), // 'idle' | 'searching' | 'chatting'
  lastWant:     text('last_want').notNull().default('any'), // oxirgi qidiruv filtri ('any'|'m'|'f')
  partnerId:    integer('partner_id'),                // suhbatdosh id (chatting holatida)
  chatId:       integer('chat_id'),                   // joriy chats.id
  premiumUntil: integer('premium_until').notNull().default(0), // unix sekund
  banned:       integer('banned').notNull().default(0),
  reports:      integer('reports').notNull().default(0),
  chatsCount:   integer('chats_count').notNull().default(0),
  createdAt:    integer('created_at').notNull().default(0),
  lastSeenAt:   integer('last_seen_at').notNull().default(0),
}, (t) => ({
  stateIdx:   index('idx_users_state').on(t.state),
  premiumIdx: index('idx_users_premium').on(t.premiumUntil),
}));

// Kutish navbati. Bir foydalanuvchi — bitta yozuv.
//  wantGender: 'any' | 'm' | 'f' — kimni qidiryapti (faqat premium 'm'/'f' qila oladi)
export const queue = table('queue', {
  userId:     integer('user_id').primaryKey(),
  gender:     text('gender'),
  age:        integer('age'),
  wantGender: text('want_gender').notNull().default('any'),
  premium:    integer('premium').notNull().default(0),
  createdAt:  integer('created_at').notNull(),           // unix MILLIsekund
}, (t) => ({
  // Navbatdan qidirish shu indekslar orqali tez ishlaydi.
  genderIdx:  index('idx_queue_gender_created').on(t.gender, t.createdAt),
  createdIdx: index('idx_queue_created').on(t.createdAt),
}));

// Suhbatlar tarixi (statistika, shikoyatlar uchun).
export const chats = table('chats', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userA:     integer('user_a').notNull(),
  userB:     integer('user_b').notNull(),
  startedAt: integer('started_at').notNull(),
  endedAt:   integer('ended_at'),
  endedBy:   integer('ended_by'),
  messages:  integer('messages').notNull().default(0),
}, (t) => ({
  userAIdx: index('idx_chats_user_a').on(t.userA),
  userBIdx: index('idx_chats_user_b').on(t.userB),
}));

// Telegram Stars to'lovlari. charge_id unikal — bitta to'lov ikki marta hisoblanmaydi.
export const payments = table('payments', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull(),
  planId:    text('plan_id').notNull(),
  amount:    integer('amount').notNull(),          // Stars soni
  chargeId:  text('charge_id').notNull().unique(), // telegram_payment_charge_id
  days:      integer('days').notNull(),
  refunded:  integer('refunded').notNull().default(0),
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  userIdx: index('idx_payments_user').on(t.userId),
}));

// Shikoyatlar.
export const reports = table('reports', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  chatId:     integer('chat_id'),
  reporterId: integer('reporter_id').notNull(),
  targetId:   integer('target_id').notNull(),
  reason:     text('reason'),
  createdAt:  integer('created_at').notNull(),
}, (t) => ({
  targetIdx: index('idx_reports_target').on(t.targetId),
  pairIdx:   index('idx_reports_pair').on(t.reporterId, t.chatId),
}));

// Ommaviy xabarlar (broadcast).
export const broadcasts = table('broadcasts', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  adminId:    integer('admin_id').notNull(),
  fromChatId: integer('from_chat_id').notNull(),
  messageId:  integer('message_id').notNull(),
  audience:   text('audience').notNull().default('all'),
  status:     text('status').notNull().default('draft'),
  cursorId:   integer('cursor_id').notNull().default(0),
  prevCursor: integer('prev_cursor').notNull().default(0),
  total:      integer('total').notNull().default(0),
  sent:       integer('sent').notNull().default(0),
  failed:     integer('failed').notNull().default(0),
  lastTick:   integer('last_tick').notNull().default(0),
  createdAt:  integer('created_at').notNull(),
  finishedAt: integer('finished_at'),
}, (t) => ({
  statusIdx: index('idx_broadcasts_status').on(t.status),
}));

// Kalit-qiymat ombori: plaginlar o'z sozlamalari/holatini sxemani o'zgartirmasdan
// saqlashi uchun (masalan, `plugin:referral:<userId>`).
export const kv = table('kv', {
  key:       text('key').primaryKey(),
  value:     text('value'),
  expiresAt: integer('expires_at').notNull().default(0), // 0 = muddatsiz
});
