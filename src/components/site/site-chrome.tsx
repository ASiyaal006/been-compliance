import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/services/product-inspections", label: "Product inspections" },
  { href: "/services/loler-puwer", label: "LOLER & PUWER" },
  { href: "/about", label: "About" },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Been Compliance home">
      <span
        className={`flex size-9 items-center justify-center rounded-lg text-base font-bold ${
          light ? "bg-white text-navy" : "bg-navy text-white"
        }`}
      >
        B
      </span>
      <span className={`text-[17px] font-semibold tracking-tight ${light ? "text-white" : "text-navy"}`}>
        Been Compliance
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-700 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-navy">
              {n.label}
            </Link>
          ))}
          <Link href="/login" className="text-slate-500 hover:text-navy">
            Client login
          </Link>
          <CtaButton href="/quote" size="sm">
            Get a quote
          </CtaButton>
        </nav>
        {/* Mobile menu: a details element, so it works without JavaScript. */}
        <details className="group relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-navy [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                {n.label}
              </Link>
            ))}
            <Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
              Client login
            </Link>
            <Link
              href="/quote"
              className="mt-1 block rounded-lg bg-navy px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get a quote
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Independent inspections for the goods UK businesses import and the equipment they lift with. Clear
            reports, fast, and every certificate kept online.
          </p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500">
            We are working towards UKAS accreditation to ISO/IEC 17020. We do not currently hold UKAS accreditation.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Services</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/services/product-inspections" className="hover:text-white">Pre-shipment inspections</Link></li>
            <li><Link href="/services/product-inspections#services" className="hover:text-white">Factory and production checks</Link></li>
            <li><Link href="/services/loler-puwer" className="hover:text-white">LOLER thorough examinations</Link></li>
            <li><Link href="/services/loler-puwer#services" className="hover:text-white">PUWER, PAT and load testing</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Company</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-white">About us</Link></li>
            <li><Link href="/quote" className="hover:text-white">Request a quote</Link></li>
            <li><Link href="/login" className="hover:text-white">Client login</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy notice</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-500 sm:px-6">
          © {year} Been Compliance. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function CtaButton({
  href,
  children,
  variant = "primary",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "accent" | "ghost" | "ghostLight";
  size?: "sm" | "md";
}) {
  const sizes = size === "sm" ? "px-4 py-2 text-sm" : "px-5 py-3 text-[15px]";
  const variants = {
    primary: "bg-navy text-white hover:bg-navy-700",
    accent: "bg-[#f5b335] text-navy hover:bg-[#f7c25c]",
    ghost: "border border-slate-300 text-navy hover:border-navy",
    ghostLight: "border border-white/30 text-white hover:border-white hover:bg-white/5",
  };
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ${sizes} ${variants[variant]}`}
    >
      {children}
    </Link>
  );
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${light ? "text-[#f5b335]" : "text-[#b7791f]"}`}>
      {children}
    </p>
  );
}

export function CheckItem({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <li className="flex gap-3">
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className={`mt-0.5 size-5 shrink-0 ${light ? "text-[#f5b335]" : "text-success"}`}
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.24 4.5-1.73-1.73a.75.75 0 1 0-1.06 1.06l2.35 2.35a.75.75 0 0 0 1.14-.09l3.76-5.21Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </li>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-navy [&::-webkit-details-marker]:hidden">
            {item.q}
            <span className="text-xl leading-none text-slate-400 transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ title, text }: { title: string; text: string }) {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-navy px-8 py-12 sm:px-12 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-xl text-slate-300">{text}</p>
        </div>
        <CtaButton href="/quote" variant="accent">
          Get a quote
        </CtaButton>
      </div>
    </section>
  );
}
