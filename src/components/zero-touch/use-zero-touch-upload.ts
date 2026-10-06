"use client";

import { useCallback, useRef, useState } from "react";
import { ACCEPTED_FILE_TYPES, type ZeroTouchUploadState } from "@/components/zero-touch/constants";
import { parsedDocumentSchema, type ParsedDocumentData } from "@/lib/types/parsed-document";

export type ApproveParsedResult = { ok: true } | { ok: false; error: string };

export function useZeroTouchUpload(onParsed?: (data: ParsedDocumentData) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [state, setState] = useState<ZeroTouchUploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedDocumentData | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type as (typeof ACCEPTED_FILE_TYPES)[number])) {
        setState("error");
        setError("Upload a JPEG, PNG, WebP, GIF, or PDF certificate.");
        setParsed(null);
        return;
      }

      setState("processing");
      setError(null);
      setParsed(null);
      setFilename(file.name);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/parse-document", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as {
          data?: ParsedDocumentData;
          error?: string;
        };

        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "Document parsing failed.");
        }

        setParsed(payload.data);
        setState("success");
      } catch (e) {
        setState("error");
        setError(e instanceof Error ? e.message : "Document parsing failed.");
      }
    },
    [],
  );

  const clearParsed = useCallback(() => {
    setParsed(null);
    setFilename(null);
    setError(null);
    setState("idle");
    setDragActive(false);
  }, []);

  const approve = useCallback(
    (data: ParsedDocumentData): ApproveParsedResult => {
      const result = parsedDocumentSchema.safeParse(data);
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? "Check the extracted fields.";
        setError(message);
        return { ok: false, error: message };
      }

      setParsed(result.data);
      setError(null);
      setState("success");
      onParsed?.(result.data);
      return { ok: true };
    },
    [onParsed],
  );

  return {
    inputRef,
    dragActive,
    setDragActive,
    state,
    error,
    parsed,
    filename,
    processFile,
    processing: state === "processing",
    clearParsed,
    approve,
  };
}
