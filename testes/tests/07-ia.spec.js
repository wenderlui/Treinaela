// Assistente de dúvidas (IA) com o Claude simulado
const { test, expect, abrir, nav } = require('./helpers');
function mock(comportamento) {
  return `window.__p=[];window.__n=0;window.claude={use:async n=>n==='sample'?async(inp,o)=>{window.__p.push(inp);window.__n++;const q=inp[inp.length-1].content;
    const b=(${comportamento});return b(q,o);}:null};`;
}
const ok = `async(q,o)=>{await new Promise(r=>setTimeout(r,30));o.onText({text:'Parte',delta:'Parte'});await new Promise(r=>setTimeout(r,30));o.onText({text:'Parte **final**',delta:' final'});return {text:'Parte **final**',truncated:false}}`;
test.describe('IA para dúvidas', () => {
  test('responde em tempo real e guarda a conversa', async ({ page }) => {
    await abrir(page, { goal: 'definir', init: mock(ok) });
    await page.click('#abrirIA');
    await expect(page.locator('#sugs button')).toHaveCount(4);
    await page.fill('#pergunta', 'Como subir carga?'); await page.click('#enviarIA');
    await expect(page.locator('.msg.ia').last()).toHaveText('Parte final');
    await expect(page.locator('#sugs button')).toHaveCount(0);
    await page.fill('#pergunta', 'E no supino?'); await page.keyboard.press('Enter');
    await expect(page.locator('.msg.ia')).toHaveCount(3);
    const p = await page.evaluate(() => window.__p[1]);
    expect(p.map(t => t.role)).toEqual(['user', 'user', 'assistant', 'user']);
    expect(p[0].content).toContain('Definir o corpo');
    expect(p[0].content).toContain('Não faça diagnósticos');
  });
  test('contexto acompanha o dia escolhido', async ({ page }) => {
    await abrir(page, { goal: 'gluteo', init: mock(ok) });
    await page.click('#tab-Qua'); await page.click('#abrirIA');
    await page.fill('#pergunta', 'oi'); await page.keyboard.press('Enter');
    await expect(page.locator('.msg.ia').last()).toHaveText('Parte final');
    expect(await page.evaluate(() => window.__p[0][0].content)).toContain('Abdominal na polia');
  });
  test('conversa longa é cortada e sempre começa pela pergunta da usuária', async ({ page }) => {
    await abrir(page, { goal: 'gluteo', init: mock(`async(q,o)=>{o.onText({text:'r',delta:'r'});return {text:'r'}}`) });
    await page.click('#abrirIA');
    for (let i = 0; i < 15; i++) { await page.fill('#pergunta', 'p' + i); await page.keyboard.press('Enter'); await expect(page.locator('.msg.ia')).toHaveCount(i + 2); }
    const p = await page.evaluate(() => window.__p[window.__p.length - 1]);
    expect(p.length).toBeLessThanOrEqual(13); expect(p[1].role).toBe('user'); expect(p[p.length - 1].content).toBe('p14');
  });
  test('botão Parar cancela a resposta', async ({ page }) => {
    await abrir(page, { goal: 'gluteo', init: mock(`(q,o)=>new Promise((res,rej)=>{o.onText({text:'meio',delta:'meio'});o.signal.addEventListener('abort',()=>rej({code:'cancelled',text:'meio'}))})`) });
    await page.click('#abrirIA'); await page.fill('#pergunta', 'longa'); await page.keyboard.press('Enter');
    await expect(page.locator('#enviarIA')).toHaveText('Parar');
    await page.click('#enviarIA');
    await expect(page.locator('#enviarIA')).toHaveText('Enviar');
    await expect(page.locator('.msg.ia').last()).toHaveText('meio');
  });
  test('não envia duas perguntas ao mesmo tempo nem pergunta vazia', async ({ page }) => {
    await abrir(page, { goal: 'gluteo', init: mock(`(q,o)=>new Promise(r=>setTimeout(()=>{o.onText({text:'x',delta:'x'});r({text:'x'})},300))`) });
    await page.click('#abrirIA');
    await page.fill('#pergunta', '   '); await page.keyboard.press('Enter');
    await page.fill('#pergunta', 'a'); await page.keyboard.press('Enter');
    await page.fill('#pergunta', 'b'); await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__n)).toBe(1);
  });
  for (const [code, msg] of [['rate_limited', 'Espere um pouco'], ['upstream_error', 'Tente de novo'], ['refused', 'outro jeito'], ['session_expired', 'Entre de novo']]) {
    test('erro ' + code + ' mostra mensagem amigável e permite tentar de novo', async ({ page }) => {
      await abrir(page, { goal: 'gluteo', init: mock(`async(q,o)=>{if(window.__n===1)throw {code:'${code}',message:'x'};o.onText({text:'voltou',delta:'voltou'});return {text:'voltou'}}`) });
      await page.click('#abrirIA'); await page.fill('#pergunta', 'oi'); await page.keyboard.press('Enter');
      await expect(page.locator('#iaStatus')).toContainText(msg);
      await page.fill('#pergunta', 'de novo'); await page.keyboard.press('Enter');
      await expect(page.locator('.msg.ia').last()).toHaveText('voltou');
    });
  }
  test('permissão negada desliga a IA sem quebrar o app', async ({ page }) => {
    await abrir(page, { goal: 'gluteo', init: mock(`async()=>{throw {code:'not_granted',message:'x'}}`) });
    await page.click('#abrirIA'); await page.fill('#pergunta', 'oi'); await page.keyboard.press('Enter');
    await expect(page.locator('#iaStatus')).toContainText('não foi liberada');
    await expect(page.locator('#enviarIA')).toBeDisabled();
    await page.click('#fecharIA'); await page.locator('.chk').first().click();
    expect(page.errs).toEqual([]);
  });
  test('fora do Claude (app do iPhone) a IA avisa e o resto funciona', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await page.click('#abrirIA');
    await expect(page.locator('#iaStatus')).toContainText('link do Claude');
    await expect(page.locator('#enviarIA')).toBeDisabled();
    await expect(page.locator('#sugs button')).toHaveCount(0);
  });
  test('clicar fora fecha o painel', async ({ page }) => {
    await abrir(page, { goal: 'gluteo' });
    await page.click('#abrirIA'); await page.mouse.click(20, 20);
    await expect(page.locator('#painelIA')).toBeHidden();
  });
});
