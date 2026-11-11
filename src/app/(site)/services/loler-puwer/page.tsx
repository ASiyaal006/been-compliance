import type { Metadata } from "next";
import { CheckItem, CtaBand, CtaButton, Eyebrow, Faq } from "@/components/site/site-chrome";

export const metadata: Metadata = {
  title: "LOLER and PUWER thorough examinations",
  description:
    "LOLER thorough examinations, PUWER inspections, PAT and load testing for garages, care homes, fleets, warehouses and hire shops. Same-day reports and automatic reminders.",
};

const WHO = [
  ["Garages and MOT centres", "Vehicle lifts, jacks, engine cranes", "Every 12 months"],
  ["Care homes and home care", "Patient hoists, slings, bath lifts", "Every 6 months"],
  ["Fleets and delivery firms", "Van and lorry tail lifts", "Every 6 months"],
  ["Warehouses and manufacturers", "Forklifts, hoists, chains, slings", "Every 6 to 12 months"],
  ["Farms and contractors", "Telehandlers, loaders, bale handlers", "Every 6 to 12 months"],
  ["Builders and scaffolders", "Gin wheels, hoists, lifting accessories", "Every 6 months"],
  ["Tool and plant hire", "Lifting kit hired out to customers", "Every 6 to 12 months"],
];

const SERVICES = [
  {
    title: "LOLER thorough examination",
    text: "A detailed examination of lifting equipment and accessories by a competent person, as required by the Lifting Operations and Lifting Equipment Regulations 1998. You get a report that meets Schedule 1.",
  },
  {
    title: "PUWER inspection",
    text: "Inspection of work equipment such as machinery, power tools and workshop kit under the Provision and Use of Work Equipment Regulations 1998, so it stays safe to use.",
  },
  {
    title: "Electrical testing (PAT)",
    text: "Portable appliance testing for the tools and equipment on your site, recorded alongside everything else in your portal.",
  },
  {
    title: "Load testing",
    text: "Proof load tests where the examiner needs one, for example after a repair or modification, or before first use.",
  },
];

export default function LolerPuwerPage() {
  return (
    <>
      <section className="bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Eyebrow>LOLER and PUWER</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-navy sm:text-5xl">
              Lifting equipment examined, reported and never forgotten
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              If your business lifts goods or people, the law says that equipment must be thoroughly examined at set
              intervals. We examine it on site, report the same day, and remind you well before the next one is due.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <CtaButton href="/quote?service=loler">Book an examination</CtaButton>
              <CtaButton href="#who" variant="ghost">
                Does this apply to me?
              </CtaButton>
            </div>
          </div>
          <div className="rounded-3xl bg-navy p-8 text-white">
            <p className="text-sm font-medium text-[#f5b335]">What you get with every visit</p>
            <ul className="mt-5 space-y-4 text-[15px] text-slate-200">
              <CheckItem light>A competent engineer on site at a time that suits you</CheckItem>
              <CheckItem light>A written report for every item, the same day</CheckItem>
              <CheckItem light>A QR tag on each item showing its current status</CheckItem>
              <CheckItem light>An online portal with every certificate, plus email reminders before each due date</CheckItem>
            </ul>
          </div>
        </div>
      </section>

      <section id="who" className="scroll-mt-20 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>Who needs it</Eyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            More businesses need LOLER than realise it
          </h2>
          <p className="mt-4 max-w-2xl text-slate-600">
            Equipment that lifts people, and lifting accessories such as chains and slings, must be examined at least
            every 6 months. Other lifting equipment needs it at least every 12 months, or as your written scheme of
            examination says.
          </p>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Business</th>
                  <th className="px-5 py-3 font-medium">Typical equipment</th>
                  <th className="px-5 py-3 font-medium">How often</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WHO.map(([biz, kit, freq]) => (
                  <tr key={biz}>
                    <td className="px-5 py-3.5 font-medium text-navy">{biz}</td>
                    <td className="px-5 py-3.5 text-slate-600">{kit}</td>
                    <td className="px-5 py-3.5 text-slate-600">{freq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-20 bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>Our services</Eyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
            Everything in one visit, one portal
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-7">
                <h3 className="text-lg font-semibold text-navy">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-3 mb-10 text-3xl font-semibold tracking-tight text-navy">LOLER and PUWER FAQs</h2>
          <Faq
            items={[
              {
                q: "My last examination has lapsed. What should I do?",
                a: "Get in touch straight away. Using lifting equipment without a current thorough examination can put you in breach of LOLER and may affect your insurance. We prioritise overdue equipment.",
              },
              {
                q: "Is a thorough examination the same as a service?",
                a: "No. A service is maintenance. A thorough examination is an independent check by a competent person that the equipment is safe to keep using, and it produces a legal report. Many firms need both.",
              },
              {
                q: "What happens if something fails?",
                a: "We tell you on the day and explain why. If there is a dangerous defect, the law requires us to report it to you straight away, and in some cases to the enforcing authority. Your report says exactly what needs fixing.",
              },
              {
                q: "How is it priced?",
                a: "Per item, with a minimum visit charge. Tell us roughly what equipment you have and we'll send a fixed price. Founding clients get 40% off their first visit, with the price held for 12 months.",
              },
            ]}
          />
        </div>
      </section>

      <CtaBand
        title="Got an examination due?"
        text="Tell us roughly what you have and where, and we'll send a fixed price."
      />
    </>
  );
}
