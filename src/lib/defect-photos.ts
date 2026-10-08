/** Private Supabase Storage bucket holding defect photos. */
export const DEFECT_PHOTOS_BUCKET = "defect-photos";

export const DEFECT_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isDefectPhotoType(mimeType: string): boolean {
  return mimeType in EXTENSIONS;
}

/** Storage path for a new photo: "<user id>/<order id>/<random id>.<ext>". */
export function defectPhotoPath(userId: string, orderId: string, mimeType: string): string {
  return `${userId}/${orderId}/${crypto.randomUUID()}.${EXTENSIONS[mimeType] ?? "jpg"}`;
}

/** True when the path sits in this user's folder for this order and has the shape we create. */
export function isOwnDefectPhotoPath(path: string, userId: string, orderId: string): boolean {
  return new RegExp(`^${userId}/${orderId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`, "i").test(path);
}
