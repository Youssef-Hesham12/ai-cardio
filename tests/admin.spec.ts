import { expect, test, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Super Admin", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(
    page.getByRole("heading", { name: "System overview", exact: true }),
  ).toBeVisible();
}
async function signOut(page: Page, admin = true) {
  await page
    .getByLabel(admin ? "Admin profile" : "Doctor profile", { exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
}
async function doctorLogin(
  page: Page,
  email = "doctor@cardioassist.demo",
  password = "demo123",
) {
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
async function createDoctor(page: Page, email = "new.doctor@example.test") {
  await page.goto("/admin/doctors");
  await page
    .getByRole("button", { name: "Create doctor", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Create doctor",
    exact: true,
  });
  await dialog
    .getByLabel("Full name", { exact: true })
    .fill("Dr. Lina Mansour");
  await dialog.getByLabel("Sign-in email", { exact: true }).fill(email);
  await dialog.getByLabel("Password", { exact: true }).fill("StrongPass@123");
  await dialog
    .getByRole("button", { name: "Create doctor", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Doctor account created.",
  );
}
const accountData = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("cardioassist_admin_v1") || "{}"),
  );

test("admin and doctor routes are separate, persist, and return to the right workspace", async ({
  page,
}) => {
  await page.goto("/admin/doctors");
  await expect(page).toHaveURL(/login/);
  await adminLogin(page);
  await expect(
    page.getByRole("navigation", { name: "Administration navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Patients", exact: true }),
  ).toHaveCount(0);
  await page.goto("/patients");
  await expect(page).toHaveURL(/\/admin\/?$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "System overview", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore Platform", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await signOut(page);
  await doctorLogin(page);
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
});

test("created doctors can sign in to an isolated empty workspace without changing existing records", async ({
  page,
}) => {
  await page.goto("/login");
  await doctorLogin(page);
  await page.goto("/patients/p-1");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cardioassist_portal_v2") || "null"),
  );
  await signOut(page, false);
  await adminLogin(page);
  await createDoctor(page);
  const data = await accountData(page);
  const doctor = data.doctors.find(
    (item: { email: string }) => item.email === "new.doctor@example.test",
  );
  expect(doctor).toBeTruthy();
  expect(JSON.stringify(data)).not.toContain("StrongPass@123");
  expect(doctor.passwordHash).toHaveLength(64);
  await page.reload();
  await expect(page.locator("tbody")).toContainText("new.doctor@example.test");
  await signOut(page);
  await doctorLogin(page, "new.doctor@example.test", "StrongPass@123");
  await expect(
    page.getByRole("heading", { name: /Welcome Back, Dr. Lina Mansour/ }),
  ).toBeVisible();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Total Patients" })
      .locator("strong"),
  ).toHaveText("0");
  await page.goto("/patients/p-1");
  await expect(
    page.getByRole("heading", { name: "Patient not found", exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.getByLabel("Full name", { exact: true }).fill("Dr. Lina Updated");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("profile saved");
  await page.reload();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Dr. Lina Updated",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cardioassist_portal_v2") || "null"),
    ),
  ).toEqual(before);
  await signOut(page, false);
  await doctorLogin(page);
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Total Patients" })
      .locator("strong"),
  ).toHaveText("18");
});

