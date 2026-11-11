import type { Metadata } from "next";
import { CheckItem, CtaBand, CtaButton, Eyebrow, Faq } from "@/components/site/site-chrome";

export const metadata: Metadata = {
  title: "Product inspections for UK importers",
  description:
    "Pre-shipment, during-production and container loading inspections at your supplier's factory, plus UK arrival checks. AQL sampling and a photo report within 24 hours.",
};

const SERVICES = [
  {
    title: "Pre-shipment inspection",
    when: "When 80 to 100% of the order is packed",
    text: "Our most popular check. We pull a random sample from the finished, packed goods and inspect it against your specification before you pay the balance.",
  },
  {
    title: "During-production inspection",
    when: "When 20 to 60% of the order is made",
    text: "Catch problems while the line is still running and there is time to correct them, rather than finding them in a finished order.",
  },
  {
    title: "Pre-production check",
    when: "Before mass production starts",
    text: "We confirm the raw materials, components and approved sample match what you ordered, so the run starts on the right footing.",
  },
  {
    title: "Container loading check",
    when: "On loading day",
    text: "We count the cartons, check their condition and watch them loaded and sealed, so the right goods leave in the right state.",
  },
  {
    title: "UK arrival inspection",
    when: "At your warehouse, prep centre or 3PL",
    text: "Goods already in the UK? We inspect them on arrival before they go live on Amazon or reach your customers.",
  },
];

const CHECKS = [
  "Quantity and assortment against your order",
  "Packaging, cartons, labels and barcodes",
  "Product markings such as UKCA and CE, and warning labels",
  "Dimensions, weight, colour and materials",
  "Function, assembly and on-site safety tests",
  "Workmanship and cosmetic defects",
  "Photos of every finding and a clear pass or fail",
];

export default function ProductInspectionsPage() {
  return (
    <>
      <section className="bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Consumer product inspections</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
              Check your goods at the factory, before you pay the balance
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              For UK importers, brands and Amazon, eBay and Shopify sellers sourcing from overseas. Our inspectors visit
              your supplier, check the order against your specification, and send you a photo report within 24 hours.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <CtaButton href="/quote?service=pre-shipment">Book an inspection</CtaButton>
              <CtaButton href="#services" variant="ghost">
                Inspection types
              </CtaButton>
            </div>
          </div>
          <div className="rounded-3xl bg-navy p-8 text-white">
            <p className="text-sm font-medium text-[#f5b335]">Why sellers book us</p>
            <ul className="mt-5 space-y-4 text-[15px] text-slate-200">
              <CheckItem light>A bad batch means returns, poor reviews and marketplace warnings</CheckItem>
              <CheckItem light>Once goods ship, getting a supplier to fix them is hard</CheckItem>
              <CheckItem light>An independent report gives you leverage while you still hold the balance</CheckItem>
              <CheckItem light>One inspection costs far less than one container of faulty stock</CheckItem>
            </ul>
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-20 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>Inspection types</Eyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            The right check at the right stage
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 p-7">
                <h3 className="text-lg font-semibold text-navy">{s.title}</h3>
                <p className="mt-1 text-sm font-medium text-[#b7791f]">{s.when}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
            <div className="flex flex-col justify-between rounded-2xl bg-slate-50 p-7">
              <div>
                <h3 className="text-lg font-semibold text-navy">Not sure which you need?</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  Tell us about the product and your supplier and we&rsquo;ll recommend the right check.
                </p>
              </div>
              <div className="mt-6">
                <CtaButton href="/quote?service=other" size="sm" variant="ghost">
                  Ask us
                </CtaButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>What we check</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy">Your spec, checked line by line</h2>
            <p className="mt-4 text-slate-600">
              Every inspection follows a checklist built from your product specification and order. Typical checks
              include:
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-slate-700">
              {CHECKS.map((c) => (
                <CheckItem key={c}>{c}</CheckItem>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-8 ring-1 ring-slate-200">
            <Eyebrow>How sampling works</Eyebrow>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-navy">Fair, recognised AQL sampling</h3>
            <p className="mt-4 leading-relaxed text-slate-600">
              We don&rsquo;t open every box. We use ISO 2859-1 acceptance sampling, the method used across the
              industry, to pick a random sample sized to your order. You set how strict the limits are for critical,
              major and minor defects, and the result tells you whether the order meets them.
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 text-sm">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Order size</th>
                    <th className="px-4 py-2.5 font-medium">Units inspected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {[
                    ["501 to 1,200", "80"],
                    ["1,201 to 3,200", "125"],
                    ["3,201 to 10,000", "200"],
                    ["10,001 to 35,000", "315"],
                  ].map(([a, b]) => (
                    <tr key={a}>
                      <td className="px-4 py-2.5">{a}</td>
                      <td className="px-4 py-2.5">{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">General inspection level II, single sampling.</p>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-3 mb-10 text-3xl font-semibold tracking-tight text-navy">Product inspection FAQs</h2>
          <Faq
            items={[
              {
                q: "Which countries do you cover?",
                a: "We arrange factory inspections in the main sourcing countries for UK sellers, including China, India, Vietnam and Turkey, and we inspect goods on arrival anywhere in the UK. Tell us where your supplier is and we'll confirm.",
              },
              {
                q: "How much notice do you need?",
                a: "Ideally a week before goods are ready, but send your request as soon as you have a date and we'll do our best to fit it in.",
              },
              {
                q: "What happens if the order fails?",
                a: "You get a clear report showing exactly what failed, with photos, so you can ask your supplier to rework or replace before shipping. We can re-inspect once they've fixed it.",
              },
              {
                q: "Do I need to tell my supplier?",
                a: "Yes. We'll need the factory address and a contact, and we'll arrange the date with them directly so you don't have to.",
              },
            ]}
          />
        </div>
      </section>

      <CtaBand
        title="Production run coming up?"
        text="Founding clients get their first inspection at half price. Tell us about your order."
      />
    </>
  );
}
