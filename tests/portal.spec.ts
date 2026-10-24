import { test, expect, type Page } from "@playwright/test";
const savedData = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("cardioassist_portal_v2") || "{}"),
  );
async function login(page: Page) {
  await page.goto("/login");
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: /Welcome Back/ }),
  ).toBeVisible();
}
test("assessments page has no new assessment action and preserves existing records", async ({
  page,
}) => {
  await login(page);
  const before = (await savedData(page)).assessments;
  await page.goto("/assessments");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(
      page.getByRole("heading", { name: "Assessments", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "New assessment", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await page.screenshot({
      path: `test-results/assessments-no-create-${width}.png`,
      fullPage: true,
    });
  }
  expect((await savedData(page)).assessments).toEqual(before);
});

test("protected routes, invalid credentials, demo login and logout", async ({
  page,
}) => {
  await page.goto("/patients");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await page.getByLabel("Password", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Welcome Back/ }),
  ).toBeVisible();
  await page.getByLabel("Doctor profile").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
});
test("review updates derived counts, history, persistence, and printable report", async ({
  page,
}) => {
  await login(page);
  const pendingBefore = Number(
    await page
      .locator(".stat-card")
      .filter({ hasText: "Pending Reviews" })
      .locator("strong")
      .innerText(),
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Patients", exact: true })
    .click();
  await page.getByLabel("Search patients or ID...").fill("Ahmed Ali");
  await page.getByRole("link", { name: "Open Ahmed Ali", exact: true }).click();
  await page.getByRole("link", { name: "View result" }).click();
  await expect(
    page.getByRole("heading", { name: "Explainable AI" }),
  ).toBeVisible();
  await page
    .getByLabel("Doctor review notes")
    .fill("Review completed. Context recorded for team presentation.");
  await page.getByLabel("Follow-up required", { exact: true }).check();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByRole("status")).toContainText("marked reviewed");
  expect(
    (await savedData(page)).assessments.find(
      (a: { id: string }) => a.id === "a-3",
    ).status,
  ).toBe("Reviewed");
  await page.reload();
  await expect(page.getByLabel("Doctor review notes")).toHaveValue(/Review/);
  await page.getByRole("link", { name: "View report", exact: true }).click();
  await expect(page.locator(".print-report")).toContainText("Review completed");
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = "true";
    };
  });
  await page.getByRole("button", { name: "Print / Save as PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await page.screenshot({
    path: "test-results/report-print.png",
    fullPage: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.goto("/patients/p-1/history");
  await expect(
    page.getByRole("heading", { name: "Doctor Review Events" }),
  ).toBeVisible();
  await expect(page.locator(".timeline")).toContainText("Assessment reviewed");
  await page.goto("/dashboard");
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Pending Reviews" })
      .locator("strong"),
  ).toHaveText(String(pendingBefore - 1));
});
test("new assessment validates, saves draft, updates history and survives refresh", async ({
  page,
}) => {
  await login(page);
  await page.goto("/patients/p-1/assessments/new");
  await page
    .getByLabel("Systolic blood pressure (mmHg)", { exact: true })
    .fill("60");
  await page.getByRole("button", { name: "Review inputs" }).click();
  await expect(page.getByText("Enter 80-250 mmHg.")).toBeVisible();
  await page
    .getByLabel("Systolic blood pressure (mmHg)", { exact: true })
    .fill("148");
  await page.getByRole("button", { name: "Save draft" }).click();
  await page.reload();
  await expect(
    page.getByLabel("Systolic blood pressure (mmHg)", { exact: true }),
  ).toHaveValue("148");
  await page.getByRole("button", { name: "Review inputs" }).click();
  await page
    .getByRole("button", { name: "Create assessment", exact: true })
    .click();
  await expect(page).toHaveURL(/assessments\/a-/);
  await expect(
    page.getByRole("heading", { name: "Assessment Result", exact: true }),
  ).toBeVisible();
  const data = await savedData(page);
  expect(data.assessments).toHaveLength(55);
  const record = data.assessments[0];
  expect(record.inputs.systolicBP).toBe(148);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Assessment Result", exact: true }),
  ).toBeVisible();
  expect((await savedData(page)).assessments).toHaveLength(55);
  await page.goto("/patients/p-1/history");
  await expect(page.locator(".review-list")).toContainText(
    record.id.toUpperCase(),
  );
});
test("accepting a connection links the patient and mobile submission creates a reviewable record", async ({
  page,
}) => {
  await login(page);
  await page.goto("/requests");
  const card = page
    .locator(".request-card")
    .filter({ hasText: "Heba Mansour" });
  await card.getByRole("button", { name: "Accept", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("connected");
  expect((await savedData(page)).patients).toHaveLength(19);
  await page.goto("/patients");
  await expect(
    page.getByRole("button", { name: "Add demo patient" }),
  ).toHaveCount(0);
  await page.getByLabel("Search patients or ID...").fill("Heba");
  await expect(
    page.getByRole("link", { name: "Open Heba Mansour", exact: true }),
  ).toBeVisible();
  await page.goto("/notifications");
  await page
    .getByRole("button", { name: "Simulate mobile submission" })
    .click();
  await page.getByLabel("Connected patient").selectOption("p-request-1");
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByRole("status")).toContainText("submitted");
  const data = await savedData(page);
  const record = data.assessments.find(
    (a: { patientId: string }) => a.patientId === "p-request-1",
  );
  expect(record.source).toBe("Mobile");
  await page.goto(`/assessments/${record.id}`);
  await page
    .getByLabel("Doctor review notes")
    .fill("Mobile submission reviewed.");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByRole("status")).toContainText("reviewed");
});
test("simulator recalculates, resets and never modifies the baseline", async ({
  page,
}) => {
  await login(page);
  await page.goto("/assessments/a-3/simulator");
  await expect(
    page.getByRole("heading", { name: "What-if Scenario Simulator" }),
  ).toBeVisible();
  const baseline = await page.evaluate(() =>
    localStorage.getItem("cardioassist_portal_v2"),
  );
  const score = await page.locator(".score-display").last().innerText();
  await page.getByLabel("Systolic blood pressure", { exact: true }).fill("180");
  await expect(page.locator(".score-display").last()).not.toHaveText(score);
  await page.getByRole("button", { name: "Reset scenario" }).click();
  await expect(page.locator(".score-display").last()).toHaveText(score);
  expect(
    await page.evaluate(() => localStorage.getItem("cardioassist_portal_v2")),
  ).toBe(baseline);
});
test("patient editing, failed save recovery, and reset restore deterministic seed", async ({
  page,
}) => {
  await login(page);
  await page.goto("/patients/p-1");
  await page.getByRole("button", { name: "Edit patient" }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Ahmed Ali Demo");
  await page.getByRole("button", { name: "Save patient", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ahmed Ali Demo", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ahmed Ali Demo", exact: true }),
  ).toBeVisible();
  expect(
    (await savedData(page)).patients.find((p: { id: string }) => p.id === "p-1")
      .updatedAt,
  ).toBeTruthy();
  await page.goto("/settings");
  await page.getByLabel("Fail next mock request", { exact: true }).check();
  await page.goto("/patients/p-1");
  await page.getByRole("button", { name: "Edit patient" }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Ahmed Ali Updated");
  await page.getByRole("button", { name: "Save patient", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("request failed");
  expect((await savedData(page)).patients).toHaveLength(18);
  expect(
    (await savedData(page)).patients.find((p: { id: string }) => p.id === "p-1")
      .name,
  ).toBe("Ahmed Ali Demo");
  await page.getByRole("button", { name: "Save patient", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("updated");
  expect((await savedData(page)).patients).toHaveLength(18);
  await expect(
    page.getByRole("heading", { name: "Ahmed Ali Updated", exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore initial records", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("restored");
  const data = await savedData(page);
  expect(data.patients).toHaveLength(18);
  expect(data.assessments).toHaveLength(54);
  expect(data.patients[0].name).toBe("Ahmed Ali");
});
test("dashboard stat filters and desktop/mobile pages render without page overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  expect(await page.locator(".recharts-surface").count()).toBeGreaterThan(2);
  await page
    .locator(".stat-card")
    .filter({ hasText: "High Risk Assessments" })
    .click();
  await expect(page).toHaveURL(/assessments/);
  await expect(page.getByLabel("Filter risk")).toHaveValue("High");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/dashboard",
    "/patients",
    "/patients/p-1",
    "/patients/p-1/assessments/new",
    "/assessments/a-3",
    "/patients/p-1/history",
    "/assessments/a-3/simulator",
    "/requests",
    "/notifications",
    "/settings",
    "/reports/a-3",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation")).toBeHidden();
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("unavailable simulator, request rejection, notification actions, and theme persistence", async ({
  page,
}) => {
  await login(page);
  await page.goto("/settings");
  await page
    .getByLabel("Scenario simulator unavailable", { exact: true })
    .check();
  await page.goto("/patients/p-1/assessments/new");
  await page.getByRole("button", { name: "Review inputs" }).click();
  await page
    .getByRole("button", { name: "Create assessment", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "simulator is unavailable",
  );
  expect((await savedData(page)).assessments).toHaveLength(54);
  await page.getByRole("button", { name: "Back to form" }).click();
  await page.goto("/assessments/a-3/simulator");
  await expect(
    page.getByLabel("Systolic blood pressure", { exact: true }),
  ).toBeDisabled();
  await page.goto("/settings");
  await page
    .getByLabel("Scenario simulator unavailable", { exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.goto("/requests");
  await page.getByRole("button", { name: "Simulate patient request" }).click();
  await expect(page.getByRole("status")).toContainText("received");
  await page
    .locator(".request-card")
    .filter({ hasText: "Patient 4" })
    .getByRole("button", { name: "Reject", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reject request", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("rejected");
  expect((await savedData(page)).patients).toHaveLength(18);
  await page.goto("/notifications");
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
  expect(
    (await savedData(page)).notifications.every(
      (n: { read: boolean }) => n.read,
    ),
  ).toBe(true);
  await page.goto("/dashboard");
  for (const width of [320, 820]) {
    await page.setViewportSize({ width, height: 900 });
    if (width === 820) await expect(page.getByRole("navigation")).toBeVisible();
    else await expect(page.getByRole("navigation")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: /Welcome Back/ }),
    ).toBeVisible();
    await expect(page.locator(".recharts-surface")).toHaveCount(3);
    await expect
      .poll(() =>
        page.locator(".recharts-surface").evaluateAll((elements) =>
          elements.every((element) => {
            const container = element.closest(".recharts-responsive-container");
            const width = element.getBoundingClientRect().width;
            return (
              container &&
              width > 0 &&
              width <= container.getBoundingClientRect().width + 1
            );
          }),
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.screenshot({
    path: "test-results/dashboard-tablet-light.png",
    fullPage: true,
  });
});
test("command labels fit and visible action buttons do not overlap", async ({
  page,
}) => {
  await login(page);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/patients",
      "/patients/p-1",
      "/patients/p-1/assessments/new",
      "/patients/p-1/review",
      "/assessments/a-3",
      "/assessments/a-3/simulator",
      "/requests",
      "/notifications",
      "/reports",
      "/reports/a-3",
      "/settings",
    ]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      const issues = await page
        .locator('main [data-slot="button"]')
        .evaluateAll((elements) =>
          elements.flatMap((el) => {
            const button = el as HTMLElement;
            const rect = button.getBoundingClientRect();
            if (
              !rect.width ||
              !rect.height ||
              getComputedStyle(button).visibility === "hidden"
            )
              return [];
            if (button.scrollWidth > button.clientWidth + 2)
              return [`Overflow: ${button.textContent}`];
            if (
              button.hasAttribute("disabled") ||
              rect.top < 0 ||
              rect.bottom > innerHeight ||
              rect.right > innerWidth
            )
              return [];
            const target = document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            );
            return target && !button.contains(target)
              ? [`Overlap: ${button.textContent}`]
              : [];
          }),
        );
      expect(issues, `${width}px ${path}`).toEqual([]);
      if (path === "/notifications")
        await page.screenshot({
          path: `test-results/notifications-${width}.png`,
        });
      if (path === "/assessments/a-3")
        await page.screenshot({ path: `test-results/assessment-${width}.png` });
    }
  }
});
