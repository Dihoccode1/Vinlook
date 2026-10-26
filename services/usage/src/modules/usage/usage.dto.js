export const isoTimestamp = (value) => (value === null ? null : new Date(value).toISOString());
export function playbackReceiptDto(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      ['acceptedAt', 'endedAt'].includes(key) ? isoTimestamp(value) : value,
    ]),
  );
}
