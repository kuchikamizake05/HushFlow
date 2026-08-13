import { demoSteps } from "./journey";

export function DemoJourney() {
  return (
    <ol className="demo-journey">
      {demoSteps.map((step, index) => (
        <li key={step.title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div>
            <h2>{step.title}</h2>
            <p>{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
