import { expect, test } from "@playwright/test";

test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

for (const scene of [
  { page: "landing", path: "/", selector: ".intro-heart-scene" },
  { page: "login", path: "/login", selector: ".coronary-scene" },
]) {
  test(`${scene.page} cold startup remains usable on a slower CPU`, async ({
    page,
  }, testInfo) => {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const tasks: { start: number; duration: number }[] = [];
      const observer = new PerformanceObserver((list) => {
        tasks.push(
          ...list.getEntries().map((entry) => ({
            start: entry.startTime,
            duration: entry.duration,
          })),
        );
      });
      observer.observe({ type: "longtask", buffered: true });
      Object.assign(window, { sceneStartupTasks: tasks });
    });
    await page.goto(scene.path);
    await expect(page.locator(scene.selector)).toHaveClass(/is-ready/);
    const metrics = await page.evaluate(() => ({
      ready: performance.now(),
      paint:
        performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
        0,
      tasks: (
        window as unknown as {
          sceneStartupTasks: { start: number; duration: number }[];
        }
      ).sceneStartupTasks,
      lighting: document
        .querySelector("canvas[data-lighting]")
        ?.getAttribute("data-lighting"),
    }));
    console.log(`${scene.page} startup: ${JSON.stringify(metrics)}`);
    expect(metrics.paint).toBeGreaterThan(0);
    const blockingAfterPaint = metrics.tasks.filter(
      (task) => task.start > metrics.paint,
    );
    expect(
      Math.max(0, ...blockingAfterPaint.map((task) => task.duration)),
    ).toBeLessThan(900);
    expect(metrics.lighting).toBe("baked");
    await testInfo.attach(`${scene.page}-startup`, {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    await expect(page.locator(scene.selector).locator("canvas")).toHaveCSS(
      "opacity",
      "1",
    );
    if (scene.page === "login")
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeEnabled();
    else
      await expect(
        page
          .getByRole("link", { name: "Explore Platform", exact: true })
          .first(),
      ).toBeEnabled();
  });
}
