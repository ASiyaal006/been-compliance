import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep @react-pdf/renderer out of the server bundle (App Router client-only PDFs).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