test("doctor forms validate duplicates and failed persistence without creating partial accounts", async ({
  page,
}) => {
  await adminLogin(page);
  await page.goto("/admin/doctors?create=true");
  const dialog = page.getByRole("dialog", {
    name: "Create doctor",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Create doctor", exact: true })
    .click();
  await expect(
    dialog.getByText("Enter a full name.", { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("Full name").fill("Dr. Duplicate");
  await dialog.getByLabel("Sign-in email").fill("DOCTOR@CARDIOASSIST.DEMO");
  await dialog.getByLabel("Password", { exact: true }).fill("StrongPass@123");
  await dialog
    .getByRole("button", { name: "Create doctor", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("already exists");
  await dialog.getByLabel("Sign-in email").fill("safe.doctor@example.test");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cardioassist_admin_v1")
        throw new Error("Storage is unavailable.");
      return original.call(this, key, value);
    };
  });
  await dialog
    .getByRole("button", { name: "Create doctor", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Storage is unavailable",
  );
  expect((await accountData(page)).doctors).toHaveLength(4);
  await page.reload();
  await dialog.getByLabel("Full name").fill("Dr. Safe Save");
  await dialog.getByLabel("Sign-in email").fill("safe.doctor@example.test");
  await dialog.getByLabel("Password", { exact: true }).fill("StrongPass@123");
  await dialog
    .getByRole("button", { name: "Create doctor", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect((await accountData(page)).doctors).toHaveLength(5);
});

test("suspension, restoration, password reset, and audit events are functional", async ({
  page,
}) => {
  await adminLogin(page);
  await createDoctor(page);
  await page
    .getByRole("button", { name: "Suspend Dr. Lina Mansour", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Suspend access", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("access updated");
  await signOut(page);
  await page.getByLabel("Email address").fill("new.doctor@example.test");
  await page.getByLabel("Password", { exact: true }).fill("StrongPass@123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("suspended");
  await adminLogin(page);
  await page.goto("/admin/doctors");
  await page
    .getByRole("button", {
      name: "Restore access for Dr. Lina Mansour",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore access", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Reset password for Dr. Lina Mansour",
      exact: true,
    })
    .click();
  await page
    .getByLabel("New password", { exact: true })
    .fill("ChangedPass@456");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/admin/activity");
  await expect(page.locator("tbody")).toContainText("Doctor password reset");
  await expect(page.locator("tbody")).toContainText("Doctor access restored");
  await expect(page.locator("tbody")).not.toContainText("ChangedPass@456");
  await signOut(page);
  await page.getByLabel("Email address").fill("new.doctor@example.test");
  await page.getByLabel("Password", { exact: true }).fill("StrongPass@123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await doctorLogin(page, "new.doctor@example.test", "ChangedPass@456");
});

test("system access policies persist and remain independent of administrator access", async ({
  page,
}) => {
  await adminLogin(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Organization name").fill("CardioAssist Care Network");
  await page
    .getByRole("switch", { name: "Doctor sign-in", exact: true })
    .uncheck();
  await page
    .getByRole("switch", {
      name: "New patient connection requests",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Disable doctor sign-in", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("settings saved");
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Doctor sign-in", exact: true }),
  ).not.toBeChecked();
  await signOut(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily disabled");
  await adminLogin(page);
  await page.goto("/admin/settings");
  await page
    .getByRole("switch", { name: "Doctor sign-in", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("settings saved");
  await signOut(page);
  await doctorLogin(page);
  await page.goto("/requests");
  await expect(
    page.getByRole("button", { name: "Simulate patient request", exact: true }),
  ).toBeDisabled();
});

test("doctor edits roll back on failed saves and preserve all existing clinical records", async ({
  page,
}) => {
  await page.goto("/login");
  await doctorLogin(page);
  await page.goto("/messages?patient=p-1");
  await expect(
    page.getByRole("heading", { name: "Ahmed Ali", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("cardioassist_portal_v2")),
    )
    .not.toBeNull();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cardioassist_portal_v2")!),
  );
  await signOut(page, false);
  await adminLogin(page);
  await page.goto("/admin/doctors");
  const fillEdit = async () => {
    await page
      .getByRole("button", { name: "Edit Dr. Emily Chen", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Edit doctor",
      exact: true,
    });
    await dialog
      .getByLabel("Full name", { exact: true })
      .fill("Dr. Emily Updated");
    await dialog
      .getByLabel("Sign-in email", { exact: true })
      .fill("emily.updated@example.test");
    await dialog
      .getByLabel("Organization", { exact: true })
      .fill("North Clinic");
    return dialog;
  };
  let dialog = await fillEdit();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cardioassist_admin_v1")
        throw new Error("Storage is unavailable.");
      return original.call(this, key, value);
    };
  });
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Storage is unavailable",
  );
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cardioassist_portal_v2")!),
    ),
  ).toEqual(before);
  expect(
    (await accountData(page)).doctors.find(
      (account: { id: string }) => account.id === "doctor-emily",
    ).email,
  ).toBe("doctor@cardioassist.demo");
  await page.reload();
  dialog = await fillEdit();
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cardioassist_portal_v2")!),
  );
  expect(after.patients).toEqual(before.patients);
  expect(after.assessments).toEqual(before.assessments);
  expect(after.messages).toEqual(before.messages);
  expect(after.doctor.name).toBe("Dr. Emily Updated");
  await page
    .getByRole("textbox", { name: "Search name, email, or organization..." })
    .fill("emily.updated");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await signOut(page);
  await doctorLogin(page, "emily.updated@example.test", "demo123");
  await expect(
    page.getByRole("heading", { name: /Welcome Back, Dr. Emily Updated/ }),
  ).toBeVisible();
});

test("switching accounts in another tab refreshes the active doctor workspace", async ({
  page,
  context,
}) => {
  await adminLogin(page);
  await createDoctor(page);
  await signOut(page);
  await doctorLogin(page);
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Total Patients" })
      .locator("strong"),
  ).toHaveText("18");
  const other = await context.newPage();
  await other.goto("/dashboard");
  await signOut(other, false);
  await expect(page).toHaveURL(/login/);
  await doctorLogin(other, "new.doctor@example.test", "StrongPass@123");
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", { name: /Welcome Back, Dr. Lina Mansour/ }),
  ).toBeVisible();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Total Patients" })
      .locator("strong"),
  ).toHaveText("0");
  await other.close();
});

test("admin views and centered dialogs fit both themes on desktop, tablet, and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await adminLogin(page);
  for (const dark of [false, true]) {
    if (
      ((await page.locator("html").getAttribute("class")) || "").includes(
        "dark",
      ) !== dark
    )
      await page.getByRole("button", { name: "Toggle color theme" }).click();
    for (const width of [1440, 820, 390, 320]) {
      const height = width === 320 ? 568 : 1000;
      await page.setViewportSize({ width, height });
      for (const path of [
        "/admin",
        "/admin/doctors",
        "/admin/activity",
        "/admin/settings",
      ]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${path} ${width}`,
        ).toBe(true);
        await page.screenshot({
          path: `test-results/admin-${path.split("/").pop() || "overview"}-${dark ? "dark" : "light"}-${width}.png`,
          fullPage: true,
        });
      }
      await page.goto("/admin/doctors");
      await page
        .getByRole("button", { name: "Create doctor", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Create doctor",
        exact: true,
      });
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(
        Math.abs(bounds!.x + bounds!.width / 2 - width / 2),
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(bounds!.y + bounds!.height / 2 - height / 2),
      ).toBeLessThanOrEqual(2);
      await page.screenshot({
        path: `test-results/admin-modal-${dark ? "dark" : "light"}-${width}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  }
  expect(errors).toEqual([]);
});
