export const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export type ZeroTouchUploadState = "idle" | "processing" | "success" | "error";
