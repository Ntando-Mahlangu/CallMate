import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// docs/outrun/15 "CI/CD" — "Every pull request must pass: ... Accessibility
// Checks." Scoped to the public, unauthenticated pages for now (marketing
// site + auth screens); the authenticated app's dashboard/prospects/
// campaigns/etc. flows are covered separately once #132's accessibility
// pass on those key flows is done — scanning them here first would just
// make this check permanently red for issues nobody has looked at yet.
const PAGES = ["/", "/privacy", "/terms", "/security", "/sign-in", "/sign-up"];

test.describe("accessibility", () => {
  for (const path of PAGES) {
    test(`${path} has no serious or critical axe violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const seriousOrWorse = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        seriousOrWorse,
        seriousOrWorse
          .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
          .join("\n"),
      ).toEqual([]);
    });
  }
});
