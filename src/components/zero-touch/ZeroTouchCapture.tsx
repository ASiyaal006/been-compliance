"use client";

import { useEffect, useState } from "react";
import { ParsedDocumentReviewForm } from "@/components/zero-touch/ParsedDocumentReviewForm";
import { ProcessingStatus } from "@/components/zero-touch/ProcessingStatus";
import { UploadZone, UploadZoneIdleContent } from "@/components/zero-touch/UploadZone";
import type { useZeroTouchUpload } from "@/components/zero-touch/use-zero-touch-upload";

type ZeroTouchCaptureProps = {
  upload: ReturnType<typeof useZeroTouchUpload>;
  persistCertificate?: boolean;
};

export function ZeroTouchCapture({ upload, persistCertificate = false }: ZeroTouchCaptureProps) {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (upload.processing) setSavedMessage(null);
  }, [upload.processing]);

  useEffect(() => {
    if (!savedMessage) return;
    const timer = window.setTimeout(() => setSavedMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  if (upload.parsed) {
    return (
      <ParsedDocumentReviewForm
        data={upload.parsed}
        filename={upload.filename}
        onApprove={upload.approve}
        onCancel={upload.clearParsed}
        persistCertificate={persistCertificate}
        onPersisted={() => {
          upload.clearParsed();
          setSavedMessage("Certificate saved.");
        }}
      />
    );
  }

  return (
    <div>
      {savedMessage ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {savedMessage}
        </p>
      ) : null}
      <UploadZone
        inputRef={upload.inputRef}
        dragActive={upload.dragActive}
        processing={upload.processing}
        onDragActiveChange={upload.setDragActive}
        onFileSelect={(file) => void upload.processFile(file)}
      >
        {upload.processing ? <ProcessingStatus /> : <UploadZoneIdleContent />}
      </UploadZone>

      {upload.error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {upload.error}
        </p>
      ) : null}
    </div>
  );
}
