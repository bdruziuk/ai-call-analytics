import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // music-metadata is ESM-only (no CJS export).
  // Listing it here tells the webpack bundler to leave it alone
  // and let Node.js resolve it natively at runtime.
  serverExternalPackages: ["music-metadata"],
};

export default nextConfig;
