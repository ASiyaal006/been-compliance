import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/set-password-form";

export const metadata: Metadata = { title: "Set your password · Been Compliance" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function WelcomePage({ searchParams }: Props) {
  const { next } = await searchParams;
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-navy text-lg font-bold text-white">
            B
          </div>
          <h1 className="text-xl font-semibold text-[#002147]">Welcome to Been Compliance</h1>
          <p className="mt-1 text-sm text-slate-muted">Choose a password to finish setting up your login</p>
        </div>
        <SetPasswordForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
