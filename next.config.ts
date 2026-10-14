import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

// Service worker for the installable app (PWA). It needs a webpack build (`next build --webpack`),
// so it is switched off in development, where Next uses Turbopack.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" }],
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Keep @react-pdf/renderer out of the server bundle (App Router client-only PDFs).
  serverExternalPackages: ["@react-pdf/renderer"],
  // `next dev` stays on Turbopack (Serwist is off there). Serwist adds a webpack hook, so Next needs this to
  // know Turbopack is still intended.
  turbopack: {},
};

export default withSerwist(nextConfig);
