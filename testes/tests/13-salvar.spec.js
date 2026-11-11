// Salvar, editar, excluir, gatilhos e salvamento na conta
const { test, expect, abrir, nav, estado } = require('./helpers');

// Conta Claude simulada (db + user), guardada no sessionStorage do teste para sobreviver a recarregamentos
function contaSimulada(opts = {}) {
  return `(() => {
    const O = ${JSON.stringify(opts)};
    const ler = () => JSON.parse(sessionStorage.getItem('__remoto') || 'null');
    window.__escritas = 0; window.__simultaneas = 0; let ativas = 0;
    const ref = { get: async () => { await new Promise(r => setTimeout(r, 20)); const v = ler(); return { exists: !!v, data: () => v, metadata: {} }; },
      set: async v => { ativas++; window.__simultaneas = Math.max(window.__simultaneas, ativas); window.__escritas++;
        await new Promise(r => setTimeout(r, 60)); ativas--;
        if (O.erro) throw { code: O.erro, message: 'x' };
        sessionStorage.setItem('__remoto', JSON.stringify(v)); } };
    const db = { doc: p => { window.__path = p; return ref; } };
    const user = { id: async () => O.semId ? null : 'u_teste' };
    window.claude = { use: async n => n === 'db' ? db : n === 'user' ? user : null };
  })()`;
}

test.describe('Medidas e peso', () => {
  test('BUG corrigido: salvar a cintura depois não apaga o peso do mesmo dia', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T09:00:00', goal: 'gluteo' });
    await nav(page, 'progresso');
    await page.fill('#mPeso', '64'); await page.press('#mPeso', 'Enter');
    await expect(page.locator('#mPeso')).toHaveValue('64');
    await expect(page.locator('#medSalvar')).toHaveText('Atualizar medidas de hoje');
    await expect(page.locator('#toast')).toHaveText('Medidas salvas');
    await page.fill('#mCintura', '72'); await page.click('#medSalvar');
    expect((await estado(page)).medidas).toEqual([{ d: '2026-11-09', peso: 64, cintura: 72, quadril: null }]);
    await expect(page.locator('#medidas')).toContainText('64 kg');
    await expect(page.locator('#medidas')).toContainText('72 cm');
  });

  test('BUG corrigido: peso da Nutrição e das Medidas é um só', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T09:00:00', goal: 'gluteo' });
    await nav(page, 'alimentacao'); await page.fill('#alPeso', '60'); await page.press('#alPeso', 'Enter');
    await expect(page.locator('#toast')).toHaveText('Peso salvo: 60 kg');
    await nav(page, 'progresso'); await expect(page.locator('#mPeso')).toHaveValue('60');
    await page.fill('#mPeso', '64,5'); await page.click('#medSalvar');
    await nav(page, 'alimentacao'); await expect(page.locator('#alPeso')).toHaveValue('64,5');
    await expect(page.locator('#alMetas')).toContainText('103–129 g');
    expect((await estado(page)).medidas).toEqual([{ d: '2026-11-09', peso: 64.5, cintura: null, quadril: null }]);
  });

  test('peso salvo na versão anterior (Nutrição) passa para as medidas', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T09:00:00', storage: { goal: 'gluteo', peso: 58 } });
    await nav(page, 'alimentacao'); await expect(page.locator('#alPeso')).toHaveValue('58');
    const s = await estado(page); expect(s.peso).toBeNull(); expect(s.medidas[0].peso).toBe(58);
  });

  test('editar uma medida antiga e cancelar a edição', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T09:00:00', storage: { goal: 'gluteo', medidas: [{ d: '2026-10-26', peso: 66, cintura: 75, quadril: 100 }, { d: '2026-11-09', peso: 64, cintura: 73, quadril: 99 }] } });
    await nav(page, 'progresso');
    await page.click('button[aria-label="Editar medidas de 26/10"]');
    await expect(page.locator('#medEditTxt')).toHaveText('Editando as medidas de 26/10');
    await expect(page.locator('#mCintura')).toHaveValue('75');
    await expect(page.locator('#medSalvar')).toHaveText('Salvar alterações');
    await page.click('#medCancelar');
    await expect(page.locator('#medEditando')).toBeHidden(); await expect(page.locator('#mCintura')).toHaveValue('73');
    await page.click('button[aria-label="Editar medidas de 26/10"]');
    await page.fill('#mCintura', '76'); await page.click('#medSalvar');
    await expect(page.locator('#toast')).toHaveText('Medidas atualizadas');
    expect((await estado(page)).medidas).toEqual([{ d: '2026-10-26', peso: 66, cintura: 76, quadril: 100 }, { d: '2026-11-09', peso: 64, cintura: 73, quadril: 99 }]);
    await expect(page.locator('#medEditando')).toBeHidden();
  });

  test('excluir uma medida pede confirmação', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T09:00:00', storage: { goal: 'gluteo', medidas: [{ d: '2026-10-26', peso: 66, cintura: null, quadril: null }, { d: '2026-11-09', peso: 64, cintura: null, quadril: null }] } });
    await nav(page, 'progresso');
    await page.click('button[aria-label="Excluir medidas de 09/11"]');
    await page.click('button[aria-label="Cancelar"]');
    expect((await estado(page)).medidas.length).toBe(2);
    await page.click('button[aria-label="Excluir medidas de 09/11"]');
    await page.click('button[aria-label="Confirmar: apagar medidas de 09/11"]');
    await expect(page.locator('#toast')).toHaveText('Medidas de 09/11 apagadas');
    expect((await estado(page)).medidas.map(m => m.d)).toEqual(['2026-10-26']);
    await expect(page.locator('#mPeso')).toHaveValue('');
    await nav(page, 'alimentacao'); await expect(page.locator('#alPeso')).toHaveValue('66');
  });

  test('apagar todos os campos de um dia salvo pede para confirmar a exclusão', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T09:00:00', goal: 'gluteo' });
    await nav(page, 'progresso');
    await page.fill('#mPeso', '64'); await page.click('#medSalvar');
    await page.fill('#mPeso', ''); await page.click('#medSalvar');
    await expect(page.locator('#medMsg')).toContainText('Para apagar este dia');
    await expect(page.locator('button[aria-label="Confirmar: apagar medidas de 09/11"]')).toBeVisible();
    expect((await estado(page)).medidas.length).toBe(1);
  });

  test('gatilhos: Enter salva, e o que não foi salvo não aparece como salvo', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T09:00:00', goal: 'gluteo' });
    await nav(page, 'progresso');
    await page.fill('#mQuadril', '99'); await page.press('#mQuadril', 'Enter');
    expect((await estado(page)).medidas[0].quadril).toBe(99);
    await page.fill('#mCintura', '70');
    await nav(page, 'treino'); await nav(page, 'progresso');
    await expect(page.locator('#mCintura')).toHaveValue('');
    await expect(page.locator('#mQuadril')).toHaveValue('99');
  });
});

