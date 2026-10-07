/** Private Supabase Storage bucket holding original certificate files. */
export const CERTIFICATE_FILES_BUCKET = "certificates";

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Storage path for a new upload: "<user id>/<random id>.<ext>". */
export function certificateFilePath(userId: string, mimeType: string): string {
  return `${userId}/${crypto.randomUUID()}.${EXTENSIONS[mimeType] ?? "bin"}`;
}

/** True when the path sits in this user's folder and has the shape we create. */
export function isOwnCertificateFilePath(path: string, userId: string): boolean {
  return new RegExp(`^${userId}/[0-9a-f-]{36}\\.(pdf|jpg|png|webp|gif|bin)$`, "i").test(path);
}
