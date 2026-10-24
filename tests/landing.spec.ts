import { test, expect, type Page } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });
async function openLanding(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "CardioAssist AI", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".intro-heart-scene")).toHaveClass(/is-ready/);
  await page.evaluate(() => document.fonts.ready);
}
async function pixels(page: Page, scene = "cardiac-study") {
  return page.locator(`canvas[data-scene="${scene}"]`).evaluate((canvas) => {
    const surface = canvas as HTMLCanvasElement;
    const gl = surface.getContext("webgl2")!;
    const width = surface.width,
      height = surface.height;
    const buffer = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    let count = 0,
      background = 0,
      minX = width,
      minY = height,
      maxX = 0,
      maxY = 0,
      checksum = 0;
    for (let y = 0; y < height; y += 2)
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (buffer[i + 3] > 5 && buffer[i + 3] <= 70) background++;
        if (buffer[i + 3] > 70) {
          count++;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
        checksum +=
          buffer[i] * 3 + buffer[i + 1] * 5 + buffer[i + 2] * 7 + buffer[i + 3];
      }
    return {
      count,
      background,
      checksum,
      width,
      height,
      minX,
      minY,
      maxX,
      maxY,
    };
  });
}

test("public landing, portal sign-in, and signed-in return action work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openLanding(page);
  await page
    .getByRole("link", { name: "Explore Platform", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/login/);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome Back/ }),
  ).toBeVisible();
  await page.goto("/");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.screenshot({ path: "test-results/landing-signed-in-mobile.png" });
  await page
    .getByRole("link", { name: "Explore Platform", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: /Welcome Back/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("landing typography loads locally and fits desktop and narrow screens", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLanding(page);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    const typography = await page.evaluate(() => {
      const title = getComputedStyle(document.querySelector(".intro-hero h1")!);
      const body = getComputedStyle(
        document.querySelector(".intro-approach-heading > p")!,
      );
      const actions = [
        ...document.querySelectorAll(".intro-hero-actions a"),
      ].map((el) => el.getBoundingClientRect());
      const overflow = [
        ...document.querySelectorAll(
          ".intro-site h1, .intro-site h2, .intro-site h3, .intro-site button",
        ),
      ]
        .filter((el) => el.clientWidth && el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent?.trim());
      return {
        titleFamily: title.fontFamily,
        titleWeight: title.fontWeight,
        bodyFamily: body.fontFamily,
        bodySize: parseFloat(body.fontSize),
        fontsLoaded:
          document.fonts.check('600 16px "Geist Variable"') &&
          document.fonts.check('400 16px "Inter Variable"'),
        actionsShareRow:
          Math.abs(
            actions[0].top +
              actions[0].height / 2 -
              actions[1].top -
              actions[1].height / 2,
          ) < 2,
        overflow,
      };
    });
    await page.screenshot({
      path: `test-results/typography-${viewport.width}.png`,
    });
    expect(typography.titleFamily).toContain("Geist Variable");
    expect(typography.titleWeight).toBe("600");
    expect(typography.bodyFamily).toContain("Inter Variable");
    expect(typography.bodySize).toBeGreaterThanOrEqual(14);
    expect(typography.fontsLoaded).toBe(true);
    expect(typography.actionsShareRow, `${viewport.width}px actions`).toBe(
      true,
    );
    expect(typography.overflow, `${viewport.width}px text`).toEqual([]);
  }
});

