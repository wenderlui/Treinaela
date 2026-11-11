// Alimentação por objetivo
const { test, expect, abrir, nav, estado } = require('./helpers');
test.describe('Alimentação', () => {
  test('cada objetivo mostra o seu plano', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    const vistos = {};
    for (const g of ['gluteo', 'secar', 'definir', 'massa', 'iniciante', 'postura']) {
      await nav(page, 'objetivo'); await page.click('#goal-' + g); await nav(page, 'alimentacao');
      await expect(page.locator('#alTitulo')).toContainText(await page.evaluate(g => OBJ[g].n, g));
      await expect(page.locator('#alRefeicoes .ref')).toHaveCount(5);
      expect(await page.locator('#alPrincipios li').count()).toBeGreaterThanOrEqual(4);
      vistos[g] = await page.locator('#alRefeicoes .ref p').nth(1).innerText();
    }
    expect(vistos.secar).toContain('metade do prato');
    expect(vistos.massa).toContain('farofa');
    await expect(page.locator('#alLegenda')).toContainText('Verduras e legumes');
    expect(page.errs).toEqual([]);
  });

  test('metas calculadas pelo peso (emagrecer, 60 kg)', async ({ page }) => {
    await abrir(page, { goal: 'secar' });
    await nav(page, 'alimentacao');
    await expect(page.locator('#alPesoMsg')).toContainText('Informe seu peso');
    await page.fill('#alPeso', '60'); await page.click('#formPeso button[type=submit]');
    await expect(page.locator('#alMetas')).toContainText('96–132 g');
    await expect(page.locator('#alMetas')).toContainText('24–33 g');
    await expect(page.locator('#alMetas')).toContainText('2,25 L');
    await nav(page, 'objetivo'); await page.click('#goal-massa'); await nav(page, 'alimentacao');
    await expect(page.locator('#alMetas')).toContainText('5 a 6');
  });

  test('peso inválido mostra aviso; vírgula funciona', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'alimentacao');
    for (const v of ['abc', '500', '10', '']) { await page.fill('#alPeso', v); await page.click('#formPeso button[type=submit]'); await expect(page.locator('#alPesoMsg')).toHaveText('Digite um peso entre 30 e 300 kg.'); }
    await page.fill('#alPeso', '62,5'); await page.click('#formPeso button[type=submit]');
    await expect(page.locator('#alPesoMsg')).toHaveText('Peso salvo e metas calculadas para 62,5 kg.');
    expect((await estado(page)).medidas.map(m => m.peso)).toEqual([62.5]);
  });

  test('usa o peso das medidas automaticamente e ajusta a meta de água', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'progresso');
    await expect(page.locator('#agua button')).toHaveCount(8);
    await page.fill('#mPeso', '70'); await page.click('#formMedidas button[type=submit]');
    await nav(page, 'alimentacao');
    await expect(page.locator('#alPeso')).toHaveValue('70');
    await expect(page.locator('#alMetas')).toContainText('112–140 g');
    await nav(page, 'progresso');
    await expect(page.locator('#agua button')).toHaveCount(10);
    await expect(page.locator('#aguaMeta')).toContainText('10 copos');
  });

  test('cardápio: trocar opção, marcar refeição, salvar e zerar no dia seguinte', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T08:00:00', goal: 'definir' });
    await nav(page, 'alimentacao');
    const ref = page.locator('#alRefeicoes .ref').first(), texto = ref.locator('p');
    const t0 = await texto.innerText();
    await ref.locator('.outra').click(); const t1 = await page.locator('#alRefeicoes .ref p').first().innerText();
    expect(t1).not.toBe(t0);
    await page.locator('#alRefeicoes .ref .outra').first().click(); await page.locator('#alRefeicoes .ref .outra').first().click();
    await expect(page.locator('#alRefeicoes .ref p').first()).toHaveText(t0);
    await page.locator('#alRefeicoes .ref .chk').nth(0).click();
    await page.locator('#alRefeicoes .ref .chk').nth(2).click();
    await expect(page.locator('#alFeitas')).toHaveText('2 de 5');
    await expect(page.locator('#alRefeicoes .ref').nth(0)).toHaveClass(/feita/);
    await page.reload(); await nav(page, 'alimentacao');
    await expect(page.locator('#alFeitas')).toHaveText('2 de 5');
    await page.locator('#alRefeicoes .ref .chk').nth(0).click();
    await expect(page.locator('#alFeitas')).toHaveText('1 de 5');
    await page.clock.setSystemTime(new Date('2026-11-10T08:00:00'));
    await page.reload(); await nav(page, 'alimentacao');
    await expect(page.locator('#alFeitas')).toHaveText('0 de 5');
  });

  test('IA recebe a orientação de alimentação do objetivo', async ({ page }) => {
    await abrir(page, { goal: 'massa', init: () => { window.__p = []; window.claude = { use: async () => async (i, o) => { window.__p.push(i); o.onText({ text: 'ok', delta: 'ok' }); return { text: 'ok' }; } }; } });
    await page.click('#abrirIA'); await page.fill('#pergunta', 'o que comer?'); await page.keyboard.press('Enter');
    await expect(page.locator('.msg.ia').last()).toHaveText('ok');
    expect(await page.evaluate(() => window.__p[0][0].content)).toContain('Comer um pouco mais do que o corpo gasta');
  });
});
