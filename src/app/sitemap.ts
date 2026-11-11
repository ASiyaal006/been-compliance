import type { MetadataRoute } from "next";
import { getMarketingOrigin } from "@/lib/marketing";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getMarketingOrigin();
  return ["", "/services/product-inspections", "/services/loler-puwer", "/about", "/quote", "/privacy"].map(
    (path) => ({ url: `${origin}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.7 }),
  );
}
