/** Opens the recorded start location in Google Maps. */
export function mapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/** "51.50740, -0.12780 (±12 m)" */
export function formatLocation(latitude: number, longitude: number, accuracyM: number | null): string {
  const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  return accuracyM === null ? coords : `${coords} (±${Math.round(accuracyM).toLocaleString("en-GB")} m)`;
}
