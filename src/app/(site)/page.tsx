import Link from "next/link";
import { CheckItem, CtaBand, CtaButton, Eyebrow, Faq } from "@/components/site/site-chrome";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Eyebrow light>Independent inspection, UK based</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
              Know it&rsquo;s right before it ships. Know it&rsquo;s safe before you lift.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              We check consumer products at the factory for UK importers and online sellers, and carry out LOLER and
              PUWER thorough examinations on the equipment your team relies on every day.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <CtaButton href="/quote" variant="accent">
                Get a quote
              </CtaButton>
              <CtaButton href="#services" variant="ghostLight">
                See our services
              </CtaButton>
            </div>
            <ul className="mt-10 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
              <CheckItem light>Photo report within 24 hours</CheckItem>
              <CheckItem light>ISO 2859-1 (AQL) sampling</CheckItem>
              <CheckItem light>Online portal for every certificate</CheckItem>
              <CheckItem light>Reminders before anything falls due</CheckItem>
            </ul>
          </div>
          <HeroReportCard />
        </div>
      </section>

      {/* Two services */}
      <section id="services" className="scroll-mt-20 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <Eyebrow>What we do</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Two kinds of inspection, one standard of care
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Whether it&rsquo;s a container of goods leaving a factory or a vehicle lift in your workshop, you get a
              trained inspector, an honest verdict and a report you can act on.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <ServiceCard
              tag="For importers, Amazon and Shopify sellers"
              title="Consumer product inspections"
              text="We visit the factory before you pay the balance and check your goods against your spec, using recognised AQL sampling. Faults are found while you can still do something about them."
              points={[
                "Pre-shipment and during-production inspections",
                "Container loading checks",
                "UK arrival inspections at your warehouse or 3PL",
              ]}
              href="/services/product-inspections"
              icon={<BoxIcon />}
            />
            <ServiceCard
              tag="For garages, care homes, fleets and warehouses"
              title="LOLER and PUWER examinations"
              text="Lifting equipment must be thoroughly examined every 6 or 12 months by law. We examine it on site, report the same day, and remind you before the next one is due."
              points={[
                "Vehicle lifts, patient hoists and tail lifts",
                "Forklifts, chains, slings and lifting accessories",
                "PUWER inspections, PAT and load testing",
              ]}
              href="/services/loler-puwer"
              icon={<HookIcon />}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Book in minutes, not emails
            </h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              ["Tell us what you need", "Send a quick request with your product or equipment details. We reply with a fixed price."],
              ["We book the visit", "We agree a date with you or your supplier and send a qualified inspector."],
              ["Inspection on site", "We follow a set checklist, take photos and record every finding as we go."],
              ["Report and reminders", "Your report lands in your inbox and online portal, and we remind you before the next one."],
            ].map(([title, text], i) => (
              <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-5 font-semibold text-navy">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why us */}
      <section className="px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Eyebrow>Why Been Compliance</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Reports you can find, read and act on
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Most inspection firms still send a PDF and forget about you until the invoice. We built our own software,
              so every client gets more than a document.
            </p>
            <ul className="mt-8 space-y-4 text-[15px] text-slate-700">
              <CheckItem>
                <strong className="text-navy">Your own client portal.</strong> Every report and certificate in one place,
                downloadable any time.
              </CheckItem>
              <CheckItem>
                <strong className="text-navy">Automatic due-date reminders.</strong> We email you before an examination
                falls due, so nothing lapses.
              </CheckItem>
              <CheckItem>
                <strong className="text-navy">QR tags on your equipment.</strong> Scan any item to see its latest
                inspection status on the spot.
              </CheckItem>
              <CheckItem>
                <strong className="text-navy">Plain-English findings.</strong> Clear pass or fail, with photos and what to
                do next.
              </CheckItem>
            </ul>
          </div>
          <PortalPreview />
        </div>
      </section>

      {/* Founding client offer */}
      <section className="px-4 pb-20 sm:px-6 md:pb-24">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#f5b335]/40 bg-[#fff8eb] p-8 sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <Eyebrow>Founding client offer</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy">
                Join our first 20 clients and save
              </h2>
              <p className="mt-4 text-slate-700">
                We&rsquo;re a new firm building long-term relationships. Our first clients get a lower price in
                return for honest feedback and, if they&rsquo;re happy, a short review.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <OfferCard
                title="Product inspections"
                big="Half price"
                text="Your first inspection at half our standard rate."
              />
              <OfferCard
                title="LOLER and PUWER"
                big="40% off"
                text="Your first visit, with the same price held for 12 months."
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 px-4 py-20 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-3 mb-10 text-3xl font-semibold tracking-tight text-navy">Common questions</h2>
          <Faq
            items={[
              {
                q: "Are you UKAS accredited?",
                a: "Not yet. We are working towards UKAS accreditation to ISO/IEC 17020, the standard for inspection bodies, and we run our inspections to that standard today. We'll always be clear about what we hold.",
              },
              {
                q: "How quickly can you inspect?",
                a: "For product inspections we usually need a few working days' notice before goods are ready. For LOLER and PUWER we aim to visit within five working days, sooner if an examination is overdue.",
              },
              {
                q: "How much does an inspection cost?",
                a: "Product inspections are priced per inspector day. LOLER examinations are priced per item with a minimum visit charge. Tell us what you need and we'll send a fixed price, with no hidden extras.",
              },
              {
                q: "What do I receive afterwards?",
                a: "A clear written report with photos and a pass or fail verdict. For lifting equipment you get a report that meets LOLER Schedule 1, plus access to your online portal and automatic reminders.",
              },
            ]}
          />
          <p className="mt-6 text-sm text-slate-500">
            Something else? <Link href="/quote" className="font-medium text-navy underline">Ask us directly</Link>.
          </p>
        </div>
      </section>

      <div className="pt-20">
        <CtaBand
          title="Got an order shipping or an exam due?"
          text="Send us the details and we'll come back with a fixed price, usually within one working day."
        />
      </div>
    </>
  );
}

