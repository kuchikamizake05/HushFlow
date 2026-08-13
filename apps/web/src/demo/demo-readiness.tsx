import type { DemoReadinessView } from "./readiness";

export function DemoReadiness({ readiness }: { readiness: DemoReadinessView }) {
  return (
    <section aria-label="Controlled Coston2 demo readiness">
      <h2>{readiness.heading}</h2>
      <p role="status">{readiness.state}</p>
      <p>
        No wallet, signing key, or transaction authority is available on this
        page.
      </p>
      <h3>Readiness reasons</h3>
      <ul>
        {readiness.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <h3>Public prerequisites</h3>
      <ul>
        {readiness.requirements.map((requirement) => (
          <li key={requirement.name}>
            {requirement.name}: {requirement.present ? "present" : "missing"}
          </li>
        ))}
      </ul>
      <h3>Controlled action sequence</h3>
      <ol>
        {readiness.actions.map((action) => (
          <li key={action.id}>
            <strong>{action.id}</strong>: {action.description}
          </li>
        ))}
      </ol>
    </section>
  );
}
