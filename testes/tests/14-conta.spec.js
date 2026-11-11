// Login opcional (Google e e-mail), validações, confirmação de e-mail, sincronização,
// exclusão de conta, páginas legais e direitos autorais. Usa um Firebase simulado.
const { test, expect, nav } = require('./helpers');
const AxeBuilder = require('@axe-core/playwright').default;
const APP = 'http://127.0.0.1:8766/';
test.use({ serviceWorkers: 'block' });

const FIREBASE_FALSO = () => {
  const fb = window.__fb = { usuarios: {}, docs: {}, atual: null, ouvintes: [], enviados: [], senhaReset: [] };
  const notificar = () => fb.ouvintes.forEach(cb => setTimeout(() => cb(fb.atual)));
  const criar = (email, prov, verif, senha) => {
    const u = { uid: 'uid_' + email.replace(/\W/g, ''), email, emailVerified: verif, providerData: [{ providerId: prov }], _senha: senha,
      async sendEmailVerification() { fb.enviados.push(email); }, async reload() { this.emailVerified = fb.usuarios[email].emailVerified; },
      async getIdToken() { return 't'; }, async delete() { delete fb.usuarios[email]; fb.atual = null; notificar(); } };
    fb.usuarios[email] = u; return u;
  };
  fb.confirmar = email => { fb.usuarios[email].emailVerified = true; };
  fb.criar = criar;
  const auth = {
    get currentUser() { return fb.atual; }, languageCode: 'en',
    onAuthStateChanged(cb) { fb.ouvintes.push(cb); setTimeout(() => cb(fb.atual)); },
    async getRedirectResult() { return { user: null }; },
    async signInWithEmailAndPassword(e, s) { const u = fb.usuarios[e]; if (!u || u._senha !== s) throw { code: 'auth/invalid-credential' }; fb.atual = u; notificar(); return { user: u }; },
    async createUserWithEmailAndPassword(e, s) { if (fb.usuarios[e]) throw { code: 'auth/email-already-in-use' }; const u = criar(e, 'password', false, s); fb.atual = u; notificar(); return { user: u }; },
    async signInWithPopup() { const u = fb.usuarios['google@teste.com'] || criar('google@teste.com', 'google.com', true); fb.atual = u; notificar(); return { user: u }; },
    async signInWithRedirect() {},
    async sendPasswordResetEmail(e) { fb.senhaReset.push(e); },
    async signOut() { fb.atual = null; notificar(); },
  };
  const firebase = { apps: [], initializeApp(c) { firebase.apps.push(c); fb.config = c; return {}; }, app() { return {}; },
    auth: Object.assign(() => auth, { GoogleAuthProvider: class {} }),
    firestore: () => ({ collection: n => ({ doc: id => ({
      async get() { return { exists: id in fb.docs, data: () => fb.docs[id] }; },
      async set(v) { fb.docs[id] = JSON.parse(JSON.stringify(v)); },
      async delete() { delete fb.docs[id]; } }) }) }) };
  window.firebase = firebase;
};
const CONFIG = 'window.TREINA_ELA_FIREBASE={apiKey:"AIza_teste",authDomain:"teste.firebaseapp.com",projectId:"teste",appId:"1:1:web:1"};';

async function abrirApp(page, { configurado = true } = {}) {
  if (configurado) {
    await page.route('**/firebase-config.js', r => r.fulfill({ contentType: 'text/javascript', body: CONFIG }));
    await page.addInitScript(FIREBASE_FALSO);
  }
  await page.route(/gstatic\.com|fonts\./, r => r.abort());
  await page.goto(APP + 'index.html');
  await page.click('#goal-gluteo');
  await nav(page, 'objetivo');
}
const criarConta = async (page, email = 'ana@teste.com', senha = 'treino2026') => {
  await page.click('#abaCriar');
  await page.fill('#cEmail', email); await page.fill('#cSenha', senha); await page.fill('#cSenha2', senha);
  await page.click('label[for=cAceite] i');
  await page.click('#formCriar button[type=submit]');
};

