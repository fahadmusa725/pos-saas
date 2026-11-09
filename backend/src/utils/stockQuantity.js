// Stock quantities are kept at 3 decimals. Fractional recipe deductions used to
// leave float noise behind (0.09999999999999998) because $inc added raw doubles.
const STOCK_DECIMALS = 3;
const DECIMAL_FACTOR = 10 ** STOCK_DECIMALS;

// True when a value fits in a stock quantity, e.g. 0.125 -> true, 0.0001 -> false
const hasAtMostThreeDecimals = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return false;
  return Math.abs(num * DECIMAL_FACTOR - Math.round(num * DECIMAL_FACTOR)) < 1e-9;
};

// Aggregation expression for `currentStock + delta`, rounded in the same atomic
// write. Pass it as a pipeline update together with `{ updatePipeline: true }`
// (required by Mongoose 9), so the conditional filter (e.g. currentStock >=
// amount) still guards the change on MongoDB 4.2+.
const stockAfterDelta = (delta) => ({
  $round: [{ $add: [{ $ifNull: ['$currentStock', 0] }, delta] }, STOCK_DECIMALS],
});

module.exports = { hasAtMostThreeDecimals, stockAfterDelta };
