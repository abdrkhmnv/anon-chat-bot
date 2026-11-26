// 'sdk' va 'sdk/db' importlarini test mock'lariga yo'naltiradi.
const map = {
  sdk: new URL('./sdk.mjs', import.meta.url).href,
  'sdk/db': new URL('./sdk-db.mjs', import.meta.url).href,
  'sdk/api': new URL('./sdk.mjs', import.meta.url).href,
};
export async function resolve(specifier, context, next) {
  if (map[specifier]) return { url: map[specifier], shortCircuit: true };
  return next(specifier, context);
}
