export function formatCryptoPrice(price: number): string {
  if (price === null || price === undefined) return "-";
  if (!isFinite(price)) return "-";
  if (price === 0) return "0";

  const sign = price < 0 ? "-" : "";
  const abs = Math.abs(price);

  if (abs >= 0.01) {
    if (abs >= 1000) {
      return sign + abs.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return sign + abs.toFixed(2);
  }
  const fixed = abs.toFixed(12);

  const match = fixed.match(/^0\.0+/);

  if (!match) {
    return sign + abs.toFixed(6);
  }

  const zeroCount = match[0].length - 2;

  let significant = fixed.slice(match[0].length);

 significant = significant.replace(/0+$/, "");

  if (!significant) significant = "0";

  return `${sign}0.0(${zeroCount})${significant}`;
}