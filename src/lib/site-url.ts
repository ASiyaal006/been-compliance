/** Canonical origin for public asset URLs and QR codes (no trailing slash). */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
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
