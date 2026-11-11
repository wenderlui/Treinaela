// Salvar, recarregar, migração, falhas de armazenamento
const { test, expect, abrir, nav, txt, marcarDia, estado } = require('./helpers');
test.describe('Persistência', () => {
  test('tudo é salvo e volta igual depois de fechar e abrir', async ({ page, context }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'secar' });
    await marcarDia(page, 'Seg');
    const c = page.locator('.carga').first(); await c.locator('input').fill('12'); await c.locator('input').dispatchEvent('change');
    await nav(page, 'progresso');
    await page.locator('#agua button').nth(3).click();
    await page.fill('#mPeso', '61.2'); await page.click('#formMedidas button[type=submit]');
    await nav(page, 'ciclo'); await page.fill('#cInicio', '2026-11-01'); await page.click('#formCiclo button[type=submit]');
    const antes = await estado(page);
    const p2 = await context.newPage();
    await p2.route(/fonts\./, r => r.abort());
    await p2.clock.install({ time: new Date('2026-11-09T12:00:00') });
    await p2.goto('/index.html');
    expect(await estado(p2)).toEqual(antes);
    await expect(p2.locator('#subObjetivo')).toHaveText('Emagrecer e secar');
    await expect(p2.locator('#semPct')).toHaveText('17%');
    await expect(p2.locator('.carga input').first()).toHaveValue('12');
    await p2.click('nav.menu button[data-v="progresso"]');
    await expect(p2.locator('#aguaTxt')).toHaveText('1 L');
    await expect(p2.locator('#medidas')).toContainText('61,2 kg');
    await p2.click('nav.menu button[data-v="ciclo"]'); await expect(p2.locator('#cInicio')).toHaveValue('2026-11-01');
  });

  test('migra o progresso da versão anterior e apaga as chaves antigas', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', init: () => { if (!sessionStorage.getItem('m')) { sessionStorage.setItem('m', 1); localStorage.setItem('treino:2026-11-09', '{"Seg-0":1,"Seg-2":1,"<x>":1}'); localStorage.setItem('treino-Seg-1', '1'); } } });
    await expect(page.locator('#v-treino')).toBeVisible();
    await expect(page.locator('#semPct')).toHaveText('10%');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys).toEqual(['meutreino:v2']);
  });

  test('guarda só 12 semanas e poda a água antiga', async ({ page }) => {
    const semanas = {}; const agua = {};
    for (let i = 0; i < 30; i++) { const d = new Date(2026, 10, 9); d.setDate(d.getDate() - 7 * i); const k = d.toISOString().slice(0, 10); semanas['gluteo|' + k] = { 'Seg-0': 1 }; agua[k] = 4; }
    await abrir(page, { time: '2026-11-09T10:00:00', storage: { goal: 'gluteo', semanas, agua } });
    const s = await estado(page);
    expect(Object.keys(s.semanas).length).toBeLessThanOrEqual(13);
    expect(Object.keys(s.agua).length).toBeLessThanOrEqual(13);
  });

  test('armazenamento bloqueado (aba anônima): app funciona e avisa', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('SecurityError') } }));
    await abrir(page, { goal: 'gluteo' });
    await page.locator('.chk').first().click();
    await expect(page.locator('#pct')).toHaveText('25%');
    await expect(page.locator('#semMsg')).toContainText('não está salvando');
    expect(page.errs).toEqual([]);
  });

  test('armazenamento cheio (QuotaExceeded): não trava e avisa', async ({ page }) => {
    await page.addInitScript(() => { Storage.prototype.setItem = function () { const e = new Error('cheio'); e.name = 'QuotaExceededError'; throw e; }; });
    await abrir(page, { goal: 'massa' });
    await page.locator('.chk').first().click();
    await expect(page.locator('#semMsg')).toContainText('não está salvando');
    expect(page.errs).toEqual([]);
  });

  for (const [nome, val] of [['JSON quebrado', '{quebrado'], ['null', 'null'], ['lista', '[1,2,3]'], ['número', '42'], ['tipos errados', '{"goal":5,"semanas":[],"cargas":"x","medidas":{},"agua":[],"ciclo":"y"}']]) {
    test('dado corrompido não trava: ' + nome, async ({ page }) => {
      await abrir(page, { storage: val });
      await expect(page.locator('#v-objetivo')).toBeVisible();
      await page.click('#goal-gluteo');
      await nav(page, 'progresso'); await nav(page, 'dicas'); await nav(page, 'treino');
      expect(page.errs).toEqual([]);
    });
  }

  test('duas abas abertas não corrompem os dados', async ({ page, context }) => {
    await abrir(page, { goal: 'gluteo' });
    const p2 = await context.newPage(); await p2.route(/fonts\./, r => r.abort()); await p2.goto('/index.html');
    await page.locator('.chk').nth(0).click();
    await p2.locator('.chk').nth(1).click();
    const s = await estado(p2);
    expect(s.goal).toBe('gluteo');
    expect(() => JSON.stringify(s)).not.toThrow();
  });
});
