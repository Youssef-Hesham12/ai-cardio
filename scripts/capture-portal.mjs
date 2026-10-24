import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByRole('button', { name: 'Enter demo workspace' }).click();
  await page.getByRole('heading', { name: /Welcome Back/ }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelectorAll('.recharts-sector').length === 3);
  await mkdir('public/images', { recursive: true });
  await page.screenshot({ path: 'public/images/portal-preview.jpg', type: 'jpeg', quality: 90 });
  console.log('Captured actual doctor portal preview.');
} finally { await browser.close(); }
