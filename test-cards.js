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

    // Verifica em 3 momentos: inicial, meio de transição, após ciclo completo
    const snapshots = [400, 2000, 4000];
    let overflow = false;
    let cardOverflow = [];

    for (const delay of snapshots) {
      await page.waitForTimeout(delay === 400 ? 400 : delay - (snapshots[snapshots.indexOf(delay) - 1] || 0));

      const pageOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      if (pageOverflow) overflow = true;

      const violations = await page.evaluate(() => {
        const vpWidth  = window.innerWidth;
        const cards = document.querySelectorAll('.floating-card');
        const found = [];
        cards.forEach((card, i) => {
          const r = card.getBoundingClientRect();
          const style = window.getComputedStyle(card);
          if (parseFloat(style.opacity) < 0.05) return;
          // horizontal
          if (r.right > vpWidth + 4) found.push(`card[${i}] right=${r.right.toFixed(0)} > vp ${vpWidth}`);
          if (r.left < -4)           found.push(`card[${i}] left=${r.left.toFixed(0)} < 0`);
          // vertical clipping: compare card bottom vs parent (hero-visual) bottom
          const visual = document.querySelector('.hero-visual');
          if (visual) {
            const vr = visual.getBoundingClientRect();
            if (r.bottom > vr.bottom + 4) found.push(`card[${i}] bottom=${r.bottom.toFixed(0)} > hero-visual ${vr.bottom.toFixed(0)} (clipped)`);
          }
        });
        return found;
      });
      cardOverflow.push(...violations);
    }

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
