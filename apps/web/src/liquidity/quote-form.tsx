"use client";

import { useState } from "react";

import { getWriteGuard, pendingWritePreflight } from "../writes/preflight";

export function QuoteForm() {
  const [quote, setQuote] = useState("");
  const guard = getWriteGuard(pendingWritePreflight);

  return (
    <form className="trade-form" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="private-quote">
        Private USDT0 quote{" "}
        <input
          id="private-quote"
          inputMode="decimal"
          name="private-quote"
          onChange={(event) => setQuote(event.target.value)}
          placeholder="Encrypted before wallet submission"
          value={quote}
        />
      </label>
      <button disabled={!guard.enabled} type="submit">
        Submit quote after live preflight
      </button>
      <p role="status">
        {guard.enabled
          ? "Direct RPC preflight ready."
          : `${guard.reason}: private quote stays only in this form until encryption.`}
      </p>
    </form>
  );
}
