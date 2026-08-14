export const productRoutes = [
  "/",
  "/trade",
  "/market",
  "/liquidity",
  "/portfolio",
  "/proof",
  "/demo",
] as const;

export function getAppTradeUrl(path = "/trade"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath;
}
