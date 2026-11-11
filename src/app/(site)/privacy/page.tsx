import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How Been Compliance uses the personal information you give us.",
};

export default function PrivacyPage() {
  return (
    <section className="px-4 py-16 sm:px-6 md:py-20">
      <div className="mx-auto max-w-3xl space-y-5 text-[16px] leading-relaxed text-slate-700">
        <h1 className="text-4xl font-semibold tracking-tight text-navy">Privacy notice</h1>
        <p>
          This notice explains how Been Compliance uses personal information collected through this website. We are
          the data controller for that information.
        </p>
        <h2 className="pt-4 text-xl font-semibold text-navy">What we collect</h2>
        <p>
          When you request a quote we collect the details you enter: your name, company, email address, phone number,
          location and the information you give about your products or equipment. If you become a client, we also hold
          the inspection records, reports and contact details needed to provide our services and client portal.
        </p>
        <h2 className="pt-4 text-xl font-semibold text-navy">How we use it</h2>
        <p>
          We use your details to reply to your enquiry, prepare a quote, carry out and report on inspections, and send
          you reminders about upcoming examinations. Our lawful basis is taking steps at your request before entering a
          contract, performing that contract, and our legitimate interest in running our business. We do not sell your
          information or use it for unrelated marketing.
        </p>
        <h2 className="pt-4 text-xl font-semibold text-navy">Who we share it with</h2>
        <p>
          We use trusted service providers to run this website, store data and send email. They process data only on
          our instructions. Where an inspection requires it, we share the necessary details with the inspector who
          carries it out and, for product inspections, with your supplier to arrange the visit.
        </p>
        <h2 className="pt-4 text-xl font-semibold text-navy">How long we keep it</h2>
        <p>
          We keep enquiries that don&rsquo;t lead to work for up to 12 months. We keep inspection records for as long as
          the law requires, for example LOLER reports must be kept for at least two years, and for as long as you use
          our client portal.
        </p>
        <h2 className="pt-4 text-xl font-semibold text-navy">Your rights</h2>
        <p>
          You can ask to see, correct or delete the personal information we hold about you, or object to how we use
          it, by replying to any email from us. If you are unhappy with how we have handled your information, you can
          complain to the Information Commissioner&rsquo;s Office at ico.org.uk.
        </p>
      </div>
    </section>
  );
}
