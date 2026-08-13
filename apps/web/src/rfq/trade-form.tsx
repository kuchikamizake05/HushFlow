"use client";

import { useState } from "react";

import type { WritePreflight } from "../writes/preflight";
import { getWriteGuard } from "../writes/preflight";

const localFixturePreflight: WritePreflight = {
  mode: "fixture",
  deployment: "pending",
  rpc: "unavailable",
};

export function TradeForm() {
  const [privateMinimum, setPrivateMinimum] = useState("");
  const guard = getWriteGuard(localFixturePreflight);

  return (
    <form className="trade-form" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="lot">
        FXRP lot amount{" "}
        <input
          id="lot"
          inputMode="decimal"
          name="lot"
          placeholder="Public amount"
        />
      </label>
      <label htmlFor="minimum">
        Private minimum USDT0{" "}
        <input
          id="minimum"
          inputMode="decimal"
          name="private-minimum"
          onChange={(event) => setPrivateMinimum(event.target.value)}
          placeholder="Encrypted before wallet submission"
          value={privateMinimum}
        />
      </label>
      <label htmlFor="cap">
        Public quote cap USDT0{" "}
        <input
          id="cap"
          inputMode="decimal"
          name="cap"
          placeholder="Public maximum"
        />
      </label>
      <button disabled={!guard.enabled} type="submit">
        Create RFQ after live preflight
      </button>
      <p role="status">
        {guard.enabled
          ? "Direct RPC preflight ready."
          : "Live deployment and direct contract preflight are required. Private minimum stays only in this form until encryption."}
      </p>
    </form>
  );
}
