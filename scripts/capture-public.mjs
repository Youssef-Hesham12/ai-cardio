import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  await mkdir("test-results", { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5173/login");
  await page.locator(".coronary-scene.is-ready").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const artifact = await page
    .locator('canvas[data-scene="coronary-study"]')
    .evaluate((canvas) => {
      const gl = canvas.getContext("webgl2"),
        width = canvas.width,
        height = canvas.height;
      const data = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      let minX = width,
        minY = height,
        maxX = 0,
        maxY = 0,
        count = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3] < 70) continue;
          count++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      const crop = document.createElement("canvas");
      crop.width = maxX - minX + 33;
      crop.height = maxY - minY + 33;
      crop
        .getContext("2d")
        .drawImage(
          canvas,
          minX - 16,
          height - maxY - 16,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height,
        );
      return {
        image: crop.toDataURL("image/png"),
        count,
        bounds: { minX, minY, maxX, maxY },
        width,
        height,
      };
    });
  await writeFile(
    "public/images/coronary-study.png",
    Buffer.from(artifact.image.split(",")[1], "base64"),
  );
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("http://127.0.0.1:5173/");
    await page.locator(".intro-heart-scene.is-ready").waitFor();
    await page.locator("#workspace").scrollIntoViewIfNeeded();
    await page.locator(".clinical-preview").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/premium-landing-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto("http://127.0.0.1:5173/login");
    await page.locator(".login-vessel-visual").scrollIntoViewIfNeeded();
    await page.locator(".coronary-scene.is-ready").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/premium-login-${viewport.width}.png`,
      fullPage: true,
    });
  }
  console.log(
    JSON.stringify({
      count: artifact.count,
      bounds: artifact.bounds,
      width: artifact.width,
      height: artifact.height,
      errors,
    }),
  );
} finally {
  await browser.close();
}