test.describe('Cargas', () => {
  test('salvar com Enter e ao sair do campo; excluir com confirmação', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    const inp = page.locator('.carga input').first();
    await inp.fill('20'); await inp.press('Enter');
    await expect(page.locator('#toast')).toHaveText('Carga salva: 20 kg');
    await inp.fill('25'); await inp.blur();
    expect((await estado(page)).cargas['Elevação pélvica'][0][1]).toBe(25);
    await nav(page, 'progresso');
    await page.click('button[aria-label="Excluir cargas de Elevação pélvica"]');
    await page.click('button[aria-label="Cancelar"]');
    await expect(page.locator('#cargas')).toContainText('Elevação pélvica');
    await page.click('button[aria-label="Excluir cargas de Elevação pélvica"]');
    await page.click('button[aria-label="Confirmar: apagar cargas de Elevação pélvica"]');
    await expect(page.locator('#cargas')).toContainText('Nenhuma carga anotada');
    await nav(page, 'treino'); await expect(page.locator('.carga input').first()).toHaveValue('');
  });
});

test.describe('Salvar na conta Claude', () => {
  test('dados voltam da conta mesmo se o celular apagar o armazenamento', async ({ page }) => {
    await page.addInitScript(contaSimulada());
    await abrir(page, { time: '2026-11-09T09:00:00', goal: 'gluteo' });
    await nav(page, 'progresso'); await page.fill('#mPeso', '63'); await page.click('#medSalvar');
    await page.locator('#agua button').nth(2).click();
    await page.clock.runFor(1500); await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__path)).toBe('data/users/u_teste/estado');
    await nav(page, 'objetivo');
    await expect(page.locator('#syncStatus')).toContainText('Salvo na sua conta Claude');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('#v-treino')).toBeVisible();
    await nav(page, 'progresso');
    await expect(page.locator('#mPeso')).toHaveValue('63');
    await expect(page.locator('#aguaTxt')).toHaveText('750 ml');
  });

  test('várias mudanças rápidas viram poucas gravações, nunca duas ao mesmo tempo', async ({ page }) => {
    await page.addInitScript(contaSimulada());
    await abrir(page, { goal: 'secar' });
    await page.waitForTimeout(300);
    const antes = await page.evaluate(() => window.__escritas);
    for (let i = 0; i < 12; i++) await page.locator('.chk').nth(i % 4).click();
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => [window.__escritas, window.__simultaneas]);
    expect(r[0] - antes).toBeLessThanOrEqual(2); expect(r[1]).toBe(1);
  });

  test('outro aparelho salvou depois: ao voltar para o app, puxa os dados novos', async ({ page }) => {
    await page.addInitScript(contaSimulada());
    await abrir(page, { goal: 'gluteo' });
    await page.locator('.chk').first().click();
    await page.waitForTimeout(1300);
    await page.evaluate(() => { const r = JSON.parse(sessionStorage.getItem('__remoto')); const s = JSON.parse(r.s); s.goal = 'massa'; s.atualizado = Date.now() + 5000; sessionStorage.setItem('__remoto', JSON.stringify({ v: 1, atualizado: s.atualizado, s: JSON.stringify(s) })); });
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.locator('#subObjetivo')).toHaveText('Ganhar massa');
  });

  test('sem permissão de gravar na conta: avisa e continua salvando no aparelho', async ({ page }) => {
    await page.addInitScript(contaSimulada({ erro: 'invalid_argument' }));
    await abrir(page, { goal: 'gluteo' });
    await page.locator('.chk').first().click(); await page.waitForTimeout(1300);
    await nav(page, 'objetivo');
    await expect(page.locator('#syncStatus')).toContainText('Colaboradora');
    expect((await estado(page)).goal).toBe('gluteo');
  });

  test('conta fora do ar: tenta de novo uma vez e não trava', async ({ page }) => {
    await page.addInitScript(contaSimulada({ erro: 'unavailable' }));
    await abrir(page, { goal: 'gluteo' });
    await page.locator('.chk').first().click(); await page.waitForTimeout(4500);
    await nav(page, 'objetivo');
    await expect(page.locator('#syncStatus')).toContainText('tenta de novo');
    expect(await page.evaluate(() => window.__escritas)).toBeLessThanOrEqual(3);
    expect(page.errs).toEqual([]);
  });

  test('dado estragado na conta é ignorado', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('__remoto', JSON.stringify({ v: 1, atualizado: 9e12, s: '{quebrado' })));
    await page.addInitScript(contaSimulada());
    await abrir(page, { goal: 'gluteo' });
    await page.waitForTimeout(500);
    await expect(page.locator('#v-treino')).toBeVisible();
    expect(page.errs).toEqual([]);
  });

  test('apagar todos os dados apaga também na conta', async ({ page }) => {
    await page.addInitScript(contaSimulada());
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'progresso'); await page.fill('#mPeso', '63'); await page.click('#medSalvar');
    await page.waitForTimeout(1300);
    await nav(page, 'objetivo'); await page.click('#apagar'); await page.click('#simApagar');
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => JSON.parse(JSON.parse(sessionStorage.getItem('__remoto')).s));
    expect(r.goal).toBeNull(); expect(r.medidas).toEqual([]);
    await page.evaluate(() => localStorage.clear()); await page.reload();
    await expect(page.locator('#v-objetivo')).toBeVisible();
  });

  test('fora do Claude (app do iPhone): avisa que salva só no aparelho', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'objetivo');
    await expect(page.locator('#syncStatus')).toContainText('Salvo neste aparelho');
  });
});