test.describe('Conta: aparece só quando o login está configurado', () => {
  test('sem configuração do Firebase o login fica escondido e o app funciona', async ({ page }) => {
    await abrirApp(page, { configurado: false });
    await expect(page.locator('#contaCard')).toBeHidden();
    await expect(page.locator('#syncStatus')).toHaveText('Salvo neste aparelho.');
    expect(page.errs).toEqual([]);
  });
  test('no link do Claude o login não aparece (lá salva na conta Claude)', async ({ page }) => {
    await page.route(/fonts\./, r => r.abort());
    await page.goto('http://127.0.0.1:8765/index.html'); await page.click('#goal-gluteo'); await nav(page, 'objetivo');
    await expect(page.locator('#contaCard')).toBeHidden();
  });
  test('com configuração, o cartão de conta aparece com Google e e-mail', async ({ page }) => {
    await abrirApp(page);
    await expect(page.locator('#contaCard')).toBeVisible();
    await expect(page.locator('#entrarGoogle')).toHaveText('Entrar com Google');
    await expect(page.locator('#syncStatus')).toContainText('Entre na sua conta');
  });
});

test.describe('Conta: acessibilidade e layout', () => {
  for (const tema of ['light', 'dark']) test('cartão de conta sem falhas graves de acessibilidade (' + tema + ')', async ({ page }) => {
    await page.emulateMedia({ colorScheme: tema });
    await abrirApp(page);
    for (const aba of ['#abaEntrar', '#abaCriar', '#abaSenha']) {
      await page.click(aba);
      const r = await new AxeBuilder({ page }).include('#contaCard').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(r.violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => x.id + ' ' + x.nodes.map(n => n.target.join(' ')).join(','))).toEqual([]);
    }
    await page.click('#entrarGoogle');
    const r2 = await new AxeBuilder({ page }).include('#contaCard').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r2.violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => x.id)).toEqual([]);
  });
  test('botões do login com tamanho bom para o dedo e sem sair da tela', async ({ page }) => {
    await abrirApp(page); await page.click('#abaCriar');
    const r = await page.evaluate(() => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll('#contaCard button, #contaCard input:not([type=checkbox])')].filter(e => e.offsetParent)
      .map(e => { const b = e.getBoundingClientRect(); return [e.id || e.textContent.trim().slice(0, 15), Math.round(b.height), Math.round(b.right) <= W]; }).filter(([, h, dentro]) => h < 44 || !dentro); });
    expect(r).toEqual([]);
    await page.locator('#contaCard').screenshot({ path: 'capturas/conta-' + test.info().project.name.replace(/ /g, '_') + '.png' });
  });
});

test.describe('Criar conta: validações', () => {
  test('campos vazios mostram o erro em cada campo', async ({ page }) => {
    await abrirApp(page); await page.click('#abaCriar');
    await page.click('#formCriar button[type=submit]');
    await expect(page.locator('#cEmailErr')).toHaveText('Digite seu e-mail.');
    await expect(page.locator('#cSenhaErr')).toHaveText('Crie uma senha.');
    await expect(page.locator('#cSenha2Err')).toHaveText('Repita a senha.');
    await expect(page.locator('#cAceiteErr')).toContainText('aceite os Termos');
    await expect(page.locator('#cEmail')).toHaveAttribute('aria-invalid', 'true');
    expect(await page.evaluate(() => document.activeElement.id)).toBe('cEmail');
  });
  for (const [email, erro] of [['ana', 'Esse e-mail não parece certo.'], ['ana@', 'Esse e-mail não parece certo.'], ['ana@site', 'Esse e-mail não parece certo.'], ['ana silva@site.com', 'Esse e-mail não parece certo.']]) {
    test('e-mail inválido: ' + email, async ({ page }) => {
      await abrirApp(page); await page.click('#abaCriar');
      await page.fill('#cEmail', email); await page.click('#formCriar button[type=submit]');
      await expect(page.locator('#cEmailErr')).toHaveText(erro);
    });
  }
  for (const [senha, erro] of [['abc12', 'A senha precisa ter pelo menos 8 caracteres.'], ['abcdefgh', 'Use letras e números na senha.'], ['12345678', 'Use letras e números na senha.']]) {
    test('senha fraca: ' + senha, async ({ page }) => {
      await abrirApp(page); await page.click('#abaCriar');
      await page.fill('#cSenha', senha); await page.click('#formCriar button[type=submit]');
      await expect(page.locator('#cSenhaErr')).toHaveText(erro);
    });
  }
  test('senhas diferentes', async ({ page }) => {
    await abrirApp(page); await page.click('#abaCriar');
    await page.fill('#cSenha', 'treino2026'); await page.fill('#cSenha2', 'treino2027'); await page.click('#formCriar button[type=submit]');
    await expect(page.locator('#cSenha2Err')).toHaveText('As senhas não são iguais.');
  });
  test('o erro some quando a pessoa corrige o campo', async ({ page }) => {
    await abrirApp(page); await page.click('#abaCriar');
    await page.click('#formCriar button[type=submit]');
    await page.fill('#cEmail', 'a');
    await expect(page.locator('#cEmailErr')).toBeHidden();
    await expect(page.locator('#cEmail')).not.toHaveAttribute('aria-invalid', 'true');
  });
  test('mostrar e ocultar a senha', async ({ page }) => {
    await abrirApp(page); await page.click('#abaCriar');
    await page.fill('#cSenha', 'treino2026');
    await page.click('.ver-senha[data-alvo=cSenha]');
    await expect(page.locator('#cSenha')).toHaveAttribute('type', 'text');
    await page.click('.ver-senha[data-alvo=cSenha]');
    await expect(page.locator('#cSenha')).toHaveAttribute('type', 'password');
  });
  test('e-mail que já tem conta', async ({ page }) => {
    await abrirApp(page);
    await page.evaluate(() => window.__fb.criar('ana@teste.com', 'password', true, 'x1234567'));
    await criarConta(page);
    await expect(page.locator('#contaMsg')).toContainText('Já existe uma conta com esse e-mail');
  });
});

