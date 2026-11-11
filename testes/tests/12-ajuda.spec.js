// Campos fáceis de entender: rótulos claros e ajuda (?) em todos os campos
const { test, expect, abrir, nav } = require('./helpers');
const TELAS = ['treino', 'progresso', 'alimentacao', 'ciclo'];
test.describe('Ajuda e clareza dos campos', () => {
  test('todo campo tem rótulo visível e um botão de ajuda (?)', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    const falhas = [];
    for (const v of TELAS) {
      await nav(page, v);
      falhas.push(...await page.evaluate(v => [...document.querySelectorAll('input,select')].filter(e => e.offsetParent || (e.closest('.switch') && e.closest('.switch').offsetParent)).flatMap(e => {
        const f = []; const lab = e.labels && e.labels[0];
        if (!lab || !lab.textContent.trim()) f.push(v + ': ' + e.id + ' sem rótulo');
        const grupo = e.closest('.campo,.carga,.rot');
        if (!grupo || !grupo.querySelector('.ajuda')) f.push(v + ': ' + e.id + ' sem ajuda');
        return f;
      }), v));
    }
    expect(falhas).toEqual([]);
  });

  test('todos os botões ? abrem e fecham uma explicação com texto', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    let total = 0;
    for (const v of TELAS) {
      await nav(page, v);
      const ids = await page.evaluate(() => [...document.querySelectorAll('.ajuda')].filter(b => b.offsetParent).map(b => b.getAttribute('aria-controls')));
      for (const id of ids) {
        const b = page.locator(`.ajuda[aria-controls="${id}"]`), t = page.locator('#' + id);
        await expect(t).toBeHidden();
        await b.click();
        await expect(t).toBeVisible(); await expect(b).toHaveAttribute('aria-expanded', 'true');
        expect((await t.innerText()).length).toBeGreaterThan(40);
        await b.click();
        await expect(t).toBeHidden(); await expect(b).toHaveAttribute('aria-expanded', 'false');
        total++;
      }
    }
    expect(total).toBeGreaterThanOrEqual(18);
  });

  test('perguntas do ciclo em linguagem simples, com a opção comum marcada', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'ciclo');
    await expect(page.locator('label[for=cInicio]')).toHaveText('1. Em que dia começou sua última menstruação?');
    await expect(page.locator('label[for=cDur]')).toHaveText('2. De quanto em quanto tempo ela costuma vir?');
    await expect(page.locator('label[for=cMen]')).toHaveText('3. Quantos dias a menstruação dura?');
    await expect(page.locator('#cDur option:checked')).toHaveText('A cada 28 dias (comum)');
    await expect(page.locator('#cMen option:checked')).toHaveText('5 dias (comum)');
    await page.click('.ajuda[aria-controls=hDur]');
    await expect(page.locator('#hDur')).toContainText('Não sabe? Deixe 28');
  });

  test('avisa que precisa salvar quando muda algo no ciclo', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await nav(page, 'ciclo');
    await page.selectOption('#cDur', '30');
    await expect(page.locator('#cMsg')).toHaveText('Toque em "Salvar ciclo" para guardar.');
  });

  test('linha do ciclo mostra as 4 fases e onde ela está hoje', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    await nav(page, 'ciclo'); await page.fill('#cInicio', '2026-10-30'); await page.click('#formCiclo button[type=submit]');
    const r = await page.evaluate(() => { const b = document.querySelector('.linha-ciclo'), m = b.querySelector('b'); const segs = [...b.querySelectorAll('i')].map(i => i.getBoundingClientRect()); const mk = m.getBoundingClientRect(); return { n: segs.length, dentro: mk.left + 2 >= segs[1].left && mk.left + 2 <= segs[1].right, label: b.getAttribute('aria-label') }; });
    expect(r.n).toBe(4); expect(r.dentro).toBe(true);
    expect(r.label).toContain('dia 11 de 28');
  });

  test('séries lidas em voz alta por extenso (acessibilidade)', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await page.click('#tab-Seg');
    await expect(page.locator('.ex .tag').first()).toHaveAttribute('aria-label', '4 séries de 12 repetições');
    await page.click('#tab-Qua');
    await expect(page.locator('.ex .tag').nth(1)).toHaveAttribute('aria-label', '3 séries de 40 segundos');
  });

  test('ajuda continua funcionando depois que a tela é redesenhada', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await page.click('.chips button[data-s="cansada"]');
    await page.click('.ajuda[aria-controls="hSint"]');
    await expect(page.locator('#hSint')).toContainText('Cansada ou Com cólica');
  });
});