test("3D heart is nonblank and framed across desktop, tablet, and mobile", async ({
  page,
}) => {
  await openLanding(page);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
    { width: 820, height: 1180 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() =>
        page
          .locator('canvas[data-scene="cardiac-study"]')
          .evaluate(
            (canvas) =>
              (canvas as HTMLCanvasElement).width ===
              Math.round(canvas.getBoundingClientRect().width),
          ),
      )
      .toBe(true);
    await expect
      .poll(async () => (await pixels(page)).count)
      .toBeGreaterThan(1000);
    const result = await pixels(page);
    expect(result.background).toBeGreaterThan(100);
    expect(result.minX).toBeGreaterThan(0);
    expect(result.maxX).toBeLessThan(result.width - 1);
    expect(result.minY).toBeGreaterThan(10);
    expect(result.maxY).toBeLessThan(result.height - 1);
    const minimumHeartHeight =
      viewport.width >= 1100
        ? 0.78
        : viewport.width >= 901
          ? 0.68
          : viewport.width >= 761
            ? 0.6
            : 0.34;
    expect((result.maxY - result.minY) / result.height).toBeGreaterThan(
      minimumHeartHeight,
    );
    const artworkOverlaps = await page.evaluate((art) => {
      const canvas = document
        .querySelector('canvas[data-scene="cardiac-study"]')!
        .getBoundingClientRect();
      const heart = {
        left: canvas.left + art.minX,
        right: canvas.left + art.maxX,
        top: canvas.top + art.height - art.maxY,
        bottom: canvas.top + art.height - art.minY,
      };
      return [
        ...document.querySelectorAll(
          ".intro-hero-copy h1, .intro-hero-copy p, .intro-hero-actions a, .intro-study-caption, .intro-scene-toolbar, .intro-hero-index",
        ),
      ].flatMap((el) => {
        if (!el.getBoundingClientRect().height) return [];
        const range = document.createRange();
        range.selectNodeContents(el);
        const rect = el.matches("h1, p")
          ? range.getBoundingClientRect()
          : el.getBoundingClientRect();
        return rect.left < heart.right &&
          rect.right > heart.left &&
          rect.top < heart.bottom &&
          rect.bottom > heart.top
          ? [el.textContent?.trim()]
          : [];
      });
    }, result);
    expect(
      artworkOverlaps,
      `Heart overlaps content at ${viewport.width}px`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const visibleNextSection = await page
      .locator(".intro-principle-strip")
      .evaluate((el) => el.getBoundingClientRect().top < innerHeight);
    expect(visibleNextSection).toBe(true);
    const overlaps = await page
      .locator(
        ".intro-hero a, .intro-hero button, .intro-header a, .intro-header button",
      )
      .evaluateAll((elements) =>
        elements.flatMap((el) => {
          const rect = el.getBoundingClientRect();
          if (!rect.width || !rect.height) return [];
          if (rect.right > innerWidth + 1)
            return [`Outside viewport: ${el.textContent}`];
          const at = document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          );
          return at && !el.contains(at)
            ? [`Overlapping control: ${el.textContent}`]
            : [];
        }),
      );
    expect(overlaps, `${viewport.width}px`).toEqual([]);
    await page.screenshot({
      path: `test-results/landing-${viewport.width}.png`,
    });
  }
});

test("heart animation, appearance, dragging, pause and reset controls work", async ({
  page,
}) => {
  await openLanding(page);
  const initial = await pixels(page);
  await expect
    .poll(async () => (await pixels(page)).checksum)
    .not.toBe(initial.checksum);
  await page.getByRole("button", { name: "Pause heart animation" }).click();
  await expect(
    page.getByRole("button", { name: "Play heart animation" }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const before = await page
        .locator('canvas[data-scene="cardiac-study"]')
        .getAttribute("data-frames");
      await new Promise((resolve) => setTimeout(resolve, 100));
      return (
        before ===
        (await page
          .locator('canvas[data-scene="cardiac-study"]')
          .getAttribute("data-frames"))
      );
    })
    .toBe(true);
  const frozen = await pixels(page);
  await page.waitForTimeout(250);
  expect((await pixels(page)).checksum).toBe(frozen.checksum);
  await page.getByRole("button", { name: "Structure", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Structure", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(async () => (await pixels(page)).checksum)
    .not.toBe(frozen.checksum);
  await page.getByRole("button", { name: "Surface", exact: true }).click();
  const beforeDrag = await pixels(page);
  await page.mouse.move(950, 510);
  await page.mouse.down();
  await page.mouse.move(1050, 530, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await pixels(page)).checksum)
    .not.toBe(beforeDrag.checksum);
  const dragged = await pixels(page);
  await page.getByRole("button", { name: "Reset heart view" }).click();
  await expect
    .poll(async () => (await pixels(page)).checksum)
    .not.toBe(dragged.checksum);
});

test("mobile navigation, care imagery, questions, and full page render correctly", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await openLanding(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Website navigation" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Clinical preview" })
    .click();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await page
    .getByText("Does CardioAssist diagnose heart disease?", { exact: true })
    .click();
  await expect(
    page.getByText(/not clinically validated and must not be used/),
  ).toBeVisible();
  const images = page.locator(".intro-why-image img");
  await expect(images).toHaveCount(1);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(1000);
  }
  await expect(page.locator('img[src*="portal-preview"]')).toHaveCount(0);
  await expect(page.locator(".intro-heart-fallback")).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(async () => (await pixels(page)).count)
    .toBeGreaterThan(1000);
  await page.screenshot({
    path: "test-results/landing-full-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect
    .poll(async () => (await pixels(page)).count)
    .toBeGreaterThan(1000);
  await page.screenshot({
    path: "test-results/landing-full-desktop.png",
    fullPage: true,
  });
});