test.describe('Confirmação de e-mail e sincronização', () => {
  test('conta nova: pede confirmação e só salva na nuvem depois de confirmar', async ({ page }) => {
    await abrirApp(page);
    await criarConta(page);
    await expect(page.locator('#contaDentro')).toBeVisible();
    await expect(page.locator('#contaVerificar')).toBeVisible();
    await expect(page.locator('#contaEmail')).toHaveText('ana@teste.com');
    expect(await page.evaluate(() => window.__fb.enviados)).toEqual(['ana@teste.com']);
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => Object.keys(window.__fb.docs))).toEqual([]);
    await page.click('#jaConfirmei');
    await expect(page.locator('#contaMsg')).toContainText('Ainda não aparece como confirmado');
    await page.click('#reenviar');
    await expect(page.locator('#contaMsg')).toContainText('Espere');
    await page.evaluate(() => window.__fb.confirmar('ana@teste.com'));
    await page.click('#jaConfirmei');
    await expect(page.locator('#contaMsg')).toContainText('E-mail confirmado');
    await expect(page.locator('#contaVerificar')).toBeHidden();
    await expect(page.locator('#syncStatus')).toContainText('Salvo na sua conta Treina Ela');
    const doc = await page.evaluate(() => window.__fb.docs['uid_anatestecom']);
    expect(JSON.parse(doc.s).goal).toBe('gluteo');
  });

  test('entrar com e-mail: senha errada, depois certa, e os dados da nuvem voltam', async ({ page }) => {
    await abrirApp(page);
    await page.evaluate(() => { const u = window.__fb.criar('bia@teste.com', 'password', true, 'certa1234');
      window.__fb.docs[u.uid] = { v: 1, atualizado: Date.now() + 99999, s: JSON.stringify({ goal: 'massa', medidas: [{ d: '2026-11-01', peso: 58, cintura: null, quadril: null }], atualizado: Date.now() + 99999 }) }; });
    await page.fill('#lEmail', 'bia@teste.com'); await page.fill('#lSenha', 'errada123');
    await page.click('#formEntrar button[type=submit]');
    await expect(page.locator('#contaMsg')).toHaveText('E-mail ou senha incorretos.');
    await page.fill('#lSenha', 'certa1234'); await page.press('#lSenha', 'Enter');
    await expect(page.locator('#contaDentro')).toBeVisible();
    await expect(page.locator('#subObjetivo')).toHaveText('Ganhar massa');
    await nav(page, 'alimentacao'); await expect(page.locator('#alPeso')).toHaveValue('58');
  });

  test('entrar com Google já conta como e-mail confirmado', async ({ page }) => {
    await abrirApp(page);
    await page.click('#entrarGoogle');
    await expect(page.locator('#contaTipo')).toHaveText('Entrou com Google');
    await expect(page.locator('#contaVerificar')).toBeHidden();
    await expect(page.locator('#syncStatus')).toContainText('Salvo na sua conta Treina Ela');
    await page.locator('nav.menu button[data-v="treino"]').click(); await page.locator('.chk').first().click();
    await page.waitForTimeout(1200);
    expect(JSON.parse((await page.evaluate(() => window.__fb.docs['uid_googletestecom'])).s).semanas).toBeTruthy();
  });

  test('esqueci a senha', async ({ page }) => {
    await abrirApp(page); await page.click('#abaSenha');
    await page.fill('#rEmail', 'errado'); await page.click('#formSenha button[type=submit]');
    await expect(page.locator('#rEmailErr')).toHaveText('Esse e-mail não parece certo.');
    await page.fill('#rEmail', 'ana@teste.com'); await page.click('#formSenha button[type=submit]');
    await expect(page.locator('#contaMsg')).toContainText('Se existir uma conta com esse e-mail');
    expect(await page.evaluate(() => window.__fb.senhaReset)).toEqual(['ana@teste.com']);
  });

  test('sair mantém os dados no celular', async ({ page }) => {
    await abrirApp(page);
    await page.click('#entrarGoogle'); await expect(page.locator('#contaDentro')).toBeVisible();
    await page.click('#sair');
    await expect(page.locator('#contaFora')).toBeVisible();
    await expect(page.locator('#syncStatus')).toContainText('Salvo neste aparelho');
    await expect(page.locator('#subObjetivo')).toHaveText('Glúteo e pernas');
  });

  test('excluir conta pede confirmação e apaga a conta e os dados da nuvem', async ({ page }) => {
    await abrirApp(page);
    await page.click('#entrarGoogle'); await page.waitForTimeout(1200);
    expect(await page.evaluate(() => Object.keys(window.__fb.docs))).toEqual(['uid_googletestecom']);
    await page.click('#excluirConta'); await page.click('#naoExcluir');
    expect(await page.evaluate(() => Object.keys(window.__fb.usuarios))).toEqual(['google@teste.com']);
    await page.click('#excluirConta'); await page.click('#simExcluir');
    await expect(page.locator('#contaMsg')).toHaveText('Sua conta e os dados da nuvem foram excluídos.');
    expect(await page.evaluate(() => [Object.keys(window.__fb.docs), Object.keys(window.__fb.usuarios)])).toEqual([[], []]);
    await expect(page.locator('#contaFora')).toBeVisible();
  });

  test('sem internet para carregar o login: avisa e o app segue funcionando', async ({ page }) => {
    await page.route('**/firebase-config.js', r => r.fulfill({ contentType: 'text/javascript', body: CONFIG }));
    await page.route(/gstatic\.com|fonts\./, r => r.abort());
    await page.goto(APP + 'index.html'); await page.click('#goal-gluteo'); await nav(page, 'objetivo');
    await expect(page.locator('#contaMsg')).toContainText('Sem internet');
    await page.click('#entrarGoogle');
    await expect(page.locator('#contaMsg')).toContainText('Sem internet');
    await nav(page, 'treino'); await page.locator('.chk').first().click();
    await expect(page.locator('#pct')).toHaveText('25%');
  });
});

