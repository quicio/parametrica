/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports break independent reasoning and testing.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-isolation',
      severity: 'error',
      comment: 'ADR-0004: domain imports only domain.',
      from: { path: '^src/domain/' },
      to: { pathNot: '^src/domain/' },
    },
    {
      name: 'core-no-adapters',
      severity: 'error',
      comment: 'ADR-0004: core must not import UI, render, export, composition, workers or app stores.',
      from: { path: '^src/core/' },
      to: { path: '^src/(ui|render|viz|application|composition|workers|export|presets|lab|interaction|input)/' },
    },
    {
      name: 'application-no-ui',
      severity: 'error',
      comment: 'ADR-0004: application depends on ports, not UI or concrete composition.',
      from: { path: '^src/application/' },
      to: { path: '^src/(ui|composition|workers)/' },
    },
    {
      name: 'application-no-render',
      severity: 'error',
      comment: 'ADR-0004: application uses domain/view policy, not render adapters.',
      from: { path: '^src/application/' },
      to: { path: '^src/render/' },
    },
    {
      name: 'application-no-interaction',
      severity: 'error',
      comment: 'ADR-0004: pure picking math lives in domain; application does not import interaction adapters.',
      from: { path: '^src/application/' },
      to: { path: '^src/interaction/' },
    },
    {
      name: 'ui-no-composition',
      severity: 'error',
      comment: 'ADR-0004: only composition selects concrete adapters.',
      from: { path: '^src/ui/' },
      to: { path: '^src/(composition/|application/App[.]js$)' },
    },
    {
      name: 'adapters-no-composition',
      severity: 'error',
      comment: 'Only composition selects concrete adapters.',
      from: { path: '^src/(ui|render|export|lab|presets|interaction|input|workers)/' },
      to: { path: '^src/composition/' },
    },
    {
      name: 'generators-no-render',
      severity: 'error',
      comment: 'Generators use pure view math, not render adapters.',
      from: { path: '^src/generators/' },
      to: { path: '^src/render/' },
    },
    {
      name: 'export-no-app',
      severity: 'error',
      comment: 'The export adapter uses the export port, not App.',
      from: { path: '^src/export/' },
      to: { path: '^src/application/App\\.js$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules|dist|test-results|playwright-report|coverage' },
    moduleSystems: ['es6'],
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
