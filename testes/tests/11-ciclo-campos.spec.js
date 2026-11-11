// Ciclo, cronograma do mês e revisão de todos os campos de preenchimento
const { test, expect, abrir, nav, estado } = require('./helpers');
const HOJE = '2026-11-09T10:00:00';
async function salvarCiclo(page, data, dur, men) {
  await nav(page, 'ciclo');
  await page.fill('#cInicio', data);
  if (dur) await page.selectOption('#cDur', String(dur));
  if (men) await page.selectOption('#cMen', String(men));
  await page.click('#formCiclo button[type=submit]');
}
test.describe('Ciclo: campos', () => {
  test('BUG corrigido: digitar a data pelo teclado não volta nem apaga', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'gluteo' });
    await nav(page, 'ciclo');
    await page.click('#cInicio');
    await page.keyboard.type('11032026', { delay: 40 }); // mm dd aaaa no Chrome de teste
    await expect(page.locator('#cInicio')).toHaveValue('2026-11-03');
    expect((await estado(page)).ciclo.inicio).toBe(''); // só salva ao tocar em Salvar
    await page.click('#formCiclo button[type=submit]');
    await expect(page.locator('#cMsg')).toHaveText('Ciclo salvo. Hoje é o dia 7: Menstruação.');
    await expect(page.locator('#cInicio')).toHaveValue('2026-11-03');
    expect((await estado(page)).ciclo.inicio).toBe('2026-11-03');
  });
  test('validações da data', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'gluteo' });
    await nav(page, 'ciclo');
    await page.click('#formCiclo button[type=submit]');
    await expect(page.locator('#cMsg')).toHaveText('Escolha o primeiro dia da sua última menstruação.');
    await expect(page.locator('#cInicio').locator('xpath=..')).toHaveClass(/erro/);
    await page.fill('#cInicio', '2026-11-20'); await page.click('#formCiclo button[type=submit]');
    await expect(page.locator('#cMsg')).toHaveText('A data não pode estar no futuro.');
    await page.fill('#cInicio', '2026-05-01'); await page.click('#formCiclo button[type=submit]');
    await expect(page.locator('#cMsg')).toContainText('últimos 4 meses');
    await page.fill('#cInicio', '0002-11-01'); await page.click('#formCiclo button[type=submit]');
    await expect(page.locator('#cMsg')).not.toHaveText(/salvo/);
    expect((await estado(page)).ciclo.inicio).toBe('');
    await page.fill('#cInicio', '2026-11-09'); await page.click('#formCiclo button[type=submit]');
    await expect(page.locator('#cMsg')).toContainText('dia 1');
  });
  test('duração, dias de menstruação e ajuste são salvos e voltam iguais', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'gluteo' });
    await salvarCiclo(page, '2026-10-20', 32, 6);
    await page.click('#cAjustar + i');
    await expect(page.locator('#cMsg')).toHaveText('Ajuste pelo ciclo desligado.');
    expect((await estado(page)).ciclo).toEqual({ inicio: '2026-10-20', dur: 32, menst: 6, ajustar: false });
    await page.reload(); await nav(page, 'ciclo');
    await expect(page.locator('#cDur')).toHaveValue('32'); await expect(page.locator('#cMen')).toHaveValue('6');
    await expect(page.locator('#cAjustar')).not.toBeChecked();
    expect(await page.locator('#cDur option').count()).toBe(25);
  });
  test('trocar de tela não apaga o que está sendo digitado', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'gluteo' });
    await nav(page, 'ciclo'); await page.fill('#cInicio', '2026-11-01');
    await page.evaluate(() => conferirData());
    await expect(page.locator('#cInicio')).toHaveValue('2026-11-01');
  });
  test('"Minha menstruação começou hoje" e apagar com confirmação', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'gluteo' });
    await nav(page, 'ciclo'); await page.click('#menstruouHoje');
    await expect(page.locator('#cicloHoje')).toContainText('Dia 1 de 28');
    await expect(page.locator('#cInicio')).toHaveValue('2026-11-09');
    await page.click('#cLimpar'); expect((await estado(page)).ciclo.inicio).toBe('2026-11-09');
    await page.click('#cLimpar'); expect((await estado(page)).ciclo.inicio).toBe('');
    await expect(page.locator('#cicloHoje')).toContainText('Preencha o seu ciclo');
  });
});

