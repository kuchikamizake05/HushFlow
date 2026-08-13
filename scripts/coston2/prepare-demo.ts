import { buildDemoCliReport } from "./demo-cli.js";

const report = buildDemoCliReport(process.env);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
