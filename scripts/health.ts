import { extractLocalHealthReport } from '../src/node';

const report = await extractLocalHealthReport({
  minBranchCoverage: 85,
  ignorePatterns: [/\.test\.ts$/, /\/index\.ts$/],
});

console.log(JSON.stringify(report, null, 2));
