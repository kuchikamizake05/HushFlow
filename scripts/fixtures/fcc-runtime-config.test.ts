import { describe, expect, it } from "vitest";

import { readRuntimeConfig } from "../../services/fcc-extension/src/main.js";

describe("FCC runtime configuration", () => {
  it("uses the FCC extension and signing port defaults", () => {
    expect(readRuntimeConfig({})).toEqual({ extensionPort: 7702, signPort: 7701 });
  });

  it("accepts explicit valid ports and rejects unsafe values", () => {
    expect(
      readRuntimeConfig({ EXTENSION_PORT: "8080", SIGN_PORT: "9090" }),
    ).toEqual({ extensionPort: 8080, signPort: 9090 });
    expect(() => readRuntimeConfig({ EXTENSION_PORT: "0" })).toThrow(
      "EXTENSION_PORT_INVALID",
    );
    expect(() => readRuntimeConfig({ SIGN_PORT: "not-a-port" })).toThrow(
      "SIGN_PORT_INVALID",
    );
  });
});
