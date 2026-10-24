import { expect, test } from "@playwright/test";

test.use({
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  reducedMotion: "reduce",
});

test("light mode stays unchanged and all dark pages share the original dashboard palette", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const mode of ["light", "dark"] as const) {
    for (const route of ["/", "/login"]) {
      await page.goto(route);
      const toggle = page.getByRole("button", { name: "Toggle color theme" });
      if (
        (await toggle.getAttribute("aria-pressed")) !== String(mode === "dark")
      )
        await toggle.click();
      await expect(toggle).toHaveAttribute(
        "aria-pressed",
        String(mode === "dark"),
      );
      const scene = page.locator(
        route === "/" ? ".intro-heart-scene" : ".coronary-scene",
      );
      await expect(scene).toHaveClass(/is-ready/);
      await expect(
        page.locator(route === "/" ? ".intro-hero" : ".login-story"),
      ).toHaveCSS(
        "background-color",
        mode === "light" ? "rgb(238, 245, 255)" : "rgb(16, 26, 44)",
      );
      await expect(toggle).toHaveCSS(
        "color",
        mode === "light" ? "rgb(36, 99, 235)" : "rgb(87, 140, 255)",
      );
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({
          width,
          height: width === 1440 ? 1000 : 844,
        });
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const controls = await page
          .locator(
            route === "/"
              ? ".intro-header a, .intro-header button"
              : ".login-header a, .login-header button",
          )
          .evaluateAll((elements) =>
            elements.flatMap((element) => {
              const rect = element.getBoundingClientRect();
              if (!rect.width || !rect.height) return [];
              const hit = document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              );
              return rect.right > innerWidth + 1 ||
                !hit ||
                !element.contains(hit)
                ? [element.getAttribute("aria-label") || element.textContent]
                : [];
            }),
          );
        expect(controls, `${route} ${mode} ${width}px`).toEqual([]);
        await page.screenshot({
          path: `test-results/theme-${route === "/" ? "landing" : "login"}-${mode}-${width}.png`,
          fullPage: route === "/login",
        });
      }
    }
  }
  expect(errors).toEqual([]);
});

test("theme persists between landing, login and the doctor workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await page
    .getByRole("link", { name: "Explore Platform", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/login/);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator(".login-page")).toHaveCSS(
    "background-color",
    "rgb(10, 17, 29)",
  );
  await expect(page.locator(".login-submit")).toHaveCSS(
    "background-color",
    "rgb(87, 140, 255)",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(10, 17, 29)",
  );
  await expect(page.locator(".sidebar")).toHaveCSS(
    "background-color",
    "rgb(16, 26, 44)",
  );
  await expect(page.locator(".nav-link.active")).toHaveCSS(
    "color",
    "rgb(87, 140, 255)",
  );
  await page.screenshot({ path: "test-results/theme-dashboard-dark.png" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(246, 249, 253)",
  );
  await expect(page.locator(".sidebar")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.goto("/");
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator(".intro-hero .public-button-solid")).toHaveCSS(
    "background-color",
    "rgb(36, 99, 235)",
  );
});
