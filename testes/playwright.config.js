const { defineConfig, devices } = require('@playwright/test');
const chromium = d => ({ ...d, browserName: 'chromium' });
// SITE_DIR: versão do link do Claude · APP_DIR: app instalável (raiz do repositório)
const SITE = process.env.SITE_DIR || '..';
const APP = process.env.APP_DIR || '..';
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list'], ['html', { open: 'never' }], ['json']],
  use: { baseURL: 'http://127.0.0.1:8765', trace: 'retain-on-failure' },
  webServer: [
    { command: `python3 -m http.server 8765 --directory ${SITE}`, url: 'http://127.0.0.1:8765/index.html', reuseExistingServer: true },
    { command: `python3 -m http.server 8766 --directory ${APP}`, url: 'http://127.0.0.1:8766/index.html', reuseExistingServer: true },
  ],
  projects: [
    { name: 'iPhone 13', use: chromium(devices['iPhone 13']) },
    { name: 'iPhone SE', use: chromium(devices['iPhone SE']), testMatch: /responsivo|e2e/ },
    { name: 'iPhone 15 Pro Max', use: chromium(devices['iPhone 15 Pro Max']), testMatch: /responsivo/ },
    { name: 'Galaxy S9+', use: chromium(devices['Galaxy S9+']), testMatch: /responsivo/ },
    { name: 'iPad Mini', use: chromium(devices['iPad Mini']), testMatch: /responsivo/ },
    { name: 'Desktop', use: chromium(devices['Desktop Chrome']), testMatch: /responsivo/ },
  ],
});
