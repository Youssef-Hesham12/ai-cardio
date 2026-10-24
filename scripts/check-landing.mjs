import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:5173/");
  await page.locator(".intro-heart-scene.is-ready").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const artwork = await page
    .locator('canvas[data-scene="cardiac-study"]')
    .evaluate((canvas) => {
      const gl = canvas.getContext("webgl2");
      const width = canvas.width,
        height = canvas.height;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let minX = width,
        minY = height,
        maxX = 0,
        maxY = 0,
        count = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          if (pixels[(y * width + x) * 4 + 3] > 30) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            count++;
          }
        }
      const crop = document.createElement("canvas");
      crop.width = maxX - minX + 17;
      crop.height = maxY - minY + 17;
      crop
        .getContext("2d")
        .drawImage(
          canvas,
          minX - 8,
          height - maxY - 8,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height,
        );
      return {
        count,
        image: crop.toDataURL("image/png"),
        bounds: { minX, minY, maxX, maxY },
        frames: canvas.dataset.frames,
      };
    });
  await mkdir("public/images", { recursive: true });
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "public/images/heart-study.png",
    Buffer.from(artwork.image.split(",")[1], "base64"),
  );
  await page.screenshot({ path: "test-results/landing-desktop.png" });
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await page.screenshot({ path: "test-results/landing-structure.png" });
  await page.getByRole("button", { name: "Surface", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/landing-mobile.png" });
  await page.getByRole("button", { name: "Pause signal animation" }).click();
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const previousFrames = Number(
      (await page
        .locator('canvas[data-scene="cardiac-signal"]')
        .getAttribute("data-frames")) || 0,
    );
    await page.setViewportSize(viewport);
    await page.locator(".intro-signal-experience").scrollIntoViewIfNeeded();
    await page.locator(".intro-signal-scene.is-ready").waitFor();
    await page.waitForFunction((previous) => {
      const canvas = document.querySelector(
        'canvas[data-scene="cardiac-signal"]',
      );
      return (
        canvas &&
        canvas.width === Math.round(canvas.getBoundingClientRect().width) &&
        Number(canvas.dataset.frames || 0) > previous
      );
    }, previousFrames);
    const data = await page
      .locator('canvas[data-scene="cardiac-signal"]')
      .evaluate((canvas) => canvas.toDataURL("image/png"));
    await writeFile(
      `public/images/signal-study${viewport.width < 761 ? "-mobile" : ""}.png`,
      Buffer.from(data.split(",")[1], "base64"),
    );
    await page.screenshot({
      path: `test-results/signal-study-${viewport.width}.png`,
    });
  }
  console.log(
    JSON.stringify({
      pixels: artwork.count,
      bounds: artwork.bounds,
      frames: artwork.frames,
      errors,
    }),
  );
} finally {
  await browser.close();
}
