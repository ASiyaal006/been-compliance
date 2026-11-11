import type { Metadata } from "next";
import { CheckItem, Eyebrow } from "@/components/site/site-chrome";
import { QuoteForm } from "@/components/site/quote-form";

export const metadata: Metadata = {
  title: "Get a quote",
  description: "Request a fixed price for a product inspection or a LOLER or PUWER examination.",
};

type Props = { searchParams: Promise<{ service?: string }> };

export default async function QuotePage({ searchParams }: Props) {
  const { service } = await searchParams;
  return (
    <section className="bg-slate-50 px-4 py-16 sm:px-6 md:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow>Get a quote</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-navy">
            Tell us what you need
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            A few details are enough. We&rsquo;ll reply with a fixed price, usually within one working day.
          </p>
          <ul className="mt-8 space-y-3 text-[15px] text-slate-700">
            <CheckItem>No obligation, no hidden extras</CheckItem>
            <CheckItem>Founding client discounts for our first 20 clients</CheckItem>
            <CheckItem>Overdue LOLER examinations prioritised</CheckItem>
          </ul>
        </div>
        <div className="relative rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          <QuoteForm initialService={service} />
        </div>
      </div>
    </section>
  );
}
