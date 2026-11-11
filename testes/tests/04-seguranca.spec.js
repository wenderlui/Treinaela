// Segurança: injeção de código, links, rede, dados
const { test, expect, abrir, nav, estado } = require('./helpers');
const XSS = '<img src=x onerror="window.__xss=1">';
test.describe('Segurança', () => {
  test('código malicioso salvo no aparelho não é executado', async ({ page }) => {
    await abrir(page, { storage: { goal: 'gluteo', cargas: { [XSS]: [['2026-11-01', 10]] }, medidas: [{ d: '2026-11-01', peso: 60, cintura: XSS }], ciclo: { inicio: XSS } } });
    await nav(page, 'progresso');
    await expect(page.locator('#cargas')).toContainText('<img');
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.locator('#cargas img').count()).toBe(0);
  });

  test('texto digitado no chat e nas medidas não vira código', async ({ page }) => {
    await abrir(page, { goal: 'gluteo', init: () => { window.claude = { use: async () => async (i, o) => { o.onText({ text: '<img src=x onerror="window.__xss=2">', delta: '' }); return { text: '<img src=x onerror="window.__xss=2">' }; } }; } });
    await page.click('#abrirIA'); await page.fill('#pergunta', XSS); await page.keyboard.press('Enter');
    await expect(page.locator('.msg.eu')).toContainText('<img');
    await expect(page.locator('.msg.ia').last()).toContainText('<img');
    expect(await page.locator('#chat img').count()).toBe(0);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  });

  test('nenhum atributo de evento inline no HTML gerado', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    for (const v of ['treino', 'progresso', 'alimentacao', 'ciclo', 'dicas', 'objetivo']) {
      await nav(page, v);
      const n = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => [...e.attributes].some(a => a.name.startsWith('on'))).length);
      expect(n).toBe(0);
    }
  });

  test('links externos: só https e com noopener', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => [a.href, a.target, a.rel]));
    expect(links.length).toBeGreaterThan(0);
    for (const [h, t, r] of links) {
      const interno = new URL(h).origin === new URL(page.url()).origin; // privacidade.html e termos.html do próprio app
      if (!interno) expect(h.startsWith('https://www.youtube.com/') || h.startsWith('https://www.google.com/'), h).toBeTruthy();
      expect(t).toBe('_blank'); expect(r).toContain('noopener'); }
  });

  test('app não envia dados para nenhum servidor', async ({ page }) => {
    const reqs = [];
    page.on('request', r => { const u = new URL(r.url()); if (u.host !== '127.0.0.1:8765') reqs.push(u.host); });
    await abrir(page, { goal: 'gluteo' });
    await page.locator('.chk').first().click();
    await nav(page, 'progresso'); await page.fill('#mPeso', '60'); await page.click('#formMedidas button[type=submit]');
    await page.waitForTimeout(500);
    expect([...new Set(reqs)].filter(h => !/fonts\.(googleapis|gstatic)\.com/.test(h))).toEqual([]);
  });

  test('código-fonte sem eval, new Function ou HTML montado com dados de fora', async ({ request }) => {
    const src = await (await request.get('/index.html')).text();
    const js = src.slice(src.indexOf('<script>'));
    expect(js).not.toMatch(/\beval\s*\(|new Function|setTimeout\s*\(\s*["'`]|document\.write/);
    // todo innerHTML usa só texto fixo do app (nunca nome de exercício, medida ou resposta da IA)
    const usos = js.match(/innerHTML\s*=\s*[^;]+/g) || [];
    for (const u of usos) expect(u).not.toMatch(/\$\{(n|s|dica|txt|text|m\.|h\[)/);
  });

  test('dados de saúde (ciclo, medidas) nunca vão para a IA', async ({ page }) => {
    await abrir(page, { goal: 'gluteo', init: () => { window.__p = []; window.claude = { use: async () => async (i, o) => { window.__p.push(JSON.stringify(i)); o.onText({ text: 'ok', delta: 'ok' }); return { text: 'ok' }; } }; } });
    await nav(page, 'progresso');
    await page.fill('#mPeso', '77.7'); await page.click('#formMedidas button[type=submit]');
    await nav(page, 'ciclo'); await page.fill('#cInicio', '2026-11-01'); await page.click('#formCiclo button[type=submit]');
    await nav(page, 'treino'); await page.click('.chips button[data-s="colica"]');
    await page.click('#abrirIA'); await page.fill('#pergunta', 'oi'); await page.keyboard.press('Enter');
    await expect(page.locator('.msg.ia').last()).toHaveText('ok');
    const p = await page.evaluate(() => window.__p.join());
    expect(p).not.toContain('77.7'); expect(p).not.toContain('2026-11-01'); expect(p).not.toMatch(/menstrua|cólica|colica|TPM/i);
  });
});
