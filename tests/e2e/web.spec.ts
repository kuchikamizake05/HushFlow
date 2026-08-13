import { expect, test } from "@playwright/test";

test.describe("M4B safe fixture journey", () => {
  test("renders the fixture label and accessible route navigation", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("status").filter({ hasText: "Local fixture data" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start Private RFQ" }),
    ).toHaveAttribute("href", "/trade");
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toContainText("Proof");
  });

  test("keeps private trade input in memory and write action disabled", async ({
    page,
  }) => {
    const privateAmount = "918273645";
    await page.goto("/trade");
    await page.getByLabel("Private minimum USDT0").fill(privateAmount);

    await expect(page).not.toHaveURL(new RegExp(privateAmount));
    await expect(
      page.getByRole("button", { name: "Create RFQ after live preflight" }),
    ).toBeDisabled();
    await expect(page).not.toHaveURL(/minimum|quote=/i);
    await expect(page.locator("body")).toContainText(
      "Live deployment and direct contract preflight are required.",
    );
    expect(
      await page.evaluate(() => Object.values(localStorage)),
    ).not.toContain(privateAmount);
    expect(
      await page.evaluate(() => Object.values(sessionStorage)),
    ).not.toContain(privateAmount);
  });

  test("renders the read-only controlled demo readiness plan", async ({
    page,
  }) => {
    await page.goto("/demo/readiness");

    await expect(
      page.getByRole("heading", { name: "CONTROLLED TESTNET ACTIVITY" }),
    ).toBeVisible();
    await expect(page.getByText("FCC_ORGANIZER_ACCESS")).toBeVisible();
    await expect(page.locator("body")).toContainText(
      "No wallet, signing key, or transaction authority is available on this page.",
    );
    await expect(page.locator("button, input, form")).toHaveCount(0);
    await expect(page.getByText("Connect wallet")).toHaveCount(0);
  });
});
