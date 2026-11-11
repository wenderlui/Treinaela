// App instalável do iPhone (PWA): manifesto, ícones, offline e atualização
const { test, expect } = require('./helpers');
const PWA = 'http://127.0.0.1:8766/';
test.describe('App do iPhone (PWA)', () => {
  test('manifesto e ícones válidos', async ({ page, request }) => {
    const m = await (await request.get(PWA + 'manifest.json')).json();
    expect(m.name).toBe('Treina Ela'); expect(m.display).toBe('standalone'); expect(m.start_url).toBe('./');
    for (const i of m.icons) { const r = await request.get(PWA + i.src); expect(r.ok()).toBeTruthy(); expect(r.headers()['content-type']).toContain('png'); }
    expect((await request.get(PWA + 'icons/icon-180.png')).ok()).toBeTruthy();
    await page.goto(PWA);
    expect(await page.getAttribute('link[rel="apple-touch-icon"]', 'href')).toBe('icons/icon-180.png');
    expect(await page.getAttribute('meta[name="apple-mobile-web-app-capable"]', 'content')).toBe('yes');
  });
  test('funciona sem internet depois da primeira abertura', async ({ page, context }) => {
    await page.goto(PWA);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.click('#goal-gluteo');
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('#v-treino')).toBeVisible();
    await expect(page.locator('canvas.demo')).toHaveCount(4);
    expect(page.errs.filter(e => !/Failed to load|ERR_INTERNET/.test(e))).toEqual([]);
  });
  test('versão do cache acompanha a versão do app (atualiza sozinho)', async ({ request, page }) => {
    const sw = await (await request.get(PWA + 'sw.js')).text();
    await page.goto(PWA);
    const v = await page.evaluate(() => VERSAO);
    expect(sw).toContain('treina-ela-' + v);
  });
  test('página e app do iPhone têm o mesmo código', async ({ request }) => {
    const a = await (await request.get('http://127.0.0.1:8765/index.html')).text();
    const b = await (await request.get(PWA + 'index.html')).text();
    const js = t => t.slice(t.indexOf('<script>'), t.lastIndexOf('</script>')).replace(/\nif\('serviceWorker'.*\n/, '\n');
    expect(js(b)).toBe(js(a));
  });
});
