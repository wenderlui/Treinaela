// Testes unitários das funções puras e da integridade dos dados do app
const { test, expect, abrir } = require('./helpers');
test.describe('Unitários', () => {
  test.beforeEach(async ({ page }) => { await abrir(page); });

  test('semanaId: semana sempre começa na segunda', async ({ page }) => {
    const r = await page.evaluate(() => [
      semanaId(new Date(2026, 10, 9)), semanaId(new Date(2026, 10, 15, 23, 59)), semanaId(new Date(2026, 10, 16, 0, 0)),
      semanaId(new Date(2027, 0, 1)), semanaId(new Date(2028, 1, 29)), semanaId(new Date(2026, 2, 8, 3)), semanaId(new Date(2026, 10, 1, 1, 30))]);
    expect(r).toEqual(['2026-11-09', '2026-11-09', '2026-11-16', '2026-12-28', '2028-02-28', '2026-03-02', '2026-10-26']);
  });

  test('num: aceita só números dentro do limite', async ({ page }) => {
    const r = await page.evaluate(() => [num('20', 0, 500), num('20.55', 0, 500), num(-1, 0, 500), num('abc', 0, 500), num(Infinity, 0, 500), num('', 0, 500), num(501, 0, 500), num(null, 0, 500)]);
    expect(r).toEqual([20, 20.6, null, null, null, 0, null, 0]);
  });

  test('isDate e iso', async ({ page }) => {
    const r = await page.evaluate(() => [isDate('2026-11-09'), isDate('2026-1-9'), isDate('<b>'), isDate(5), iso(new Date(2026, 0, 5))]);
    expect(r).toEqual([true, false, false, false, '2026-01-05']);
  });

  test('limpar: remove tudo o que não é válido', async ({ page }) => {
    const r = await page.evaluate(() => limpar({
      goal: 'hack', semanas: { 'gluteo|2026-11-09': { 'Seg-0': 1, 'Seg-1': '1', '<x>': 1, 'Dom-0': 1 }, 'xx|2026-11-09': {}, 'gluteo|bad': {} },
      cargas: { 'Stiff': [['2026-11-01', 20], ['bad', 5], ['2026-11-02', 9999]], ['x'.repeat(70)]: [['2026-11-01', 1]] },
      medidas: [{ d: '2026-11-01', peso: '64.5', cintura: 9999 }, { d: 'x' }], agua: { '2026-11-09': 3, 'x': 2, '2026-11-08': 99 },
      ciclo: { inicio: 'ontem', dur: 100 }, __proto__: { mal: 1 } }));
    expect(r.goal).toBeNull();
    expect(r.semanas).toEqual({ 'gluteo|2026-11-09': { 'Seg-0': 1 } });
    expect(r.cargas).toEqual({ Stiff: [['2026-11-01', 20]] });
    expect(r.medidas).toEqual([{ d: '2026-11-01', peso: 64.5, cintura: null, quadril: null }]);
    expect(r.agua).toEqual({ '2026-11-09': 3 });
    expect(r.ciclo).toEqual({ inicio: '', dur: 28, menst: 5, ajustar: true });
  });

  test('limpar: entradas estranhas viram estado vazio', async ({ page }) => {
    const r = await page.evaluate(() => [null, undefined, 5, 'x', [], [1]].map(v => JSON.stringify(limpar(v))));
    for (const x of r) expect(x).toBe(JSON.stringify({ goal: null, semanas: {}, cargas: {}, medidas: [], agua: {}, ciclo: { inicio: "", dur: 28, menst: 5, ajustar: true }, peso: null, refeicoes: {}, sintomas: {}, normal: {}, atualizado: 0 }));
  });

  test('integridade: todo objetivo tem 5 dias, exercícios válidos e animação existente', async ({ page }) => {
    const r = await page.evaluate(() => {
      const erros = [];
      for (const g of GOALS) {
        const o = OBJ[g];
        if (!o.n || !o.d || !o.dica || !o.descanso) erros.push(g + ': campos');
        for (const d of DIAS) {
          const dia = o.dias[d];
          if (!dia) { erros.push(g + ' sem ' + d); continue; }
          if (dia.ex.length < 1 || dia.ex.length > 10) erros.push(g + d + ' qtd ' + dia.ex.length);
          dia.ex.forEach(e => { if (e.length !== 4 || !POSES[e[3]]) erros.push(g + d + ' ' + e[0]); if (!e[1] || !e[2]) erros.push(g + d + ' texto ' + e[0]); });
        }
      }
      return erros;
    });
    expect(r).toEqual([]);
  });

  test('integridade: toda animação tem todas as articulações', async ({ page }) => {
    const r = await page.evaluate(() => {
      const faltam = [];
      for (const k in POSES) for (const q of 'HSPKFEWkfew') { if (!POSES[k].A[q] || !POSES[k].B[q]) faltam.push(k + ':' + q); }
      for (const k in POSES) if (!POSES[k].A[POSES[k].m]) faltam.push(k + ' alvo');
      return faltam;
    });
    expect(r).toEqual([]);
  });

  test('ciclo: fases e semanas para ciclos de 21 a 45 dias', async ({ page }) => {
    const r = await page.evaluate(() => { const out = {}; for (const C of [21, 24, 28, 30, 35, 45]) for (const L of [2, 5, 8, 10]) { const l = limitesFases(C, L); out[C + '/' + L] = l; } return out; });
    for (const [k, l] of Object.entries(r)) {
      const C = +k.split('/')[0];
      expect(l.men[0], k).toBe(1); expect(l.tpm[1], k).toBe(C);
      expect(l.fol[0], k).toBe(l.men[1] + 1); expect(l.ovu[0], k).toBe(l.fol[1] + 1); expect(l.tpm[0], k).toBe(l.ovu[1] + 1);
      for (const f of ['men', 'fol', 'ovu', 'tpm']) expect(l[f][1] >= l[f][0], k + ' ' + f).toBeTruthy();
    }
    expect(r['28/5']).toEqual({ men: [1, 7], fol: [8, 12], ovu: [13, 21], tpm: [22, 28] });
  });

  test('ciclo: dia e fase de hoje, previsão e virada de ciclo', async ({ page }) => {
    const r = await page.evaluate(() => { const h = new Date(2026, 10, 9); const t = (ini, dur) => { S.ciclo = { inicio: ini, dur, menst: 5, ajustar: true }; const c = cicloInfo(h); return c.futuro ? 'futuro' : [c.dia, c.fase, ddmm(c.prox), c.faltam]; };
      return [t('2026-11-09', 28), t('2026-11-03', 28), t('2026-10-27', 28), t('2026-10-15', 28), t('2026-10-12', 28), t('2026-10-01', 35), t('2026-11-10', 28)]; });
    expect(r).toEqual([[1, 'men', '07/12', 28], [7, 'men', '01/12', 22], [14, 'ovu', '24/11', 15], [26, 'tpm', '12/11', 3], [1, 'men', '07/12', 28], [40 - 35, 'men', '10/12', 31], 'futuro']);
  });

  test('ciclo: horário de verão não muda o dia do ciclo', async ({ page }) => {
    const r = await page.evaluate(() => { S.ciclo = { inicio: '2026-10-25', dur: 28, menst: 5, ajustar: true }; return [cicloInfo(new Date(2026, 10, 1, 0, 30)).dia, cicloInfo(new Date(2026, 10, 1, 23, 30)).dia, cicloInfo(new Date(2026, 2, 8, 12)) ]; });
    expect(r[0]).toBe(8); expect(r[1]).toBe(8);
  });

  test('treino ajustado: leve, moderado, forte e normal', async ({ page }) => {
    const r = await page.evaluate(() => { const l = OBJ.secar.dias.Seg.ex; return ['normal', 'leve', 'moderado', 'forte'].map(m => transformar(l, m).map(e => e[0] + ' ' + e[1] + (e[4] ? '*' : ''))); });
    expect(r[0]).toEqual(['Agachamento livre 3×15', 'Afundo andando 3×12 cada perna', 'Leg press 3×15', 'Bicicleta intervalada 12 min']);
    expect(r[1]).toEqual(['Agachamento livre 2×15*', 'Afundo andando 2×12 cada perna*', 'Leg press 2×15*', 'Bicicleta leve 15 min*']);
    expect(r[2]).toEqual(['Agachamento livre 3×15', 'Afundo andando 3×12 cada perna', 'Leg press 2×15*', 'Bicicleta moderada 12 min*']);
    expect(r[3][0]).toBe('Agachamento livre 4×15*');
    const min = await page.evaluate(() => transformar([['X', '2×10', 'd', 'squat'], ['Y', '5×5', 'd', 'squat']], 'leve').map(e => e[1]).concat(transformar([['Y', '5×5', 'd', 'squat']], 'forte')[0][1]));
    expect(min).toEqual(['2×10', '4×5', '5×5']);
  });

  test('lerNum aceita vírgula e recusa texto', async ({ page }) => {
    expect(await page.evaluate(() => ['32,5', '32.5', ' 40 ', '1 000', 'abc', '-3', '3,5,1', ''].map(lerNum))).toEqual([32.5, 32.5, 40, 1000, null, null, null, null]);
  });

  test('limpar: ciclo, sintomas e treino normal', async ({ page }) => {
    const r = await page.evaluate(() => limpar({ ciclo: { inicio: '0002-11-01', dur: 99, menst: 1, ajustar: false }, sintomas: { '2026-11-09': 'colica', '2026-11-08': 'hack', x: 'normal' }, normal: { '2026-11-09': 1, '2026-11-08': 2 } }));
    expect(r.ciclo).toEqual({ inicio: '', dur: 28, menst: 5, ajustar: false });
    expect(r.sintomas).toEqual({ '2026-11-09': 'colica' });
    expect(r.normal).toEqual({ '2026-11-09': 1 });
  });

  test('limpar: peso vira medida e refeições validadas', async ({ page }) => {
    const r = await page.evaluate(() => [limpar({ peso: '62.5', refeicoes: { '2026-11-09': { 0: 3, 1: 99, 7: 1, x: 1, 2: 1.5 }, 'x': { 0: 1 }, '2026-11-08': [1] } }), limpar({ peso: 1000 }),
      limpar({ peso: 70, medidas: [{ d: '2026-11-01', peso: 60 }] })]);
    expect(r[0].peso).toBeNull(); expect(r[0].medidas.map(m => m.peso)).toEqual([62.5]);
    expect(r[0].refeicoes).toEqual({ '2026-11-09': { 0: 3 } });
    expect(r[1].medidas).toEqual([]);
    expect(r[2].medidas.map(m => m.peso)).toEqual([60]); // já tinha peso nas medidas: não duplica
  });

  test('gravarMedida junta campos do mesmo dia e remove dia vazio', async ({ page }) => {
    const r = await page.evaluate(() => { S.medidas = []; gravarMedida('2026-11-09', { peso: 64 }); gravarMedida('2026-11-09', { cintura: 72 }); gravarMedida('2026-11-02', { peso: 65 });
      const a = JSON.stringify(S.medidas); gravarMedida('2026-11-02', { peso: null }); return [a, JSON.stringify(S.medidas), pesoAtual()]; });
    expect(JSON.parse(r[0])).toEqual([{ d: '2026-11-02', peso: 65, cintura: null, quadril: null }, { d: '2026-11-09', peso: 64, cintura: 72, quadril: null }]);
    expect(JSON.parse(r[1])).toEqual([{ d: '2026-11-09', peso: 64, cintura: 72, quadril: null }]);
    expect(r[2]).toBe(64);
  });

  test('metas de alimentação: água pelo peso das medidas', async ({ page }) => {
    const r = await page.evaluate(() => { const p = v => { S.medidas = v ? [{ d: '2026-11-01', peso: v, cintura: null, quadril: null }] : []; return copos(); }; return [p(60), p(100), p(30), p(null)]; });
    expect(r).toEqual([9, 14, 6, 8]);
    const planos = await page.evaluate(() => GOALS.map(g => [g, PLANOS[NUTRI[g].plano].ref.length, PLANOS[NUTRI[g].plano].prato.reduce((a, b) => a + b[1], 0)]));
    for (const [g, n, soma] of planos) { expect(n, g).toBe(5); expect(soma, g).toBe(100); }
  });

  test('cronômetro: formato de tempo', async ({ page }) => {
    expect(await page.evaluate(() => [fmt(0), fmt(9), fmt(60), fmt(90), fmt(605)])).toEqual(['0:00', '0:09', '1:00', '1:30', '10:05']);
  });
});
