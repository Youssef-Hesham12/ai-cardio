import { expect, test, type Page } from "@playwright/test";
import { createSeed } from "../src/data/mockData";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
const savedData = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("cardioassist_portal_v2") || "{}"),
  );
const composer = (page: Page) =>
  page.getByRole("textbox", { name: /^Message to / });

test("dashboard action is removed and patient profile opens persistent messaging", async ({
  page,
}) => {
  await page.goto("/messages");
  await expect(page).toHaveURL(/login/);
  await signIn(page);
  await expect(
    page.getByRole("link", { name: "New assessment", exact: true }),
  ).toHaveCount(0);
  await page.goto("/patients/p-1");
  await page
    .getByRole("link", { name: "Message patient", exact: true })
    .click();
  await expect(page).toHaveURL(/messages\?patient=p-1/);
  await expect(
    page.getByRole("heading", { name: "Ahmed Ali", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("log")).toContainText(
    "Can we arrange a follow-up appointment?",
  );
  await composer(page).fill(
    "Hello Ahmed. I will confirm an appointment time with you.",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Message saved.");
  await expect(composer(page)).toHaveValue("");
  const data = await savedData(page);
  expect(
    data.messages.filter(
      (m: { body: string }) =>
        m.body === "Hello Ahmed. I will confirm an appointment time with you.",
    ),
  ).toHaveLength(1);
  expect(data.assessments).toHaveLength(54);
  await page.reload();
  await expect(page.getByRole("log")).toContainText(
    "Hello Ahmed. I will confirm an appointment time with you.",
  );
  await expect(page.getByRole("log")).not.toContainText(
    /delivered|read receipt/i,
  );
});

test("drafts stay with each patient, blank sends are blocked, and Enter sends once", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/messages?patient=p-3");
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeDisabled();
  await composer(page).fill("   ");
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeDisabled();
  await composer(page).fill("Nour's saved draft");
  await page.goto("/messages?patient=p-4");
  await expect(composer(page)).toHaveValue("");
  await composer(page).fill("A separate message for Michael");
  await composer(page).press("Shift+Enter");
  await expect(composer(page)).toHaveValue("A separate message for Michael\n");
  await composer(page).press("Enter");
  await expect(page.getByRole("status")).toContainText("Message saved.");
  await page.goto("/messages?patient=p-3");
  await expect(composer(page)).toHaveValue("Nour's saved draft");
  await page.reload();
  await expect(composer(page)).toHaveValue("Nour's saved draft");
  await composer(page).fill("x".repeat(2100));
  await expect(composer(page)).toHaveValue("x".repeat(2000));
  await composer(page).fill("Hello Nour");
  await composer(page).press("Enter");
  await expect(page.getByRole("status")).toContainText("Message saved.");
  const data = await savedData(page);
  expect(
    data.messages.filter(
      (m: { patientId: string; body: string }) =>
        m.patientId === "p-3" && m.body === "Hello Nour",
    ),
  ).toHaveLength(1);
  expect(
    data.messages.filter((m: { patientId: string }) => m.patientId === "p-4"),
  ).toHaveLength(1);
});

test("unread conversations, search, and the connected patient picker work", async ({
  page,
}) => {
  await signIn(page);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(
    navigation.getByRole("link", { name: /Messages/ }),
  ).toContainText("2");
  await navigation.getByRole("link", { name: /Messages/ }).click();
  await page.getByRole("button", { name: "Unread (2)", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Patient conversations" })
      .getByRole("link"),
  ).toHaveCount(2);
  await page
    .getByRole("link", { name: "Conversation with Ahmed Ali", exact: true })
    .click();
  await expect(
    navigation.getByRole("link", { name: /Messages/ }),
  ).toContainText("1");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search conversations..." })
    .fill("updated my contact");
  await expect(
    page.getByRole("link", {
      name: "Conversation with Sarah Johnson",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Conversation with Ahmed Ali",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "New message", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Find a connected patient..." })
    .fill("Heba");
  await expect(
    page.getByRole("button", { name: "Message Heba Mansour", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Find a connected patient..." })
    .fill("Nour");
  await page
    .getByRole("button", { name: "Message Nour Ibrahim", exact: true })
    .click();
  await expect(page).toHaveURL(/patient=p-8/);
  await expect(composer(page)).toBeVisible();
});

test("failed sends preserve the draft and a retry saves only one message", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/settings");
  await page
    .getByRole("checkbox", { name: "Fail next mock request", exact: true })
    .check();
  await page.goto("/messages?patient=p-3");
  await composer(page).fill("Please confirm your preferred appointment time.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("request failed");
  await expect(composer(page)).toHaveValue(
    "Please confirm your preferred appointment time.",
  );
  expect((await savedData(page)).messages).toHaveLength(3);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Message saved.");
  expect((await savedData(page)).messages).toHaveLength(4);
});

test("legacy saves are preserved and unconnected or inactive patients cannot be messaged", async ({
  page,
}) => {
  const seed = createSeed();
  seed.patients[0].status = "Inactive";
  const legacy: Partial<typeof seed> = { ...seed };
  delete legacy.messages;
  await page.addInitScript((data) => {
    if (!localStorage.getItem("cardioassist_portal_v2"))
      localStorage.setItem("cardioassist_portal_v2", JSON.stringify(data));
  }, legacy);
  await signIn(page);
  await page.goto("/messages");
  await expect(
    page.getByRole("heading", { name: "No conversations yet" }),
  ).toBeVisible();
  await page.goto("/messages?patient=p-request-1");
  await expect(
    page.getByRole("heading", { name: "Patient not connected" }),
  ).toBeVisible();
  await expect(composer(page)).toHaveCount(0);
  await page.goto("/messages?patient=p-1");
  await expect(composer(page)).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeDisabled();
  await page.goto("/messages?patient=p-3");
  await composer(page).fill("Hello Nour");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Message saved.");
  const data = await savedData(page);
  expect(data.messages).toHaveLength(1);
  expect(JSON.stringify(data.patients)).toBe(JSON.stringify(legacy.patients));
  expect(JSON.stringify(data.assessments)).toBe(
    JSON.stringify(legacy.assessments),
  );
});

test("message workspace fits light and dark desktop, tablet and mobile screens", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  for (const dark of [false, true]) {
    await page.goto("/messages?patient=p-1");
    if (
      ((await page.locator("html").getAttribute("class")) || "").includes(
        "dark",
      ) !== dark
    )
      await page.getByRole("button", { name: "Toggle color theme" }).click();
    await composer(page).fill(
      "Appointment details: " + "LongMessage".repeat(80),
    );
    await composer(page).press("Enter");
    await expect(page.getByRole("status")).toContainText("Message saved.");
    for (const width of [1440, 820, 390, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${dark} ${width}px`,
      ).toBe(true);
      await expect(composer(page)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Send", exact: true }),
      ).toBeInViewport();
      await page.screenshot({
        path: `test-results/messages-${dark ? "dark" : "light"}-${width}.png`,
        fullPage: true,
      });
      if (width < 761) {
        await page
          .getByRole("link", { name: "Back to conversations", exact: true })
          .click();
        await expect(
          page.getByRole("link", {
            name: "Conversation with Ahmed Ali",
            exact: true,
          }),
        ).toBeVisible();
        await page
          .getByRole("link", {
            name: "Conversation with Ahmed Ali",
            exact: true,
          })
          .click();
      }
    }
  }
  expect(errors).toEqual([]);
});

test("chat styling and centered dialogs fit both themes and narrow screens", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/messages?patient=p-1");
  await composer(page).fill(
    "Hello Ahmed. I will confirm the follow-up appointment time with you here.",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Message saved.");
  await composer(page).fill("knljk");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Message saved.");
  expect(
    await page
      .locator(".message-history")
      .evaluate(
        (element) => getComputedStyle(element, "::before").backgroundImage,
      ),
  ).toContain("heart-study.png");
  expect((await page.request.get("/images/heart-study.png")).ok()).toBe(true);
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
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByRole("log").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      const bubble = await page
        .getByRole("article", { name: "Your message", exact: true })
        .filter({ hasText: "knljk" })
        .boundingBox();
      expect(bubble!.width).toBeGreaterThanOrEqual(200);
      expect(bubble!.height).toBeLessThan(60);
      await page.screenshot({
        path: `test-results/chat-polished-${dark ? "dark" : "light"}-${width}.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "New message", exact: true })
        .first()
        .click();
      const dialog = page.getByRole("dialog", {
        name: "New message",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(
        Math.abs(bounds!.x + bounds!.width / 2 - width / 2),
      ).toBeLessThanOrEqual(2);
      expect(
        Math.abs(bounds!.y + bounds!.height / 2 - height / 2),
      ).toBeLessThanOrEqual(2);
      expect(bounds!.width).toBeLessThanOrEqual(width - 20);
      expect(bounds!.height).toBeLessThanOrEqual(height - 30);
      await page.screenshot({
        path: `test-results/chat-modal-${dark ? "dark" : "light"}-${width}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
  }
});

test("themed scrollbars stay slim without arrows and keep lists scrollable", async ({
  page,
}) => {
  const seed = createSeed();
  seed.messages = Array.from({ length: 18 }, (_, index) => ({
    id: `scroll-message-${index}`,
    patientId: "p-1",
    sender: index % 2 ? "Doctor" : "Patient",
    body: `Appointment message ${index + 1}`,
    date: new Date(Date.UTC(2026, 9, 8, 9, index)).toISOString(),
    read: true,
  }));
  await page.addInitScript((data) => {
    if (!localStorage.getItem("cardioassist_portal_v2"))
      localStorage.setItem("cardioassist_portal_v2", JSON.stringify(data));
  }, seed);
  await signIn(page);
  await page.goto("/messages?patient=p-1");
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const dark of [false, true]) {
    if (
      ((await page.locator("html").getAttribute("class")) || "").includes(
        "dark",
      ) !== dark
    )
      await page.getByRole("button", { name: "Toggle color theme" }).click();
    for (const selector of [
      ".sidebar nav",
      ".message-thread-list",
      ".message-log",
    ]) {
      const styles = await page.locator(selector).evaluate((element) => ({
        width: getComputedStyle(element, "::-webkit-scrollbar").width,
        button: getComputedStyle(element, "::-webkit-scrollbar-button").display,
        thumb: getComputedStyle(element, "::-webkit-scrollbar-thumb")
          .backgroundColor,
      }));
      expect(styles.width).toBe("6px");
      expect(styles.button).toBe("none");
      expect(styles.thumb).toBe(
        dark ? "rgb(53, 72, 97)" : "rgb(183, 199, 222)",
      );
    }
    const log = page.getByRole("log");
    expect(
      await log.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    await log.hover();
    await log.evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.mouse.wheel(0, 160);
    await expect
      .poll(() => log.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await page
      .getByRole("button", { name: "New message", exact: true })
      .first()
      .click();
    const picker = page.locator(".message-patient-picker");
    expect(
      await picker.evaluate((element) => ({
        width: getComputedStyle(element, "::-webkit-scrollbar").width,
        button: getComputedStyle(element, "::-webkit-scrollbar-button").display,
        scrollable: element.scrollHeight > element.clientHeight,
      })),
    ).toEqual({ width: "6px", button: "none", scrollable: true });
    await picker.hover();
    await page.mouse.wheel(0, 160);
    await expect
      .poll(() => picker.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await page.screenshot({
      path: `test-results/scrollbar-${dark ? "dark" : "light"}.png`,
    });
    await page.keyboard.press("Escape");
  }
});
