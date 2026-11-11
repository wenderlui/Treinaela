// Testes de carga, estresse, laços e vazamento de memória
const { test, expect, abrir, nav } = require('./helpers');
function dadosMaximos() {
  const s = { goal: 'gluteo', semanas: {}, cargas: {}, medidas: [], agua: {}, ciclo: { inicio: '2026-11-01', dur: 28 } };
  const goals = ['gluteo', 'secar', 'definir', 'massa', 'iniciante', 'postura'];
  for (let i = 0; i < 12; i++) { const d = new Date(Date.UTC(2026, 10, 9)); d.setUTCDate(d.getUTCDate() - 7 * i); const w = d.toISOString().slice(0, 10);
    for (const g of goals) { const o = {}; for (const dd of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']) for (let k = 0; k < 5; k++) o[dd + '-' + k] = 1; s.semanas[g + '|' + w] = o; }
    s.agua[w] = 8; }
  for (let e = 0; e < 60; e++) { const h = []; for (let j = 0; j < 30; j++) h.push(['2026-' + String(1 + (j % 11)).padStart(2, '0') + '-' + String(1 + j % 28).padStart(2, '0'), 10 + j]); s.cargas['Exercício ' + e] = h; }
  for (let j = 0; j < 60; j++) s.medidas.push({ d: '2026-0' + (1 + j % 9) + '-' + String(1 + j % 28).padStart(2, '0'), peso: 60 + j / 10, cintura: 70, quadril: 100 });
  return s;
}
test.describe('Carga e estresse', () => {
  test('carga máxima de dados: abre rápido e todas as telas funcionam', async ({ page }) => {
    const s = dadosMaximos();
    const bytes = JSON.stringify(s).length;
    expect(bytes).toBeLessThan(200 * 1024); // bem abaixo do limite de 5 MB do navegador
    const t0 = Date.now();
    await abrir(page, { time: '2026-11-09T10:00:00', storage: s });
    await expect(page.locator('#v-treino')).toBeVisible();
    const tAbrir = Date.now() - t0;
    const t1 = Date.now(); await nav(page, 'progresso'); await expect(page.locator('#cargas tr')).toHaveCount(61); const tProg = Date.now() - t1;
    test.info().annotations.push({ type: 'tempo', description: `abrir ${tAbrir} ms · progresso ${tProg} ms · dados ${Math.round(bytes / 1024)} KB` });
    expect(tAbrir).toBeLessThan(3000); expect(tProg).toBeLessThan(1000);
    expect(page.errs).toEqual([]);
  });

  test('carga de dados continua limitada depois de muito uso (sem crescer sem fim)', async ({ page }) => {
    await abrir(page, { time: '2026-01-05T10:00:00', goal: 'gluteo' });
    for (let dia = 0; dia < 400; dia += 3) {
      await page.evaluate(n => { gravarCarga('Stiff', 10 + n % 50); const d = iso(new Date()); S.agua[d] = n % 9; S.medidas.push({ d, peso: 60, cintura: 70, quadril: 100 }); salvar(); }, dia);
      await page.clock.setSystemTime(new Date(Date.UTC(2026, 0, 5 + dia, 12)));
    }
    await page.reload();
    const s = await page.evaluate(() => JSON.parse(localStorage.getItem('meutreino:v2')));
    expect(s.cargas['Stiff'].length).toBeLessThanOrEqual(30);
    expect(s.medidas.length).toBeLessThanOrEqual(60);
    expect(Object.keys(s.agua).length).toBeLessThanOrEqual(85);
  });

  test('@perf 500 toques seguidos em exercícios (laço de marcação)', async ({ page }) => {
    await abrir(page, { goal: 'secar' });
    const t0 = Date.now();
    const r = await page.evaluate(() => { const ini = performance.now(); let max = 0;
      for (let i = 0; i < 500; i++) { const a = performance.now(); document.querySelectorAll('.chk')[i % 4].click(); max = Math.max(max, performance.now() - a); }
      return { total: Math.round(performance.now() - ini), max: Math.round(max) }; });
    test.info().annotations.push({ type: 'tempo', description: `500 toques: ${r.total} ms, pior toque ${r.max} ms` });
    expect(r.max).toBeLessThan(100);
    expect(await page.locator('.chk[aria-pressed="true"]').count()).toBe(4); // 125 toques em cada um (ímpar): todos ficam marcados
    expect(page.errs).toEqual([]);
  });

  test('@perf laço de navegação: 300 trocas de tela e dia', async ({ page }) => {
    await abrir(page, { goal: 'definir' });
    const r = await page.evaluate(() => { const ini = performance.now(); let max = 0; const vs = ['treino', 'progresso', 'dicas', 'objetivo'];
      for (let i = 0; i < 300; i++) { const a = performance.now(); ir(vs[i % 4]); if (vs[i % 4] === 'treino') document.getElementById('tab-' + DIAS[i % 5]).click(); max = Math.max(max, performance.now() - a); }
      ir('treino'); return { total: Math.round(performance.now() - ini), max: Math.round(max) }; });
    test.info().annotations.push({ type: 'tempo', description: `300 trocas: ${r.total} ms, pior ${r.max} ms` });
    expect(r.max).toBeLessThan(150);
    expect(page.errs).toEqual([]);
  });

  test('laço de todos os objetivos × dias renderiza sem erro', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    const n = await page.evaluate(() => { let c = 0; for (let k = 0; k < 5; k++) for (const g of GOALS) { S.goal = g; for (const d of DIAS) { atual = d; renderTreino(); c += document.querySelectorAll('.ex').length; } } return c; });
    expect(n).toBeGreaterThan(500);
    expect(page.errs).toEqual([]);
  });

  test('@perf sem vazamento de memória em 2.000 renderizações', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    const cdp = await page.context().newCDPSession(page);
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize; };
    await page.evaluate(() => { for (let i = 0; i < 200; i++) { atual = DIAS[i % 5]; renderTreino(); } });
    const antes = await heap();
    await page.evaluate(() => { for (let i = 0; i < 2000; i++) { atual = DIAS[i % 5]; renderTreino(); } });
    const depois = await heap();
    const mb = (depois - antes) / 1048576;
    test.info().annotations.push({ type: 'memória', description: `variação depois de 2.000 renderizações: ${mb.toFixed(2)} MB` });
    expect(mb).toBeLessThan(5);
  });

  test('@perf animação: 60 quadros por segundo por 8 segundos, sem travadas longas', async ({ page }) => {
    await abrir(page, { goal: 'secar' });
    await page.click('#tab-Ter');
    const r = await page.evaluate(() => new Promise(res => { const lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => lt.push(e.duration))).observe({ type: 'longtask' }); } catch (e) {}
      let n = 0, max = 0, last = performance.now(); const t0 = last;
      (function f(now) { n++; max = Math.max(max, now - last); last = now; if (now - t0 < 8000) requestAnimationFrame(f); else res({ fps: Math.round(n / 8), pior: Math.round(max), travadas: lt.filter(d => d > 100).length }); })(t0); }));
    test.info().annotations.push({ type: 'fps', description: JSON.stringify(r) });
    expect(r.fps).toBeGreaterThanOrEqual(50); expect(r.pior).toBeLessThan(100); expect(r.travadas).toBe(0);
  });

  test('@perf animações fora da tela não são desenhadas (economia de bateria)', async ({ page }) => {
    await abrir(page, { goal: 'secar' });
    await page.click('#tab-Ter');
    await page.waitForTimeout(300);
    const vis = await page.evaluate(() => demos.map(d => d.vis));
    expect(vis).toContain(false);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(300);
    expect(await page.evaluate(() => demos[demos.length - 1].vis)).toBe(true);
  });

  test('cronômetro: 100 ciclos de iniciar/pausar sem acumular timers', async ({ page }) => {
    await abrir(page, { time: '2026-11-09T10:00:00', goal: 'gluteo' });
    for (let i = 0; i < 100; i++) await page.click('#iniciar');
    await page.click('[data-s="30"]'); await page.click('#iniciar');
    await page.clock.runFor(5000);
    await expect(page.locator('#tempo')).toHaveText('0:25');
  });
});
