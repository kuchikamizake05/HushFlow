import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
    resolveAlias: {
      "@coinbase/cdp-sdk": "./empty-module.js",
      "@base-org/account": "./empty-module.js",
      "@x402/core/client": "./empty-module.js",
      "@x402/evm/exact/client": "./empty-module.js",
      "@x402/evm/upto/client": "./empty-module.js",
      "@x402/svm/exact/client": "./empty-module.js",
    },
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@coinbase/cdp-sdk": false,
      "@base-org/account": false,
      "@x402/core/client": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/svm/exact/client": false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
