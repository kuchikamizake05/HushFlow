import { describe, expect, it } from "vitest";

import { DataStatusBanner } from "../../apps/web/src/shell/data-status-banner.js";
import { Navigation } from "../../apps/web/src/shell/navigation.js";

describe("M4B application shell", () => {
  it("makes fixture provenance persistent and honest", () => {
    const banner = DataStatusBanner({
      provenance: { mode: "fixture", sourceId: "m4b-local-v1" },
    });

    expect(banner?.props.role).toBe("status");
    expect(banner?.props.children).toContain("Local fixture data");
  });

  it("renders every critical route in keyboard-friendly navigation", () => {
    const navigation = Navigation();
    const links = navigation.props.children as Array<{
      props: { href: string };
    }>;
    const hrefs = links.map((link) => link.props.href);

    expect(navigation.props["aria-label"]).toBe("Primary navigation");
    expect(hrefs).toEqual(
      expect.arrayContaining(["/trade", "/liquidity", "/portfolio"]),
    );
  });

  it("labels verified live provenance without claiming a write is safe", () => {
    const banner = DataStatusBanner({
      provenance: { mode: "live", sourceId: "coston2-indexer" },
    });
    expect(banner?.props.children).toContain("Live indexed data");
  });

  it("renders an unavailable state rather than relabelling it as fixture data", () => {
    const banner = DataStatusBanner({ provenance: null });
    expect(banner?.props.children).toContain("Read data unavailable");
  });
});
