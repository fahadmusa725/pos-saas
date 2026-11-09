// Currency amounts are shown with at most 2 decimals and no trailing zeros:
// 36990 -> "36,990", 36990.5 -> "36,990.5", 36990.0000001 -> "36,990".
export default function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
