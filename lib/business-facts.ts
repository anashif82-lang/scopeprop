import type { StructuredProposal, TimelineStep } from "@/lib/proposal-structured";
import type { PaymentMilestone } from "@/lib/payments";

export type BusinessFacts = {
  service: string;
  scopeSummary: string;
  deliverables: [string, string, string, string, string];
  currency: string;
  price: number;
  validDays: number;
  timelineWeeks: number;
  payments: PaymentMilestone[];
  clientName: string;
  company: string;
};

export function formatMoney(amount: number, currency: string): string {
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function buildTimelinePhases(weeks: number): TimelineStep[] {
  const w = Math.max(1, Math.round(weeks));
  const segments = [0.15, 0.25, 0.35, 0.15, 0.1];
  const wks: number[] = [];
  let allocated = 0;
  for (let i = 0; i < 5; i++) {
    const ww =
      i === 4
        ? Math.max(1, w - allocated)
        : Math.max(1, Math.round(w * segments[i]!));
    wks.push(ww);
    allocated += ww;
  }
  const diff = w - wks.reduce((a, b) => a + b, 0);
  wks[4] = wks[4]! + diff;

  return [
    {
      week: "Phase 1",
      task: `Discovery, scope & kickoff (${wks[0]} wk)`,
    },
    {
      week: "Phase 2",
      task: `Design & feedback (${wks[1]} wk)`,
    },
    {
      week: "Phase 3",
      task: `Build & integration (${wks[2]} wk)`,
    },
    {
      week: "Phase 4",
      task: `QA, revisions & prep (${wks[3]} wk)`,
    },
    {
      week: "Phase 5",
      task: `Launch & handoff (${wks[4]} wk)`,
    },
  ];
}

export function paymentTermsToStrings(
  payments: PaymentMilestone[],
  currency: string,
  fallbackPrice: number
): [string, string, string] {
  const fmt = (m: PaymentMilestone) =>
    `${m.label}: ${formatMoney(m.amount, currency)}`;
  const lines = payments.map(fmt);
  if (lines.length >= 3) {
    return [lines[0]!, lines[1]!, lines[2]!];
  }
  if (lines.length === 2) {
    return [
      lines[0]!,
      lines[1]!,
      `Total: ${formatMoney(fallbackPrice, currency)}`,
    ];
  }
  if (lines.length === 1) {
    return [
      lines[0]!,
      "Due per schedule in this proposal",
      `Total: ${formatMoney(fallbackPrice, currency)}`,
    ];
  }
  return [
    `Total: ${formatMoney(fallbackPrice, currency)}`,
    "Per milestone schedule",
    "Taxes as applicable",
  ];
}

export function mergeBusinessIntoProposal(
  ai: StructuredProposal,
  business: BusinessFacts
): StructuredProposal {
  const deliverables = business.deliverables.map((d) => d.trim());
  const terms = paymentTermsToStrings(
    business.payments,
    business.currency,
    business.price
  );

  return {
    ...ai,
    deliverables,
    price: formatMoney(business.price, business.currency),
    paymentTerms: [...terms],
    validDays: business.validDays,
    timeline: buildTimelinePhases(business.timelineWeeks),
  };
}
