// Thin GA4 wrapper. Never throws; no-ops when gtag is absent (dev, tests,
// or before the analytics snippet loads).
export const trackEvent = (
  name: string,
  params?: Record<string, string | number | boolean>
) => {
  const g = (window as any).gtag
  if (typeof g === 'function') g('event', name, params)
}