test.describe('Cronograma do mês', () => {
  for (const [data, fase, semana, modo, tags] of [
    ['2026-11-07', 'Menstruação', 1, 'Versão leve', ['3×12', '3×12', '2×15', '2×12 cada perna']],
    ['2026-10-30', 'Pós-menstruação', 2, 'Versão forte', ['5×12', '4×12', '3×15', '3×12 cada perna']],
    ['2026-10-25', 'Ovulação', 3, null, ['4×12', '4×12', '3×15', '3×12 cada perna']],
    ['2026-10-17', 'TPM', 4, 'Versão moderada', ['4×12', '4×12', '2×15', '2×12 cada perna']]]) {
    test(`semana ${semana} (${fase}) muda o treino e mantém o objetivo`, async ({ page }) => {
      await abrir(page, { time: HOJE, goal: 'gluteo' });
      await salvarCiclo(page, data);
      await expect(page.locator('.semana-c.atual')).toContainText(fase);
      await expect(page.locator('.semana-c')).toHaveCount(4);
      await nav(page, 'treino'); await page.click('#tab-Seg');
      await expect(page.locator('#faseBanner')).toContainText(`Semana ${semana} · ${fase}`);
      await expect(page.locator('#faseBanner')).toContainText(await page.evaluate(([s]) => GOAL_FASE.gluteo[s], [['men', 'fol', 'ovu', 'tpm'][semana - 1]]));
      if (modo) await expect(page.locator('#faseBanner .modo')).toContainText(modo); else await expect(page.locator('#faseBanner .modo')).toHaveCount(0);
      expect(await page.locator('.ex .tag').allInnerTexts()).toEqual(tags);
      expect(await page.locator('.ex .nome').allInnerTexts()).toEqual(['Elevação pélvica', 'Agachamento sumô', 'Cadeira abdutora', 'Coice no cabo']);
      await nav(page, 'alimentacao');
      await expect(page.locator('#alFase')).toBeVisible();
      await expect(page.locator('#alFase')).toContainText(fase);
    });
  }
  test('datas das semanas do cronograma', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'secar' });
    await salvarCiclo(page, '2026-11-03', 28, 5);
    const sp = await page.locator('.semana-c .fase-top > span').allInnerTexts();
    expect(sp).toEqual(['03/11 a 09/11', '10/11 a 14/11', '15/11 a 23/11', '24/11 a 30/11']);
    await expect(page.locator('#cicloHoje')).toContainText('01/12');
  });
  test('"Como você está hoje?" muda o treino e "Treinar normal" desfaz', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'secar' });
    await expect(page.locator('.ex .tag').first()).toHaveText('3×15');
    await page.click('.chips button[data-s="colica"]');
    await expect(page.locator('.ex .nome').last()).toHaveText('Bicicleta leve');
    await expect(page.locator('.ex .tag').first()).toHaveText('2×15');
    await page.click('#trocarModo');
    await expect(page.locator('.ex .tag').first()).toHaveText('3×15');
    await expect(page.locator('#trocarModo')).toHaveText('Voltar ao ajustado');
    await page.click('.chips button[data-s="energia"]');
    await expect(page.locator('.ex .tag').first()).toHaveText('4×15');
    await page.click('.chips button[data-s="energia"]');
    await expect(page.locator('.chips button[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('.ex .tag').first()).toHaveText('3×15');
    await page.click('.chips button[data-s="cansada"]');
    await page.reload();
    await expect(page.locator('.chips button[data-s="cansada"]')).toHaveAttribute('aria-pressed', 'true');
    await page.clock.setSystemTime(new Date('2026-11-10T10:00:00')); await page.reload();
    await expect(page.locator('.chips button[aria-pressed="true"]')).toHaveCount(0);
  });
  test('marcações continuam certas quando o treino muda de versão', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'secar' });
    await page.locator('.chk').nth(3).click();
    await page.click('.chips button[data-s="colica"]');
    await expect(page.locator('.ex').nth(3)).toHaveClass(/done/);
    await expect(page.locator('#pct')).toHaveText('25%');
  });
  test('ajuste desligado: treino normal mesmo com ciclo', async ({ page }) => {
    await abrir(page, { time: HOJE, goal: 'gluteo' });
    await salvarCiclo(page, '2026-11-07'); await page.click('#cAjustar + i');
    await nav(page, 'treino');
    await expect(page.locator('#faseBanner .modo')).toHaveCount(0);
    await expect(page.locator('.ex .tag').first()).toHaveText('4×12');
    await nav(page, 'alimentacao'); await expect(page.locator('#alFase')).toBeHidden();
  });
});

