import { expect, test } from "@playwright/test";
import { createSeed } from "../src/data/mockData";

test.use({
  reducedMotion: "reduce",
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
});

test("clean presentation preserves stored records and the existing sign-in", async ({
  page,
}) => {
  const seed = createSeed();
  seed.assessments[0].doctorNotes = "Saved review notes must remain unchanged.";
  await page.addInitScript((data) => {
    if (!localStorage.getItem("cardioassist_portal_v2"))
      localStorage.setItem("cardioassist_portal_v2", JSON.stringify(data));
  }, seed);
  await page.goto("/login");
  await expect(page.getByLabel("Email address")).toHaveValue(
    "doctor@cardioassist.demo",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "demo123",
  );
  await expect(
    page.getByRole("button", { name: "Enter demo workspace" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Demo account details", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    /\b(?:academic|demo|prototype|synthetic|fictional)\b/i,
  );
  await page.screenshot({
    path: "test-results/clean-login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.screenshot({
    path: "test-results/clean-login-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of [
    "/dashboard",
    "/patients",
    "/patients/p-1",
    "/patients/p-1/history",
    "/assessments/a-1",
    "/reports/a-1",
    "/requests",
    "/notifications",
    "/settings",
    "/",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    if (route === "/") {
      await page.locator("#workspace").scrollIntoViewIfNeeded();
      await expect(page.locator(".clinical-preview")).toBeVisible();
    }
    await expect(page.locator("body"), route).not.toContainText(
      /\b(?:academic|demo|prototype|synthetic|fictional)\b/i,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
    if (route === "/dashboard")
      await page.screenshot({
        path: "test-results/clean-dashboard.png",
        fullPage: true,
      });
  }
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cardioassist_portal_v2") || "null"),
  );
  expect(JSON.stringify(saved)).toBe(JSON.stringify(seed));
  expect(saved.patients).toHaveLength(18);
  expect(saved.assessments).toHaveLength(54);
});
