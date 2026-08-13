"use client";

import { useState } from "react";

import { getQuoteGuard } from "./quote-guard";

export function QuoteForm() {
  const [quote, setQuote] = useState("");
  const guard = getQuoteGuard({ mode: "fixture", rpc: "unavailable" });

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
        Private quote stays only in this form until encryption. Fixture mode
        cannot submit.
      </p>
    </form>
  );
}