test.describe('Revisão dos outros campos', () => {
  test('BUG corrigido: carga com vírgula (32,5) não vira 325', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' }); await page.click('#tab-Seg');
    const inp = page.locator('.carga input').first();
    await inp.click(); await inp.fill(''); await page.keyboard.type('32,5'); await page.keyboard.press('Enter');
    await expect(inp).toHaveValue('32,5');
    expect((await estado(page)).cargas['Elevação pélvica'][0][1]).toBe(32.5);
    await page.locator('.carga').first().locator('button').nth(1).click();
    await expect(inp).toHaveValue('33,5');
    await inp.fill('abc'); await page.keyboard.press('Enter');
    await expect(inp).toHaveValue('33,5'); await expect(page.locator('.carga .muted').first()).toHaveText('Use um número de 0 a 500');
    await inp.fill('600'); await page.keyboard.press('Enter'); await expect(inp).toHaveValue('33,5');
    await inp.fill(''); await page.keyboard.press('Enter'); await expect(inp).toHaveValue('33,5');
  });
  test('medidas: vírgula, ponto, espaços e campos vazios', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'progresso');
    await page.fill('#mPeso', ' 61,4 '); await page.fill('#mQuadril', '98.5'); await page.click('#formMedidas button[type=submit]');
    await expect(page.locator('#medMsg')).toHaveText('Medidas de hoje salvas.');
    const m = (await estado(page)).medidas[0];
    expect([m.peso, m.cintura, m.quadril]).toEqual([61.4, null, 98.5]);
    await page.fill('#mCintura', '15'); await page.click('#formMedidas button[type=submit]');
    await expect(page.locator('#medMsg')).toHaveText('A cintura precisa ser um número entre 30 e 250 cm.');
  });
  test('peso da nutrição aceita vírgula e Enter', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'alimentacao');
    await page.fill('#alPeso', '58,5'); await page.press('#alPeso', 'Enter');
    await expect(page.locator('#alPesoMsg')).toHaveText('Peso salvo e metas calculadas para 58,5 kg.');
  });
  test('todos os campos usam fonte 16px (o iPhone não dá zoom) e teclado certo', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    const prob = [];
    for (const v of ['treino', 'progresso', 'alimentacao', 'ciclo']) {
      await nav(page, v);
      prob.push(...await page.evaluate(() => [...document.querySelectorAll('input:not([type=checkbox]),select,textarea')].filter(e => e.offsetParent)
        .flatMap(e => { const p = []; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 16) p.push(e.id + ' fonte ' + fs);
          if (e.type === 'number') p.push(e.id + ' usa type=number (perde a vírgula no iPhone)');
          if (e.type === 'text' && !e.getAttribute('inputmode')) p.push(e.id + ' sem inputmode'); return p; })));
    }
    await page.click('#abrirIA');
    prob.push(...await page.evaluate(() => { const fs = parseFloat(getComputedStyle(document.getElementById('pergunta')).fontSize); return fs < 16 ? ['pergunta ' + fs] : []; }));
    expect(prob).toEqual([]);
  });
  test('ícones alinhados: menu, marcações e botão de dúvidas', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    const r = await page.evaluate(() => {
      const nav = [...document.querySelectorAll('nav.menu button')].map(b => { const s = b.querySelector('svg').getBoundingClientRect(), t = b.getBoundingClientRect(); return { top: Math.round(s.top), cx: Math.round(s.left + s.width / 2 - (t.left + t.width / 2)), h: Math.round(t.height), linhas: Math.round((t.height - 34) / 14) }; });
      const chk = [...document.querySelectorAll('.chk')].map(b => { const s = b.querySelector('svg').getBoundingClientRect(), t = b.getBoundingClientRect(); return [Math.round(s.left + s.width / 2 - t.left - t.width / 2), Math.round(s.top + s.height / 2 - t.top - t.height / 2)]; });
      return { nav, chk };
    });
    expect(new Set(r.nav.map(n => n.top)).size).toBe(1);
    expect(new Set(r.nav.map(n => n.h)).size).toBe(1);
    for (const n of r.nav) expect(Math.abs(n.cx)).toBeLessThanOrEqual(1);
    for (const [x, y] of r.chk) { expect(Math.abs(x)).toBeLessThanOrEqual(1); expect(Math.abs(y)).toBeLessThanOrEqual(1); }
  });
  test('seleções de uma opção só: objetivo, dia, filtro de dicas, sintoma', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    for (const d of ['Ter', 'Qua']) { await page.click('#tab-' + d); await expect(page.locator('.tabs button[aria-selected="true"]')).toHaveCount(1); }
    await page.click('.chips button[data-s="normal"]'); await page.click('.chips button[data-s="cansada"]');
    await expect(page.locator('.chips button[aria-pressed="true"]')).toHaveCount(1);
    await nav(page, 'objetivo'); await page.click('#goal-massa'); await nav(page, 'objetivo');
    await expect(page.locator('.goal[aria-pressed="true"]')).toHaveCount(1);
    await nav(page, 'dicas'); await page.click('.filtros button:text-is("Treino")');
    await expect(page.locator('.filtros button[aria-pressed="true"]')).toHaveCount(1);
    await page.click('#voltarPerfil'); await expect(page.locator('#v-objetivo')).toBeVisible();
    await expect(page.locator('nav.menu button[aria-current="page"]')).toHaveAttribute('data-v', 'objetivo');
  });
});
