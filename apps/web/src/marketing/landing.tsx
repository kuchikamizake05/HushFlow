import Link from "next/link";

import { EncryptedQuoteConvergence } from "./encrypted-quote-convergence";
import { landingCopy, landingCtas, lifecycleSteps } from "./landing-content";

export function LandingPage() {
  return (
    <>
      <section aria-labelledby="hero-title" className="hero">
        <p className="eyebrow">CONFIDENTIAL FXRP RFQ</p>
        <h1 id="hero-title">{landingCopy[0]}</h1>
        <p>{landingCopy[1]}</p>
        <div className="cta-row">
          {landingCtas.map((cta) => (
            <Link
              className={
                cta.href === "/trade" ? "button button--primary" : "button"
              }
              href={cta.href}
              key={cta.href}
            >
              {cta.label}
            </Link>
          ))}
        </div>
        <EncryptedQuoteConvergence />
      </section>
      <section className="landing-section" aria-labelledby="privacy-title">
        <p className="eyebrow">THE PRIVACY BOUNDARY</p>
        <h2 id="privacy-title">
          Encrypted inputs. Confidential resolution. Public proof.
        </h2>
        <p>{landingCopy[2]}</p>
      </section>
      <section className="landing-section" aria-labelledby="lifecycle-title">
        <p className="eyebrow">PROTOCOL LIFECYCLE</p>
        <h2 id="lifecycle-title">One clear execution path.</h2>
        <ol className="lifecycle">
          {lifecycleSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      <section
        className="landing-section route-grid"
        aria-labelledby="routes-title"
      >
        <h2 id="routes-title">Built for every participant.</h2>
        <Link href="/trade">
          <strong>Private RFQ</strong>
          <span>Create an encrypted seller instruction.</span>
        </Link>
        <Link href="/liquidity">
          <strong>Liquidity Desk</strong>
          <span>Review public opportunities and quote privately.</span>
        </Link>
        <Link href="/proof">
          <strong>Proof Center</strong>
          <span>Inspect available execution evidence.</span>
        </Link>
        <Link href="/portfolio">
          <strong>Portfolio</strong>
          <span>Track outcomes and readiness to claim.</span>
        </Link>
      </section>
    </>
  );
}
