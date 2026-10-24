import { mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const origin = "http://127.0.0.1:5173";
const browser = await chromium.launch({
  channel: "msedge",
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage();
  await page.route("**/__bake__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Environment bake</title>",
    }),
  );
  await page.goto(`${origin}/__bake__`);
  const output = await page.evaluate(async () => {
    const { THREE, RoomEnvironment } =
      await import("/scripts/scene-environment-source.mjs");
    const renderer = new THREE.WebGLRenderer();
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    const target = generator.fromScene(room, 0.04, 0.1, 100, { size: 64 });
    const pixels = new Uint16Array(target.width * target.height * 4);
    renderer.readRenderTargetPixels(
      target,
      0,
      0,
      target.width,
      target.height,
      pixels,
    );
    const result = {
      width: target.width,
      height: target.height,
      pixels: Array.from(pixels),
    };
    target.dispose();
    room.dispose();
    generator.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return result;
  });
  if (!output.pixels.some((value, index) => index % 4 !== 3 && value > 0))
    throw new Error("The environment bake produced no lighting data.");
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x31565543, 0);
  header.writeUInt32LE(output.width, 4);
  header.writeUInt32LE(output.height, 8);
  const pixels = Buffer.from(new Uint16Array(output.pixels).buffer);
  const compressed = gzipSync(Buffer.concat([header, pixels]), { level: 9 });
  await mkdir(new URL("../public/3d/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../public/3d/studio-environment.json", import.meta.url),
    JSON.stringify({
      encoding: "gzip-base64",
      data: compressed.toString("base64"),
    }),
  );
  console.log(
    `Baked ${output.width} x ${output.height} lighting texture: ${compressed.length} bytes.`,
  );
} finally {
  await browser.close();
}
