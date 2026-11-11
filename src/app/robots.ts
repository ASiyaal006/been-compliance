import type { MetadataRoute } from "next";
import { getMarketingOrigin } from "@/lib/marketing";

export default function robots(): MetadataRoute.Robots {
  const origin = getMarketingOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/services", "/about", "/quote", "/privacy"],
      disallow: ["/dashboard", "/assets", "/inspections", "/certificates", "/portal", "/admin", "/api", "/public"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
