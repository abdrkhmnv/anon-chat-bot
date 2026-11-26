// sdk mock: api (chaqiruvlarni yozib boradi), BotApiError, db.
import db from './sdk-db.mjs';
export { db };

export class BotApiError extends Error {
  constructor(method, code, description, parameters) {
    super(description); this.method = method; this.code = code; this.description = description; this.parameters = parameters;
  }
}
export class InputFile {}
export class EndpointError extends Error {}

export const calls = [];
export const blocked = new Set(); // botni bloklagan foydalanuvchilar (403)
let msgId = 1000;

export function reset() { calls.length = 0; blocked.clear(); }

export const api = new Proxy({}, {
  get(_, method) {
    return async (params = {}) => {
      calls.push({ method, params });
      if (blocked.has(params.chat_id) && ['sendMessage', 'copyMessage', 'sendInvoice'].includes(method)) {
        throw new BotApiError(method, 403, 'Forbidden: bot was blocked by the user');
      }
      if (method === 'sendMessage' || method === 'copyMessage') return { message_id: ++msgId };
      return true;
    };
  },
});
