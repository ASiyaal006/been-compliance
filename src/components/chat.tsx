"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

type ChatProps = {
  api?: string;
  className?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  emptyState?: string;
};

function messageText(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("");
}

export function Chat({
  api = "/api/chat",
  className = "",
  title = "Compliance assistant",
  description = "Ask questions about inspections, assets, and compliance workflows.",
  placeholder = "Ask about inspections, assets, or compliance…",
  emptyState = "Start a conversation with the compliance assistant.",
}: ChatProps) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ${className}`}
      aria-label={title}
    >
      <header className="shrink-0 border-b border-slate-200 px-4 py-3 md:px-5">
        <h2 className="text-sm font-semibold text-[#002147]">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-slate-muted">{description}</p> : null}
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-muted">{emptyState}</p>
        ) : (
          messages.map((message) => {
            const text = messageText(message.parts);
            if (!text) return null;

            const isUser = message.role === "user";

            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "bg-navy text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{text}</p>
                </div>
              </div>
            );
          })
        )}

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {error.message}
          </p>
        ) : null}
      </div>

      <form
        className="shrink-0 border-t border-slate-200 p-4 md:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = input.trim();
          if (!trimmed || isBusy) return;
          sendMessage({ text: trimmed });
          setInput("");
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            disabled={isBusy}
            placeholder={placeholder}
            className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#002147] outline-none ring-navy/20 placeholder:text-slate-400 focus:border-navy focus:ring-2 disabled:bg-slate-50"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 rounded-lg bg-navy px-3 py-2.5 text-sm font-medium text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
