// Fluxos completos de uso (ponta a ponta)
const { test, expect, abrir, nav, txt, marcarDia, estado } = require('./helpers');
test.describe('Fluxos principais', () => {
  test('primeira abertura → escolher objetivo → treino do dia', async ({ page }) => {
    await abrir(page, { time: '2026-11-11T09:00:00' });
    await expect(page.locator('#v-objetivo')).toBeVisible();
    await expect(page.locator('#objTitulo')).toHaveText('Qual é o seu objetivo?');
    await expect(page.locator('.goal')).toHaveCount(6);
    await page.click('#goal-iniciante');
    await expect(page.locator('#v-treino')).toBeVisible();
    await expect(page.locator('#subObjetivo')).toHaveText('Começando agora');
    await expect(page.locator('#tab-Qua')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#tab-Qua .hoje')).toHaveText('hoje');
    expect(page.errs).toEqual([]);
  });

  test('fim de semana mostra aviso de descanso e abre na segunda', async ({ page }) => {
    await abrir(page, { time: '2026-11-08T09:00:00', goal: 'gluteo' });
    await expect(page.locator('#avisoFds')).toBeVisible();
    await expect(page.locator('#tab-Seg')).toHaveAttribute('aria-selected', 'true');
  });

  test('semana inteira: seg a sex chega a 100% e zera na outra semana', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T07:00:00', goal: 'definir' });
    for (const d of ['Seg', 'Ter', 'Qua', 'Qui']) await marcarDia(page, d);
    await expect(page.locator('#semPct')).toHaveText('80%');
    await marcarDia(page, 'Sex');
    await expect(page.locator('#semPct')).toHaveText('100%');
    await expect(page.locator('#semMsg')).toContainText('Semana completa');
    await expect(page.locator('.tabs button.ok')).toHaveCount(5);
    await page.clock.setSystemTime(new Date('2026-11-16T07:00:00'));
    await page.reload(); await expect(page.locator('#semPct')).toHaveText('0%');
  });

  test('virada de dia com o app aberto (meia-noite de domingo para segunda)', async ({ page }) => {
    await abrir(page, { time: '2026-11-15T23:59:00', goal: 'gluteo' });
    await marcarDia(page, 'Seg');
    await expect(page.locator('#semLbl')).toHaveText('Semana de 09/11');
    await page.clock.fastForward(2 * 60 * 1000);
    await expect(page.locator('#semLbl')).toHaveText('Semana de 16/11');
    await expect(page.locator('#semPct')).toHaveText('0%');
    await expect(page.locator('#tab-Seg .hoje')).toHaveText('hoje');
  });

  test('trocar de objetivo guarda o progresso de cada um', async ({ page }) => {
    await abrir(page, { time: '2026-11-10T10:00:00', goal: 'gluteo' });
    await marcarDia(page, 'Seg');
    await nav(page, 'objetivo'); await page.click('#goal-postura');
    await expect(page.locator('#semPct')).toHaveText('0%');
    await expect(page.locator('#objMsg')).toHaveCount(1);
    await nav(page, 'objetivo'); await page.click('#goal-gluteo');
    await expect(page.locator('#semPct')).toHaveText('20%');
  });

  test('desmarcar exercício recalcula dia e semana', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    await marcarDia(page, 'Seg');
    await page.locator('.chk').nth(1).click();
    await expect(page.locator('#pct')).toHaveText('75%');
    await expect(page.locator('#semPct')).toHaveText('15%');
    await expect(page.locator('#tab-Seg')).not.toHaveClass(/ok/);
  });

  test('carga: botões, digitação, valor inválido e histórico', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    const c = page.locator('.carga').first(), inp = c.locator('input');
    await c.locator('button').nth(1).click(); await c.locator('button').nth(1).click();
    await expect(inp).toHaveValue('2');
    await c.locator('button').nth(0).click(); await c.locator('button').nth(0).click(); await c.locator('button').nth(0).click();
    await expect(inp).toHaveValue('0');
    await inp.fill('30'); await inp.dispatchEvent('change'); await expect(inp).toHaveValue('30');
    await inp.fill('-5'); await inp.dispatchEvent('change'); await expect(inp).toHaveValue('30');
    await inp.fill('9999'); await inp.dispatchEvent('change'); await expect(inp).toHaveValue('30');
    await page.clock.setSystemTime(new Date('2026-11-16T10:00:00'));
    await inp.fill('32.5'); await inp.dispatchEvent('change');
    await expect(c.locator('.muted')).toHaveText('+2,5 kg desde o início');
    const s = await estado(page);
    expect(s.cargas['Elevação pélvica']).toEqual([['2026-11-09', 30], ['2026-11-16', 32.5]]);
    await nav(page, 'progresso');
    await expect(page.locator('#cargas')).toContainText('+2,5 kg');
  });

  test('água, medidas e ciclo', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    await nav(page, 'progresso');
    await page.locator('#agua button').nth(7).click();
    await expect(page.locator('#aguaTxt')).toHaveText('2 L');
    await page.locator('#agua button').nth(0).click();
    await expect(page.locator('#aguaTxt')).toHaveText('250 ml');
    await page.click('#formMedidas button[type=submit]');
    await expect(page.locator('#medMsg')).toContainText('Preencha');
    await page.fill('#mPeso', '0'); await page.click('#formMedidas button[type=submit]');
    await expect(page.locator('#medMsg')).toContainText('O peso precisa ser um número entre 20 e 300 kg');
    await page.fill('#mPeso', '');
    await page.fill('#mCintura', '75,0'); await page.click('#formMedidas button[type=submit]');
    await expect(page.locator('#medMsg')).toHaveText('Medidas de hoje salvas.');
    await page.clock.setSystemTime(new Date('2026-11-23T10:00:00'));
    await nav(page, 'treino'); await nav(page, 'progresso');
    await page.fill('#mCintura', '73.5'); await page.click('#formMedidas button[type=submit]');
    await expect(page.locator('#medMsg')).toContainText('diminuiu 1,5 cm');
    await expect(page.locator('#medidas tr')).toHaveCount(3);
  });

  test('dicas: filtros e dica do objetivo', async ({ page }) => {
    await abrir(page, { goal: 'massa' });
    await nav(page, 'dicas');
    await expect(page.locator('#dicas .aviso')).toContainText('Ganhar massa');
    const cats = await page.locator('.filtros button').allInnerTexts();
    for (const c of cats.slice(1)) {
      await page.click(`.filtros button:text-is("${c}")`);
      expect(await page.locator('#dicas details').count()).toBeGreaterThan(0);
    }
    await page.click('.filtros button:text-is("Todas")');
    await expect(page.locator('#dicas details')).toHaveCount(9);
  });

  test('cronômetro: iniciar, pausar, terminar e reiniciar', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    await expect(page.locator('#tempo')).toHaveText('1:00');
    await page.click('[data-s="30"]'); await page.click('#iniciar');
    await page.clock.runFor(10000); await expect(page.locator('#tempo')).toHaveText('0:20');
    await page.click('#iniciar'); await page.clock.runFor(8000); await expect(page.locator('#tempo')).toHaveText('0:20');
    await page.click('#iniciar'); await page.clock.runFor(21000); await expect(page.locator('#tempo')).toHaveText('Já!');
    await page.click('#iniciar'); await page.clock.runFor(1000); await expect(page.locator('#tempo')).toHaveText('0:29');
    await nav(page, 'dicas'); await expect(page.locator('#timer')).toBeHidden();
  });

  test('apagar dados exige confirmação', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await page.locator('.chk').first().click();
    await nav(page, 'objetivo');
    await page.click('#apagar'); await expect(page.locator('#confirmaApagar')).toBeVisible();
    await page.click('#naoApagar'); expect((await estado(page)).goal).toBe('gluteo');
    await page.click('#apagar'); await page.click('#simApagar');
    await expect(page.locator('#objMsg')).toContainText('apagados');
    expect(await estado(page)).toBeNull();
    await expect(page.locator('#objTitulo')).toHaveText('Qual é o seu objetivo?');
    await page.reload(); await expect(page.locator('#v-objetivo')).toBeVisible();
  });
});
