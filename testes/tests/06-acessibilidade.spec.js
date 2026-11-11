// Acessibilidade (WCAG 2.1 AA com axe-core) e uso por teclado
const { test, expect, abrir, nav } = require('./helpers');
const AxeBuilder = require('@axe-core/playwright').default;
test.describe('Acessibilidade', () => {
  for (const tema of ['light', 'dark']) for (const v of ['objetivo', 'treino', 'progresso', 'alimentacao', 'ciclo', 'dicas']) {
    test(`WCAG AA sem falhas graves: ${v} (${tema === 'light' ? 'claro' : 'escuro'})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
      await abrir(page, { goal: 'gluteo' });
      await nav(page, v);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const graves = r.violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => x.id + ': ' + x.nodes.map(n => n.target.join(' ')).slice(0, 3).join(', '));
      expect(graves).toEqual([]);
    });
  }
  test('painel da IA acessível', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await page.click('#abrirIA');
    const r = await new AxeBuilder({ page }).include('#painelIA').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => x.id)).toEqual([]);
  });
  test('teclado: Tab chega nos controles, Enter marca, Esc fecha a IA e devolve o foco', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await page.locator('.chk').first().focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.chk').first()).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#abrirIA').focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#painelIA')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#painelIA')).toBeHidden();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('abrirIA');
  });
  test('movimento reduzido: animações começam pausadas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrir(page, { goal: 'gluteo' });
    expect(await page.evaluate(() => demos.every(d => d.pausa))).toBe(true);
  });
  test('todos os botões e campos têm nome acessível', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    for (const v of ['treino', 'progresso', 'alimentacao', 'ciclo', 'dicas', 'objetivo']) {
      await nav(page, v);
      const sem = await page.evaluate(() => [...document.querySelectorAll('button,input,textarea,a')].filter(e => e.offsetParent).filter(e => !(e.getAttribute('aria-label') || e.textContent.trim() || (e.labels && e.labels.length) || e.getAttribute('placeholder'))).map(e => e.outerHTML.slice(0, 80)));
      expect(sem).toEqual([]);
    }
  });
});
