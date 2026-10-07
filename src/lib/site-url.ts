/** Canonical origin for public asset URLs and QR codes (no trailing slash). */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  // Printed QR tags must keep working, so prefer the stable production domain over
  // VERCEL_URL, which changes with every deployment.
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function publicAssetPath(assetId: string): string {
  return `/public/asset/${encodeURIComponent(assetId)}`;
}

export function publicAssetUrl(assetId: string): string {
  return `${getSiteOrigin()}${publicAssetPath(assetId)}`;
}
