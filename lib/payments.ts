export type PaymentPreset = "100" | "50_50" | "40_30_30" | "custom";

export type PaymentMilestone = { label: string; amount: number };

export type CustomPaymentRow = { label: string; percent: number };

function distributeAmounts(price: number, percents: number[]): number[] {
  if (percents.length === 0) return [];
  const n = percents.length;
  const raw = percents.map((p) =>
    Math.round(((price * p) / 100) * 100) / 100
  );
  const sum = raw.reduce((a, b) => a + b, 0);
  const diff = Math.round((price - sum) * 100) / 100;
  raw[n - 1] = Math.round((raw[n - 1]! + diff) * 100) / 100;
  return raw;
}

export function buildPaymentsFromPreset(
  price: number,
  preset: PaymentPreset,
  custom: CustomPaymentRow[]
): PaymentMilestone[] {
  if (price <= 0 || !Number.isFinite(price)) return [];

  if (preset === "100") {
    return [{ label: "Total", amount: price }];
  }
  if (preset === "50_50") {
    const amounts = distributeAmounts(price, [50, 50]);
    return [
      { label: "Deposit", amount: amounts[0]! },
      { label: "Final", amount: amounts[1]! },
    ];
  }
  if (preset === "40_30_30") {
    const amounts = distributeAmounts(price, [40, 30, 30]);
    return [
      { label: "Kickoff", amount: amounts[0]! },
      { label: "Mid-project", amount: amounts[1]! },
      { label: "Final", amount: amounts[2]! },
    ];
  }
  const percents = custom.map((c) => c.percent);
  const amounts = distributeAmounts(price, percents);
  return custom.map((c, i) => ({
    label: c.label.trim() || `Milestone ${i + 1}`,
    amount: amounts[i]!,
  }));
}

export function sumPercents(rows: CustomPaymentRow[]): number {
  return rows.reduce((s, r) => s + r.percent, 0);
}
