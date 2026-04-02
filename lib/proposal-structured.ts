export type TimelineStep = { week: string; task: string };

export type StructuredProposal = {
  title: string;
  subtitle: string;
  understood: string[];
  solution: string;
  deliverables: string[];
  timeline: TimelineStep[];
  price: string;
  paymentTerms: string[];
  whyUs: string[];
  nextSteps: string[];
  validDays: number;
};

export type ProposalStoragePayload = {
  document: StructuredProposal;
  clientName: string;
  company: string;
  preparedAt: string;
};

export function parseAnthropicJsonText(raw: string): unknown {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im;
  const m = t.match(fence);
  if (m) t = m[1].trim();
  return JSON.parse(t) as unknown;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown, minLen: number): v is string[] {
  return (
    Array.isArray(v) &&
    v.length >= minLen &&
    v.every((x) => typeof x === "string")
  );
}

function isTimelineArray(v: unknown, minLen: number): v is TimelineStep[] {
  if (!Array.isArray(v) || v.length < minLen) return false;
  return v.every(
    (x) =>
      x &&
      typeof x === "object" &&
      isNonEmptyString((x as TimelineStep).week) &&
      isNonEmptyString((x as TimelineStep).task)
  );
}

export function coerceStructuredProposal(o: unknown): StructuredProposal | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  if (!isNonEmptyString(r.title)) return null;
  if (!isNonEmptyString(r.subtitle)) return null;
  if (!isStringArray(r.understood, 4)) return null;
  if (!isNonEmptyString(r.solution)) return null;
  if (!isStringArray(r.deliverables, 5)) return null;
  if (!isTimelineArray(r.timeline, 5)) return null;
  if (!isNonEmptyString(r.price)) return null;
  if (!isStringArray(r.paymentTerms, 3)) return null;
  if (!isStringArray(r.whyUs, 3)) return null;
  if (!isStringArray(r.nextSteps, 4)) return null;
  const validDays = r.validDays;
  if (typeof validDays !== "number" || !Number.isFinite(validDays) || validDays < 1) {
    return null;
  }
  return {
    title: r.title.trim(),
    subtitle: r.subtitle.trim(),
    understood: (r.understood as string[]).map((s) => s.trim()),
    solution: r.solution.trim(),
    deliverables: (r.deliverables as string[]).map((s) => s.trim()),
    timeline: r.timeline as TimelineStep[],
    price: r.price.trim(),
    paymentTerms: (r.paymentTerms as string[]).map((s) => s.trim()),
    whyUs: (r.whyUs as string[]).map((s) => s.trim()),
    nextSteps: (r.nextSteps as string[]).map((s) => s.trim()),
    validDays: Math.round(validDays),
  };
}
