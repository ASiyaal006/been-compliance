"use client";

import type { RefObject } from "react";
import { ACCEPTED_FILE_TYPES } from "@/components/zero-touch/constants";

type UploadZoneProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  dragActive: boolean;
  processing: boolean;
  onDragActiveChange: (active: boolean) => void;
  onFileSelect: (file: File) => void;
  children: React.ReactNode;
};

export function UploadZone({
  inputRef,
  dragActive,
  processing,
  onDragActiveChange,
  onFileSelect,
  children,
}: UploadZoneProps) {
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    onDragActiveChange(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragActiveChange(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragActiveChange(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onDragActiveChange(false);
        }
      }}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex min-h-[10rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
        dragActive
          ? "border-navy bg-navy/5 shadow-inner"
          : "border-slate-200 bg-slate-50/80 hover:border-navy/40 hover:bg-white"
      } ${processing ? "pointer-events-none opacity-80" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
      />
      {children}
    </div>
  );
}

export function UploadZoneIdleContent() {
  return (
    <>
      <span className="mb-3 flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
        <svg className="size-6 text-navy" aria-hidden fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
      </span>
      <p className="text-sm font-semibold text-[#002147]">Drag &amp; drop a document here</p>
      <p className="mt-1 text-xs text-slate-muted">or click to browse · PDF, JPG, PNG, WebP</p>
    </>
  );
}
