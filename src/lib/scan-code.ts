const UUID_IN_TEXT =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Pulls an asset UUID out of a scanned code. Works for a bare UUID and for the
 * public tag URLs we already print (…/public/asset/<uuid>).
 */
export function extractAssetUuid(text: string): string | null {
  const match = UUID_IN_TEXT.exec(text);
  return match ? match[0].toLowerCase() : null;
}
