import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

for (const scene of [
  {
    page: "landing",
    path: "/",
    module: /\/src\/features\/landing\/HeartScene\.tsx(?:\?|$)/,
    selector: ".intro-heart-scene",
    poster: "/images/heart-study.png",
  },
  {
    page: "login",
    path: "/login",
    module: /\/src\/features\/auth\/CoronaryScene\.tsx(?:\?|$)/,
    selector: ".coronary-scene",
    poster: "/images/coronary-study.png",
  },
]) {
  test(`${scene.page} requests its poster before the app and keeps it visible during slow 3D loading`, async ({
    page,
  }) => {
    let releaseApp!: () => void;
    let releaseScene!: () => void;
    const appGate = new Promise<void>((resolve) => {
      releaseApp = resolve;
    });
    const sceneGate = new Promise<void>((resolve) => {
      releaseScene = resolve;
    });
    const posterRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === scene.poster)
        posterRequests.push(request.url());
    });
    await page.route(/\/src\/main\.tsx(?:\?|$)/, async (route) => {
      await appGate;
      await route.continue();
    });
    await page.route(scene.module, async (route) => {
      await sceneGate;
      await route.continue();
    });
    await page.addInitScript((poster) => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        type: string,
        ...args: unknown[]
      ) {
        if (type === "webgl2") {
          const image = document.querySelector<HTMLImageElement>(
            `img[src="${poster}"]`,
          );
          document.documentElement.dataset.posterLoadedBeforeWebgl = String(
            Boolean(image?.complete && image.naturalWidth > 0),
          );
        }
        return Reflect.apply(getContext, this, [type, ...args]);
      } as typeof getContext;
    }, scene.poster);
    try {
      await page.goto(scene.path, { waitUntil: "commit" });
      const preload = page.locator('link[rel="preload"][as="image"]');
      await expect(preload).toHaveAttribute("href", scene.poster);
      await expect(preload).toHaveAttribute("fetchpriority", "high");
      await expect.poll(() => posterRequests.length).toBe(1);
      await expect(page.locator("#root")).toBeEmpty();
      releaseApp();
      const poster = page.locator(`${scene.selector} img`);
      await expect(poster).toBeVisible();
      await expect(poster).toHaveAttribute("loading", "eager");
      await expect(poster).toHaveAttribute("fetchpriority", "high");
      await expect
        .poll(() =>
          poster.evaluate(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        )
        .toBe(true);
      await expect(page.locator(`${scene.selector} canvas`)).toHaveCount(0);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await poster.scrollIntoViewIfNeeded();
        await expect(poster).toBeInViewport();
        await page.screenshot({
          path: `test-results/${scene.page}-instant-poster-${width}.png`,
        });
      }
      releaseScene();
      await expect(page.locator(scene.selector)).toHaveClass(/is-ready/);
      await expect(page.locator("html")).toHaveAttribute(
        "data-poster-loaded-before-webgl",
        "true",
      );
      const canvas = page.locator(`${scene.selector} canvas`);
      await expect(canvas).toHaveAttribute("data-lighting", "baked");
      await expect(canvas).toHaveCSS("opacity", "1");
      await expect(poster).toHaveCount(1);
      await expect(poster).toBeHidden();
      expect(posterRequests).toHaveLength(1);
      await canvas.evaluate((element) => {
        element.dispatchEvent(
          new Event("webglcontextlost", { cancelable: true }),
        );
      });
      await expect(page.locator(scene.selector)).toHaveClass(/is-fallback/);
      await expect(poster).toBeVisible();
    } finally {
      releaseApp();
      releaseScene();
    }
  });

  test(`${scene.page} still initializes 3D if the poster cannot load`, async ({
    page,
  }) => {
    await page.route(`**${scene.poster}`, (route) => route.abort());
    await page.goto(scene.path);
    const host = page.locator(scene.selector);
    await expect(host).toHaveClass(/is-ready/);
    await expect(host.locator("canvas")).toHaveCSS("opacity", "1");
  });

  test(`${scene.page} falls back to direct lighting if the lighting asset fails`, async ({
    page,
  }) => {
    await page.route("**/3d/studio-environment.json", (route) => route.abort());
    await page.goto(scene.path);
    const host = page.locator(scene.selector);
    await expect(host).toHaveClass(/is-ready/);
    await expect(host.locator("canvas")).toHaveAttribute(
      "data-lighting",
      "direct",
    );
    await expect(host.locator("canvas")).toHaveCSS("opacity", "1");
  });
}
