import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password · Been Compliance" };

type Props = { searchParams: Promise<{ email?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-navy text-lg font-bold text-white">
            B
          </div>
          <h1 className="text-xl font-semibold text-[#002147]">Forgot your password?</h1>
          <p className="mt-1 text-sm text-slate-muted">Enter your email and we&apos;ll send you a link to choose a new one</p>
        </div>
        <ForgotPasswordForm initialEmail={email?.slice(0, 200) ?? ""} />
      </div>
    </div>
  );
}
