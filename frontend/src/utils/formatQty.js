// Stock quantities are stored with at most 3 decimals. Display them without
// float noise or trailing zeros: 20 -> "20", 0.1 -> "0.1", 12.000000000000005 -> "12".
export default function formatQty(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return String(Number(num.toFixed(3)));
}
