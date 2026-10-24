import { expect, test, type Page } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

async function vesselPixels(page: Page) {
  return page
    .locator('canvas[data-scene="coronary-study"]')
    .evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const gl = canvas.getContext("webgl2")!;
      const width = canvas.width,
        height = canvas.height;
      const buffer = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
      let count = 0,
        background = 0,
        checksum = 0,
        minX = width,
        maxX = 0,
        minY = height,
        maxY = 0;
      for (let i = 0; i < buffer.length; i += 16) {
        checksum +=
          buffer[i] * 3 + buffer[i + 1] * 5 + buffer[i + 2] * 7 + buffer[i + 3];
        if (buffer[i + 3] > 5 && buffer[i + 3] <= 70) background++;
        if (buffer[i + 3] <= 70) continue;
        count++;
        const pixel = i / 4,
          x = pixel % width,
          y = Math.floor(pixel / width);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      return {
        width,
        height,
        count,
        background,
        checksum,
        minX,
        maxX,
        minY,
        maxY,
      };
    });
}

test("login layout, 3D vessel, typography, and controls fit all screen sizes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.evaluate(() => document.fonts.ready);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(
      page.getByRole("heading", { name: "Welcome back, Doctor." }),
    ).toBeVisible();
    const layout = await page.evaluate(() => {
      const overflow = [
        ...document.querySelectorAll(
          ".login-page h1, .login-page h2, .login-page button, .login-page label",
        ),
      ]
        .filter((el) => el.clientWidth && el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent?.trim());
      const submit = document
        .querySelector(".login-submit")!
        .getBoundingClientRect();
      return {
        overflow,
        horizontallyFramed: document.documentElement.scrollWidth <= innerWidth,
        submitVisible: submit.top > 0 && submit.bottom <= innerHeight,
        font: getComputedStyle(
          document.querySelector(".login-introduction h1")!,
        ).fontFamily,
      };
    });
    expect(layout.overflow, `${viewport.width}px text`).toEqual([]);
    expect(layout.horizontallyFramed).toBe(true);
    expect(layout.submitVisible, `${viewport.width}px primary action`).toBe(
      true,
    );
    expect(layout.font).toContain("Geist Variable");
    await page.locator(".login-vessel-visual").scrollIntoViewIfNeeded();
    await expect(
      page.locator(".login-vessel-visual .coronary-scene"),
    ).toHaveClass(/is-ready/);
    await expect
      .poll(() =>
        page
          .locator('canvas[data-scene="coronary-study"]')
          .evaluate(
            (canvas) =>
              (canvas as HTMLCanvasElement).width ===
              Math.round(canvas.getBoundingClientRect().width),
          ),
      )
      .toBe(true);
    await expect
      .poll(async () => (await vesselPixels(page)).count)
      .toBeGreaterThan(1000);
    const artwork = await vesselPixels(page);
    expect(artwork.background).toBeGreaterThan(100);
    await expect(
      page.locator('canvas[data-scene="cardiac-study"]'),
    ).toHaveCount(0);
    expect(artwork.minX).toBeGreaterThan(0);
    expect(artwork.maxX).toBeLessThan(artwork.width - 1);
    expect(artwork.minY).toBeGreaterThan(10);
    expect(artwork.maxY).toBeLessThan(artwork.height - 1);
    expect((artwork.maxY - artwork.minY) / artwork.height).toBeGreaterThan(0.6);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/login-${viewport.width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("login vessel moves, pauses, rotates on drag, resets, and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.locator(".login-vessel-visual .coronary-scene"),
  ).toHaveClass(/is-ready/);
  const initial = await vesselPixels(page);
  await expect
    .poll(async () => (await vesselPixels(page)).checksum)
    .not.toBe(initial.checksum);
  await page.getByRole("button", { name: "Pause vessel animation" }).click();
  const canvas = page.locator('canvas[data-scene="coronary-study"]');
  await expect
    .poll(async () => {
      const frames = await canvas.getAttribute("data-frames");
      await page.waitForTimeout(100);
      return frames === (await canvas.getAttribute("data-frames"));
    })
    .toBe(true);
  const frozen = await vesselPixels(page);
  await page.waitForTimeout(200);
  expect((await vesselPixels(page)).checksum).toBe(frozen.checksum);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.45, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width * 0.65,
    box!.y + box!.height * 0.5,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await vesselPixels(page)).checksum)
    .not.toBe(frozen.checksum);
  const dragged = await vesselPixels(page);
  await page.getByRole("button", { name: "Reset vessel view" }).click();
  await expect
    .poll(async () => (await vesselPixels(page)).checksum)
    .not.toBe(dragged.checksum);
  await page.getByRole("button", { name: "Play vessel animation" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Play vessel animation" }),
  ).toBeVisible();
});

test("login remains usable with a static vessel when WebGL is unavailable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/login");
  await page.locator(".login-vessel-visual").scrollIntoViewIfNeeded();
  await expect(
    page.locator(".login-vessel-visual .coronary-scene"),
  ).toHaveClass(/is-fallback/);
  await expect
    .poll(() =>
      page
        .getByAltText("Illustrative translucent coronary-vessel study")
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(100);
  await expect(page.locator(".login-vessel-controls")).toBeHidden();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
});

test("password visibility, retained credentials, credential errors, and keyboard sign-in work", async ({
  page,
}) => {
  await page.goto("/login");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(
    page.getByRole("button", { name: "Hide password" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(
    page.getByText("Demo account details", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Enter demo workspace" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Email address")).toHaveValue(
    "doctor@cardioassist.demo",
  );
  await expect(password).toHaveValue("demo123");
  await password.fill("wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await password.fill("demo123");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await password.press("Enter");
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/login");
  await expect(page).toHaveURL(/dashboard/);
});

test("storage errors recover cleanly and sign-in still opens the workspace", async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("test-block-auth", "true");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (
        this === localStorage &&
        key === "cardioassist_auth" &&
        sessionStorage.getItem("test-block-auth") === "true"
      ) {
        throw new DOMException("Storage blocked", "SecurityError");
      }
      return original.call(this, key, value);
    };
  });
  await page.goto("/login");
  const demo = page.getByRole("button", {
    name: "Sign in",
    exact: true,
  });
  await demo.click();
  await expect(page.getByRole("alert")).toContainText("browser storage");
  await expect(demo).toBeEnabled();
  await expect(page.getByLabel("Email address")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.evaluate(() => sessionStorage.removeItem("test-block-auth"));
  await demo.click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: /Welcome Back/ }),
  ).toBeVisible();
});

test("return to website and empty field validation work on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email address").fill("");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect(
    await page
      .getByLabel("Email address")
      .evaluate((el) => (el as HTMLInputElement).validity.valueMissing),
  ).toBe(true);
  await expect(page).toHaveURL(/login/);
  await page
    .getByRole("link", { name: "Back to website", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { name: "CardioAssist AI", exact: true }),
  ).toBeVisible();
});

test("returning to the website cancels an unfinished sign-in", async ({
  page,
}) => {
  await page.goto("/login");
  const start = new Date("2026-10-24T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("link", { name: "Back to website", exact: true })
    .click();
  await page.clock.runFor(450);
  await expect(page).toHaveURL("/");
  expect(
    await page.evaluate(() => localStorage.getItem("cardioassist_auth")),
  ).toBeNull();
});
