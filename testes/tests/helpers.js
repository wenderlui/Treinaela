const base = require('@playwright/test');
const test = base.test.extend({
  page: async ({ page }, use) => {
    page.errs = [];
    page.on('pageerror', e => page.errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED|net::/.test(m.text())) page.errs.push('console: ' + m.text()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await use(page);
  },
});
const expect = base.expect;
async function abrir(page, { time, goal, storage, init } = {}) {
  if (time) await page.clock.install({ time: new Date(time) });
  if (storage !== undefined) await page.addInitScript(v => { if (!sessionStorage.getItem('__seed')) { sessionStorage.setItem('__seed', 1); localStorage.setItem('meutreino:v2', v); } }, typeof storage === 'string' ? storage : JSON.stringify(storage));
  if (init) await page.addInitScript(init);
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  if (goal) { await page.click('#goal-' + goal); }
}
const nav = async (p, v) => { if (v === 'dicas') { await p.click('nav.menu button[data-v="objetivo"]'); await p.click('#abrirDicas'); } else await p.click(`nav.menu button[data-v="${v}"]`); };
const txt = (p, s) => p.locator(s).first().innerText();
async function marcarDia(p, d) {
  await p.click('#tab-' + d);
  const n = await p.locator('.chk').count();
  for (let i = 0; i < n; i++) { const c = p.locator('.chk').nth(i); if (await c.getAttribute('aria-pressed') !== 'true') await c.click(); }
}
const estado = p => p.evaluate(() => JSON.parse(localStorage.getItem('meutreino:v2') || 'null'));
module.exports = { test, expect, abrir, nav, txt, marcarDia, estado };
