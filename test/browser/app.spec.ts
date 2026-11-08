import { test, expect } from "@playwright/test";
test("guided support case retains context with rich text and colored code", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Run guided walkthrough" }).click();
  await expect(page.getByRole("status")).toContainText("Walkthrough complete");
  await expect(page.locator("#conversation")).toContainText("Maya");
  await expect(page.locator("#conversation")).toContainText("1042");
  await expect(
    page.locator("#conversation pre code .hljs-keyword").first(),
  ).toBeVisible();
  await expect(page.locator("#identity")).toContainText("demo_session_");
  await page
    .getByRole("button", { name: "Retrieve details", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("No message was sent");
  await expect(page.locator("#event-count")).toHaveText("8 events");
});
test("all API and field cards include colored snippets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /02/ }).click();
  const cards = page.locator(".namespace-grid article");
  await expect(cards).toHaveCount(14);
  for (const card of await cards.all()) {
    await card.locator("summary").click();
    await expect(card.locator("pre code[data-highlighted=true]")).toBeVisible();
    expect(await card.locator("pre code span").count()).toBeGreaterThan(0);
  }
});
test("UML selectable steps, keyboard tabs, quiz and larger mobile layout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /03/ }).click();
  await expect(
    page.getByRole("img", { name: "UML component architecture" }),
  ).toBeVisible();
  await page
    .getByText("Explore the full UML session lifecycle", { exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "UML session lifecycle workflow" }),
  ).toBeVisible();
  await page.locator(".workflow-step-buttons button").nth(4).click();
  await expect(page.locator(".workflow-step-detail")).toContainText(
    "Continue the same case",
  );
  await expect(
    page.locator(".workflow-step-detail pre code .hljs-keyword").first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: /03/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /04/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page
    .locator("fieldset")
    .first()
    .getByText("The session", { exact: true })
    .click();
  await expect(page.locator("#score")).toContainText("1 / 6");
  await page.getByRole("button", { name: "Larger", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("new empty case isolates history; hostile input stays text; terminal lifecycle confirmations", async ({
  page,
}) => {
  await page.goto("/");
  const title = "Case <img src=x onerror=alert(1)>";
  await page.locator("#case-title").fill(title);
  await page.locator("#initial-prompt").fill("");
  await page
    .getByRole("button", { name: "Create a new session", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("New session created");
  await page
    .getByRole("button", { name: "Refresh history & status", exact: true })
    .click();
  await expect(page.locator("#event-count")).toHaveText("0 events");
  await expect(page.locator("#identity")).toContainText("demo_session");
  await page.locator(".archive-panel summary").click();
  await expect(
    page.getByRole("button", { name: "Archive selected session", exact: true }),
  ).toBeDisabled();
  await page.locator("#archive-name").fill(title);
  await page
    .getByRole("button", { name: "Archive selected session", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Archived.");
  await expect(
    page.getByRole("button", { name: "Send to the same session", exact: true }),
  ).toBeDisabled();
  expect(await page.locator("img[onerror]").count()).toBe(0);
  await page.locator("#delete-name").fill(`DELETE ${title}`);
  await page
    .getByRole("button", {
      name: "Permanently delete selected session",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("permanently deleted");
});
