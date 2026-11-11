# Treina Ela

App de academia para mulheres: treinos por objetivo com animação dos exercícios, alimentação por objetivo, cronograma do mês pelo ciclo menstrual, progresso (cargas, medidas, água) e login opcional para salvar os dados na nuvem.

**© 2026 WR Lui. Todos os direitos reservados.** O código está visível apenas para consulta. Veja [LICENSE](LICENSE).

- App: `https://wenderlui.github.io/Treinaela/`
- Política de Privacidade: `https://wenderlui.github.io/Treinaela/privacidade.html`
- Termos de Uso: `https://wenderlui.github.io/Treinaela/termos.html`
- Excluir conta e dados: `https://wenderlui.github.io/Treinaela/privacidade.html#excluir-conta`

## Estrutura

| Arquivo / pasta | O que é |
|---|---|
| `index.html` | O app inteiro (telas, treinos, animações, login e sincronização) |
| `manifest.json`, `sw.js`, `icons/` | App instalável (tela de início, ícone, funciona sem internet) |
| `firebase-config.js` | Configuração do login. Enquanto tiver `COLE_AQUI`, o login fica escondido |
| `firestore.rules` | Regras de segurança da nuvem: cada pessoa só acessa os próprios dados |
| `privacidade.html`, `termos.html`, `legal.css` | Política de Privacidade e Termos de Uso |
| `testes/` | Testes automáticos (Playwright) |
| `LICENSE` | Direitos autorais |

## Publicar no GitHub Pages

1. No GitHub, abra **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
3. Em alguns minutos o app fica em `https://wenderlui.github.io/Treinaela/`.

## Ativar o login (Firebase)

1. Entre em [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto chamado **Treina Ela** (pode desligar o Google Analytics).
2. **Authentication → Começar → Método de login:** ative **Google** e **E-mail/senha**.
3. **Authentication → Configurações → Domínios autorizados:** adicione `wenderlui.github.io`.
4. **Firestore Database → Criar banco de dados** (modo produção, região `southamerica-east1`, São Paulo).
5. **Firestore → Regras:** apague o que estiver lá, cole o conteúdo de `firestore.rules` e clique em **Publicar**.
6. **Configurações do projeto → Seus apps → Web (`</>`)**: registre o app, copie os valores de `firebaseConfig` para `firebase-config.js` e faça commit.
7. (Opcional) **Authentication → Modelos:** troque o idioma dos e-mails para Português.

Os valores de `firebase-config.js` não são senhas. A proteção vem das regras do Firestore e dos domínios autorizados.

## Testes

```bash
cd testes
npm install
npx playwright install chromium
npx playwright test
```

Os testes cobrem funções internas, fluxos completos, salvamento, segurança, carga e estresse, acessibilidade (WCAG AA), IA, app instalável, layout em 6 aparelhos, alimentação, ciclo, campos com ajuda, salvar/editar/excluir e login.

---
© 2026 WR Lui. Todos os direitos reservados.
