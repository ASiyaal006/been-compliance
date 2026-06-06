import { LoginForm } from "@/components/login-form";

type Props = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const authError = params.error === "auth";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-navy text-lg font-bold text-white">
            B
          </div>
          <h1 className="text-xl font-semibold text-[#002147]">Been Compliance</h1>
          <p className="mt-1 text-sm text-slate-muted">Sign in to the TICC operations platform</p>
        </div>

        {authError ? (
          <p className="mb-4 rounded-lg border border-danger/20 bg-danger-bg px-3 py-2 text-sm text-danger">
            Sign-in failed. Check your credentials and try again.
          </p>
        ) : null}

        <LoginForm redirectTo={params.next ?? "/dashboard"} />
      </div>
    </div>
  );
}
