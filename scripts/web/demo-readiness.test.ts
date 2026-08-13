import { describe, expect, it } from "vitest";

import { DemoReadiness } from "../../apps/web/src/demo/demo-readiness.js";
import { toDemoReadinessView } from "../../apps/web/src/demo/readiness.js";

const readiness = {
  classification: "CONTROLLED_TESTNET_ACTIVITY" as const,
  state: "BLOCKED" as const,
  reasons: ["FCC_ORGANIZER_ACCESS"],
  requirements: [],
  wallets: null,
  actions: [
    {
      id: "APPROVE_FXRP",
      role: "seller",
      description: "Approve FXRP custody.",
    },
    {
      id: "CREATE_RFQ",
      role: "seller",
      description: "Create the controlled RFQ.",
    },
  ],
};

const flatten = (node: unknown): unknown[] => {
  if (!node || typeof node !== "object") return [node];
  const element = node as { props?: { children?: unknown } };
  const children = element.props?.children;
  return [
    node,
    ...(Array.isArray(children) ? children : [children]).flatMap(flatten),
  ];
};

describe("M5 readiness dashboard", () => {
  it("renders the public controlled-testnet status and plan", () => {
    const view = toDemoReadinessView(readiness);
    const page = DemoReadiness({ readiness: view });

    expect(view.heading).toBe("CONTROLLED TESTNET ACTIVITY");
    expect(view.state).toBe("BLOCKED");
    expect(view.reasons).toEqual(["FCC_ORGANIZER_ACCESS"]);
    expect(view.actions.map((action) => action.id)).toEqual([
      "APPROVE_FXRP",
      "CREATE_RFQ",
    ]);
    expect(JSON.stringify(page)).toContain("No wallet, signing key");
  });

  it("has no interactive wallet or transaction controls", () => {
    const page = DemoReadiness({ readiness: toDemoReadinessView(readiness) });
    const elementTypes = flatten(page).map(
      (node) => (node as { type?: unknown }).type,
    );

    expect(elementTypes).not.toContain("button");
    expect(elementTypes).not.toContain("form");
    expect(elementTypes).not.toContain("input");
    expect(JSON.stringify(page)).not.toMatch(/private.key|secret/i);
  });
});
