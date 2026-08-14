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
  if (typeof window !== "undefined" && (window.location.hostname === "hushflow.dev" || window.location.hostname === "www.hushflow.dev")) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `https://app.hushflow.dev${cleanPath}/`;
  }
  return path;
}

