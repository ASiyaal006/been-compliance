import { verifySupabaseConnection } from "@/lib/supabase/health";
import { getSupabaseEnvStatus } from "@/lib/supabase/env";
import { withTimeout } from "@/lib/with-timeout";

export async function DbConnectionBanner() {
  const env = getSupabaseEnvStatus();
  if (!env.ready) {
    return (
      <div
        className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 md:px-8"
        role="alert"
      >
        <span className="font-semibold">Database not configured.</span> {env.message} Restart{" "}
        <span className="font-mono">pnpm dev</span> after updating <span className="font-mono">.env.local</span>.
      </div>
    );
  }

  let health;
  try {
    health = await withTimeout(verifySupabaseConnection(), "Database health check", 8_000);
  } catch {
    health = { ok: false as const, reason: "connection_error" as const, message: "Health check timed out." };
  }

  if (!health.ok) {
    return (
      <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 md:px-8" role="alert">
        <span className="font-semibold">Cannot reach Supabase.</span> {health.message}
      </div>
    );
  }

  return (
    <div
      className="border-b border-emerald-200/80 bg-emerald-50/90 px-4 py-2 text-xs text-emerald-900 md:px-8"
      role="status"
    >
      <span className="font-semibold">Live database connected.</span>{" "}
      {health.clientCount} client{health.clientCount === 1 ? "" : "s"} · {health.assetCount} asset
      {health.assetCount === 1 ? "" : "s"} in Supabase.
    </div>
  );
}