function ServiceCard({
  tag,
  title,
  text,
  points,
  href,
  icon,
}: {
  tag: string;
  title: string;
  text: string;
  points: string[];
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-lg sm:p-10"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-navy/5 text-navy">{icon}</div>
      <p className="mt-6 text-sm font-medium text-[#b7791f]">{tag}</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-navy">{title}</h3>
      <p className="mt-3 leading-relaxed text-slate-600">{text}</p>
      <ul className="mt-6 space-y-2.5 text-[15px] text-slate-700">
        {points.map((p) => (
          <CheckItem key={p}>{p}</CheckItem>
        ))}
      </ul>
      <span className="mt-8 text-sm font-semibold text-navy group-hover:underline">Learn more →</span>
    </Link>
  );
}

function OfferCard({ title, big, text }: { title: string; big: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-navy">{big}</p>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}

/** Illustrative product inspection summary, drawn in HTML. */
function HeroReportCard() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Pre-shipment inspection</p>
            <p className="mt-1 font-semibold text-navy">Stainless steel cookware set</p>
            <p className="text-sm text-slate-500">Order quantity 3,200 · Sample 125</p>
          </div>
          <span className="rounded-full bg-success-bg px-3 py-1 text-xs font-semibold text-success">PASS</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Critical", "0", "0"],
            ["Major", "2", "7"],
            ["Minor", "5", "10"],
          ].map(([label, found, allowed]) => (
            <div key={label} className="rounded-lg bg-slate-50 py-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-semibold text-navy">
                {found}
                <span className="text-sm font-normal text-slate-400"> / {allowed}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-2.5 text-sm">
          {[
            ["Packaging and labelling", true],
            ["Dimensions and weight", true],
            ["Function and safety tests", true],
            ["Workmanship", true],
          ].map(([label]) => (
            <div key={label as string} className="flex items-center justify-between">
              <span className="text-slate-600">{label}</span>
              <span className="font-medium text-success">Conforms</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-md bg-gradient-to-br from-slate-100 to-slate-200" />
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">AQL II · Major 2.5 · Minor 4.0 · 24 photos attached</p>
      </div>
      <div className="absolute -top-5 -left-6 hidden rounded-xl bg-white px-4 py-3 shadow-xl ring-1 ring-black/5 sm:block">
        <p className="text-xs text-slate-500">Report delivered</p>
        <p className="text-sm font-semibold text-navy">Same day</p>
      </div>
    </div>
  );
}

/** Illustrative view of the client portal's equipment list. */
function PortalPreview() {
  const rows: [string, string, string, string][] = [
    ["Two-post vehicle lift", "Bay 1", "Due in 142 days", "ok"],
    ["Engine crane 1 t", "Workshop", "Due in 21 days", "soon"],
    ["Transmission jack", "Bay 3", "Due in 188 days", "ok"],
    ["Chain sling 2-leg", "Stores", "Overdue", "late"],
  ];
  const tone = {
    ok: "bg-success-bg text-success",
    soon: "bg-amber-bg text-amber",
    late: "bg-danger-bg text-danger",
  } as const;
  return (
    <div className="rounded-3xl bg-slate-100 p-4 sm:p-6">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="font-semibold text-navy">Your equipment</p>
          <span className="text-xs text-slate-400">Client portal</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {rows.map(([name, place, due, status]) => (
            <li key={name} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-slate-800">{name}</p>
                <p className="text-xs text-slate-500">{place}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tone[status as keyof typeof tone]}`}>
                {due}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 rounded-xl bg-white px-5 py-4 text-sm shadow-sm ring-1 ring-black/5">
        <p className="font-medium text-navy">Reminder sent</p>
        <p className="mt-0.5 text-slate-500">Engine crane 1 t is due its LOLER examination in 21 days.</p>
      </div>
    </div>
  );
}

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M21 7.5 12 3 3 7.5m18 0-9 4.5m9-4.5v9L12 21m0-9L3 7.5m9 4.5v9M3 7.5v9L12 21" strokeLinejoin="round" />
    </svg>
  );
}

function HookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M9 3h6M12 3v8m0 0a4 4 0 1 1-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
