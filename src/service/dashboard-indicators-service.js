/**
 * Integration boundary for the new indicators. No endpoint or period parameter
 * is confirmed yet. Returning null keeps the UI explicitly unavailable without
 * calling a guessed route or deriving statistics from recent reports.
 * Replace this implementation with an adapter using api-client's JSend request
 * once the backend contract is confirmed; keep its wire types in that adapter.
 * @type {import('../types/dashboard').DashboardIndicatorsLoader}
 */
export const loadDashboardIndicators = async ({ signal }) => {
  if (signal.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError')
  return null
}
