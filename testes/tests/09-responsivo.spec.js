// Layout em vários aparelhos: sem rolagem lateral, toques confortáveis, nada escondido
const { test, expect, abrir, nav } = require('./helpers');
test('layout em todas as telas e objetivos', async ({ page }) => {
  await abrir(page, { goal: 'gluteo' });
  const problemas = [];
  const toqueMin = 44; // recomendação da Apple para iPhone (o interruptor é tocado pela linha inteira, que tem 48px)
  const medir = async nome => {
    const r = await page.evaluate(min => {
      const o = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const peq = [...document.querySelectorAll('button,a,input,textarea,summary')].filter(e => e.offsetParent && e.getClientRects().length && !(e.closest('.switch') && e.type === 'checkbox'))
        .map(e => { const r = e.getBoundingClientRect(); return [(e.getAttribute('aria-label') || e.textContent || e.id).trim().slice(0, 18), Math.round(r.width), Math.round(r.height)]; })
        .filter(([, w, h]) => h < min - 0.5 || w < min - 0.5);
      const cortado = [...document.querySelectorAll('.nome,.tag,.dica,h2,h3,.sub')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.slice(0, 20));
      const fora = [...document.querySelectorAll('input:not([type=checkbox]),select,textarea,.btn,.chips button')].filter(e => e.offsetParent).filter(e => { const c = e.closest('.card,.ex,.sheet'); if (!c) return false; const a = e.getBoundingClientRect(), b = c.getBoundingClientRect(); return a.right > b.right + 1 || a.left < b.left - 1; }).map(e => 'sai da caixa ' + (e.id || e.textContent.trim().slice(0, 15)));
      const selCortado = [...document.querySelectorAll('select')].filter(e => e.offsetParent).filter(e => { const c = document.createElement('canvas').getContext('2d'); const st = getComputedStyle(e); c.font = st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily; return c.measureText(e.options[e.selectedIndex].text).width > e.clientWidth - 44; }).map(e => 'opção cortada ' + e.id);
      cortado.push(...fora, ...selCortado);
      return { o, peq, cortado };
    }, toqueMin);
    if (r.o > 0) problemas.push(nome + ': rola para o lado ' + r.o + 'px');
    r.peq.forEach(x => problemas.push(nome + ': toque pequeno ' + x.join('/')));
    r.cortado.forEach(x => problemas.push(nome + ': ' + x));
  };
  for (const g of ['gluteo', 'secar', 'definir', 'massa', 'iniciante', 'postura']) {
    await nav(page, 'objetivo'); await page.click('#goal-' + g);
    await nav(page, 'alimentacao'); await medir(g + '/alimentacao'); await nav(page, 'treino');
    for (const d of ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']) { await page.click('#tab-' + d); await medir(g + '/' + d); }
  }
  for (const v of ['progresso', 'alimentacao', 'ciclo', 'dicas', 'objetivo']) { await nav(page, v); await medir(v); }
  await page.click('#abrirIA'); await medir('IA');
  expect([...new Set(problemas)]).toEqual([]);
  // nada importante fica escondido atrás da barra fixa
  await page.keyboard.press('Escape'); await nav(page, 'treino');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const sob = await page.evaluate(() => { const fixo = document.querySelector('.fixo').getBoundingClientRect().top; const ult = [...document.querySelectorAll('.ex')].pop().getBoundingClientRect().bottom; return ult <= fixo; });
  expect(sob).toBe(true);
  await page.screenshot({ path: `capturas/${test.info().project.name.replace(/ /g, '_')}.png` });
});
