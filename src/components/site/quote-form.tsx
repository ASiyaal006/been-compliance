"use client";

import { useActionState, useState } from "react";
import { submitQuote, type QuoteState } from "@/actions/quote";
import { PRODUCT_SERVICES, QUOTE_SERVICES, type QuoteService } from "@/lib/marketing";

const input =
  "mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15";
const label = "block text-sm font-medium text-slate-700";

export function QuoteForm({ initialService }: { initialService?: string }) {
  const valid = QUOTE_SERVICES.some((s) => s.value === initialService);
  const [service, setService] = useState<QuoteService>(valid ? (initialService as QuoteService) : "pre-shipment");
  const [state, action, pending] = useActionState<QuoteState, FormData>(submitQuote, { status: "idle" });
  const [startedAt] = useState(() => Date.now());
  const isProduct = PRODUCT_SERVICES.includes(service);

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-success/20 bg-success-bg p-8">
        <h2 className="text-xl font-semibold text-success">Thanks, your request is on its way</h2>
        <p className="mt-2 text-slate-700">
          We&rsquo;ve sent a confirmation to your email. We&rsquo;ll come back to you with a fixed price, usually within
          one working day.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="started_at" value={startedAt} />
      {/* Hidden from people; bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="service" className={label}>
          What do you need?
        </label>
        <select
          id="service"
          name="service"
          value={service}
          onChange={(e) => setService(e.target.value as QuoteService)}
          className={input}
        >
          <optgroup label="Product inspections">
            {QUOTE_SERVICES.filter((s) => PRODUCT_SERVICES.includes(s.value)).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Equipment inspections">
            {QUOTE_SERVICES.filter((s) => !PRODUCT_SERVICES.includes(s.value)).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>
            Your name
          </label>
          <input id="name" name="name" required autoComplete="name" className={input} />
        </div>
        <div>
          <label htmlFor="company" className={label}>
            Company <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="company" name="company" autoComplete="organization" className={input} />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>
            Phone <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={input} />
        </div>
        <div>
          <label htmlFor="location" className={label}>
            {isProduct ? "Factory location (city, country)" : "Site postcode or town"}
          </label>
          <input
            id="location"
            name="location"
            placeholder={isProduct ? "e.g. Ningbo, China" : "e.g. B12 0AA"}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="quantity" className={label}>
            {isProduct ? "Order quantity" : "Roughly how many items?"}
          </label>
          <input
            id="quantity"
            name="quantity"
            placeholder={isProduct ? "e.g. 3,000 units" : "e.g. 2 vehicle lifts, 6 slings"}
            className={input}
          />
        </div>
      </div>

      <div>
        <label htmlFor="timing" className={label}>
          {isProduct ? "When will goods be ready?" : "When is it due?"}
        </label>
        <input
          id="timing"
          name="timing"
          placeholder={isProduct ? "e.g. around 20 January" : "e.g. next month, or overdue"}
          className={input}
        />
      </div>

      <div>
        <label htmlFor="details" className={label}>
          Tell us more
        </label>
        <textarea
          id="details"
          name="details"
          required
          rows={5}
          placeholder={
            isProduct
              ? "What's the product, and is there anything you're especially worried about?"
              : "What equipment do you have, and is there anything we should know about the site?"
          }
          className={input}
        />
      </div>

      {state.status === "error" ? (
        <p className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-navy px-5 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Send request"}
      </button>
      <p className="text-xs text-slate-500">
        We only use your details to reply to this request. See our{" "}
        <a href="/privacy" className="underline">
          privacy notice
        </a>
        .
      </p>
    </form>
  );
}
