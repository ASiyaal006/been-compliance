import type { Metadata } from "next";
import { CheckItem, CtaBand, Eyebrow } from "@/components/site/site-chrome";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Been Compliance is a UK inspection company for product quality and lifting equipment safety, built around clear reports and software that keeps clients compliant.",
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>About us</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
            Inspection that&rsquo;s easy to buy and easy to understand
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            Been Compliance is a UK inspection company. We help small and growing businesses prove that what they sell
            is right and what they use is safe, without the paperwork headaches that usually come with it.
          </p>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div className="space-y-5 text-[17px] leading-relaxed text-slate-700">
            <h2 className="text-2xl font-semibold tracking-tight text-navy">Why we started</h2>
            <p>
              Smaller businesses are often poorly served by inspection. Big providers are built for big contracts, and
              many local firms still post a PDF and leave you to keep track of when the next one is due.
            </p>
            <p>
              We started Been Compliance to do it differently. Before taking on our first client, we built our own
              software, so that every inspection is recorded the same way, every report is easy to find, and nobody has
              to remember a due date.
            </p>
            <p>
              Today we serve two kinds of customer: UK businesses that import consumer products from overseas
              factories, and businesses that rely on lifting and work equipment day to day.
            </p>
          </div>
          <div className="rounded-3xl bg-navy p-8 text-white sm:p-10">
            <h2 className="text-xl font-semibold">What we stand for</h2>
            <ul className="mt-6 space-y-5 text-[15px] text-slate-200">
              <CheckItem light>
                <strong className="text-white">Independence.</strong> We report what we find, plainly, whatever the
                answer.
              </CheckItem>
              <CheckItem light>
                <strong className="text-white">Clarity.</strong> Plain English, photos and a clear verdict, not pages of
                jargon.
              </CheckItem>
              <CheckItem light>
                <strong className="text-white">Speed.</strong> Reports the same day for equipment, and within 24 hours
                for product inspections.
              </CheckItem>
              <CheckItem light>
                <strong className="text-white">Honesty.</strong> We tell you what we are and what we aren&rsquo;t,
                including where we are on accreditation.
              </CheckItem>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Standards</Eyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy">How we work</h2>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-slate-700">
            <p>
              Our product inspections use ISO 2859-1 acceptance sampling. Our lifting equipment reports follow the
              requirements of LOLER 1998 Schedule 1, and our work equipment inspections follow PUWER 1998.
            </p>
            <p>
              We are working towards UKAS accreditation to ISO/IEC 17020, the international standard for inspection
              bodies, and we are building our quality system to meet it. We do not yet hold UKAS accreditation, and we will
              say so plainly until we do.
            </p>
          </div>
        </div>
      </section>

      <div className="pt-20">
        <CtaBand
          title="Let's talk about what you need"
          text="Whether it's one order or a whole workshop, we'll send a clear, fixed price."
        />
      </div>
    </>
  );
}