test("reduced motion starts paused and a bitmap fallback works without WebGL", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLanding(page);
  await expect(
    page.getByRole("button", { name: "Play heart animation" }),
  ).toBeVisible();
  const frames = await page
    .locator('canvas[data-scene="cardiac-study"]')
    .getAttribute("data-frames");
  await page.waitForTimeout(250);
  expect(
    await page
      .locator('canvas[data-scene="cardiac-study"]')
      .getAttribute("data-frames"),
  ).toBe(frames);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  const fallback = await context.newPage();
  await fallback.goto("http://127.0.0.1:5173/");
  await expect(fallback.locator(".intro-heart-scene")).toHaveClass(
    /is-fallback/,
  );
  const image = fallback.getByAltText("Sculptural cardiac study");
  await expect(image).toBeVisible();
  expect(
    await image.evaluate((el) => (el as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(100);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await fallback.setViewportSize(viewport);
    const framing = await image.evaluate((element) => {
      const img = element as HTMLImageElement;
      const rect = img.getBoundingClientRect();
      const scale = Math.min(
        rect.width / img.naturalWidth,
        rect.height / img.naturalHeight,
      );
      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;
      const artwork = {
        left: rect.left + (rect.width - width) / 2,
        right: rect.right - (rect.width - width) / 2,
        top: rect.top + (rect.height - height) / 2,
        bottom: rect.bottom - (rect.height - height) / 2,
      };
      const copy = document.querySelector(".intro-hero-copy")!;
      const range = document.createRange();
      range.selectNodeContents(copy);
      const copyBottom = range.getBoundingClientRect().bottom;
      return {
        clearOfCopy: artwork.top > copyBottom,
        framed:
          artwork.left > 0 &&
          artwork.right < innerWidth &&
          artwork.bottom < innerHeight,
      };
    });
    expect(framing, `${viewport.width}px fallback`).toEqual({
      clearOfCopy: true,
      framed: true,
    });
    await fallback.screenshot({
      path: `test-results/landing-fallback-${viewport.width}.png`,
    });
  }
  await expect(fallback.locator(".intro-scene-toolbar")).toBeHidden();
  await fallback.locator("#workspace").scrollIntoViewIfNeeded();
  await expect(fallback.getByRole("tab", { name: "Overview" })).toBeVisible();
  await fallback
    .getByRole("link", { name: "Explore Platform", exact: true })
    .first()
    .click();
  await expect(fallback).toHaveURL(/login/);
  await context.close();
});

test("clinical preview is responsive, clearly illustrative, and keyboard accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openLanding(page);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.locator("#workspace").scrollIntoViewIfNeeded();
    const preview = page.getByRole("region", {
      name: "Clinical intelligence preview",
    });
    await expect(preview).toBeVisible();
    await expect(
      preview.getByText("Assessment preview", { exact: true }),
    ).toBeVisible();
    await expect(
      preview.getByRole("img", { name: /Assessment score 42/ }),
    ).toBeVisible();
    await expect(preview.locator(".recharts-sector")).toHaveCount(2);
    const bounds = await preview.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    const overview = preview.getByRole("tab", { name: "Overview" });
    const factors = preview.getByRole("tab", { name: "Factors" });
    await overview.focus();
    await overview.press("ArrowRight");
    await expect(factors).toBeFocused();
    await expect(factors).toHaveAttribute("aria-selected", "true");
    await expect(
      preview.getByText("not clinically validated.", { exact: false }),
    ).toBeVisible();
    await expect(preview.locator(".clinical-factor")).toHaveCount(4);
    await factors.press("Home");
    await expect(overview).toBeFocused();
    await expect(overview).toHaveAttribute("aria-selected", "true");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clinical-preview-${viewport.width}.png`,
    });
  }
  await page.getByRole("link", { name: "Open the doctor workspace" }).click();
  await expect(page).toHaveURL(/login/);
});
