/**
 * Public website address used for search engines and social previews.
 * Set NEXT_PUBLIC_MARKETING_URL (e.g. https://www.beencompliance.com) once the domain points at Vercel.
 */
export function getMarketingOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_MARKETING_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export const QUOTE_SERVICES = [
  { value: "pre-shipment", label: "Pre-shipment product inspection" },
  { value: "production", label: "During-production or factory check" },
  { value: "loading", label: "Container loading check" },
  { value: "uk-arrival", label: "UK arrival inspection (warehouse or 3PL)" },
  { value: "loler", label: "LOLER thorough examination" },
  { value: "puwer", label: "PUWER inspection" },
  { value: "pat", label: "Electrical testing (PAT)" },
  { value: "load-test", label: "Load testing" },
  { value: "other", label: "Something else" },
] as const;

export type QuoteService = (typeof QUOTE_SERVICES)[number]["value"];

export const PRODUCT_SERVICES: readonly QuoteService[] = ["pre-shipment", "production", "loading", "uk-arrival"];
