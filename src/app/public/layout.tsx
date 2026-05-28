import type { ReactNode } from "react";

/** Public routes: no dashboard chrome, no authentication. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-slate-100">{children}</div>;
}
