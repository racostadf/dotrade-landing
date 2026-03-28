/**
 * test-cards.js — Teste de overflow dos cards no hero
 * Uso: node test-cards.js
 * Requer: npm install playwright (uma vez)
 */

const { chromium } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, 'index.html');

const VIEWPORTS = [
  { name: 'iPhone SE',     width: 375,  height: 667 },
  { name: 'iPhone 14',     width: 390,  height: 844 },
  { name: 'iPhone 14 Pro', width: 430,  height: 932 },
  { name: 'Tablet 768',    width: 768,  height: 1024 },
  { name: 'Desktop 1280',  width: 1280, height: 800 },
];

(async () => {
  const browser = await chromium.launch();
  let passed = 0, failed = 0;

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(FILE);
    await page.waitForTimeout(400);

    // Verifica overflow horizontal da página
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Verifica se os cards visíveis estão dentro da viewport
    const cardOverflow = await page.evaluate(() => {
      const vpWidth = window.innerWidth;
      const cards = document.querySelectorAll('.floating-card');
      const violations = [];
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        // Apenas cards visíveis (opacity > 0)
        const style = window.getComputedStyle(card);
        if (parseFloat(style.opacity) < 0.1) return;
        if (r.right > vpWidth + 2) {
          violations.push(`card[${i}] right=${r.right.toFixed(0)}px > viewport ${vpWidth}px`);
        }
        if (r.left < -2) {
          violations.push(`card[${i}] left=${r.left.toFixed(0)}px < 0`);
        }
      });
      return violations;
    });

    const ok = !overflow && cardOverflow.length === 0;
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${vp.name} (${vp.width}px)`);
    if (overflow)           console.log(`   ⚠ scrollWidth overflow`);
    cardOverflow.forEach(v => console.log(`   ⚠ ${v}`));

    ok ? passed++ : failed++;
    await page.close();
  }

  await browser.close();
  console.log(`\n${passed}/${passed + failed} viewports OK`);
  if (failed > 0) process.exit(1);
})();