test.describe('Páginas legais e direitos autorais', () => {
  test('política de privacidade completa (LGPD e Play Store)', async ({ page }) => {
    await page.goto(APP + 'privacidade.html');
    const t = await page.locator('main').innerText();
    for (const x of ['WR Lui', 'LGPD', 'Base legal', 'Firebase', 'Transferência internacional', 'Por quanto tempo', 'Seus direitos', 'Excluir minha conta', 'ANPD', '18 anos'])
      expect(t, x).toContain(x);
    await expect(page.locator('#excluir-conta')).toBeVisible();
    await expect(page.locator('footer')).toContainText('© 2026 WR Lui. Todos os direitos reservados.');
  });
  test('termos de uso com direitos autorais e aviso de saúde', async ({ page }) => {
    await page.goto(APP + 'termos.html');
    const t = await page.locator('main').innerText();
    for (const x of ['© 2026 WR Lui. Todos os direitos reservados.', 'Lei nº 9.610/1998', 'Não é orientação médica', 'não servem como método para evitar'])
      expect(t, x).toContain(x);
  });
  test('o app mostra os direitos autorais e os links para privacidade e termos', async ({ page }) => {
    await abrirApp(page, { configurado: false });
    await expect(page.locator('#meusDados .copy')).toContainText('© 2026 WR Lui. Todos os direitos reservados.');
    for (const id of ['linkPriv', 'linkTermos']) {
      const href = await page.getAttribute('#' + id, 'href');
      expect((await page.request.get(APP + href)).ok()).toBeTruthy();
    }
    expect(await page.getAttribute('meta[name=author]', 'content')).toBe('WR Lui');
    const lic = await (await page.request.get(APP + 'LICENSE')).text();
    expect(lic).toContain('Todos os direitos reservados');
  });
  test('regras do Firestore: cada pessoa só acessa o próprio documento', async ({ page }) => {
    const r = await (await page.request.get(APP + 'firestore.rules')).text();
    expect(r).toContain('request.auth.uid == uid');
    expect(r).toContain('email_verified == true');
    expect(r).toContain('allow read, write: if false');
  });
});
