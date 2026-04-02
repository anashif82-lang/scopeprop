import { NextRequest, NextResponse } from "next/server";
import {
  mergeBusinessIntoProposal,
  type BusinessFacts,
} from "@/lib/business-facts";
import {
  isFreelancerProfileComplete,
  type FreelancerProfile,
} from "@/lib/freelancer-profile";
import {
  coerceStructuredProposal,
  parseAnthropicJsonText,
} from "@/lib/proposal-structured";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT_BASE = `You are ScopeProp, a senior proposal copywriter for freelancers and agencies.

You will receive BUSINESS_FACTS and STRATEGY_AND_BRIEF as JSON in the user message.

Hard rules:
- NEVER invent or change: price, currency, payment amounts, deliverable line items, timeline dates/week counts, validity days, or client/freelancer contact details. Those are ONLY in BUSINESS_FACTS and are read-only.
- You MAY write persuasive narrative fields: title, subtitle, understood, solution, whyUs, nextSteps.
- For fields that mirror BUSINESS_FACTS (deliverables, price string, paymentTerms, timeline array, validDays), you must OUTPUT placeholders that match the schema, but the server will overwrite them from BUSINESS_FACTS. Still output syntactically valid values: use deliverables from BUSINESS_FACTS verbatim, and approximate price/timeline text consistent with BUSINESS_FACTS.

Output ONLY a single JSON object. No markdown, no code fences, no text before or after.

Required keys (exactly):
"title", "subtitle" (use \\n once for two short lines), "understood" (4 strings), "solution" (2-3 sentences), "deliverables" (5 strings — copy from BUSINESS_FACTS.deliverables in order), "timeline" (5 objects with "week" and "task"), "price" (string), "paymentTerms" (3 strings), "whyUs" (3 strings), "nextSteps" (4 strings), "validDays" (number).

Use straight double quotes in JSON. No trailing commas.`;

function buildSystemPrompt(language: string): string {
  return `${SYSTEM_PROMPT_BASE}

Write the entire proposal in ${language}. If Hebrew or Arabic, use RTL formatting.`;
}

type StrategyInput = {
  clientType?: string;
  urgency?: string;
  goal?: string;
  tone?: string;
  proposalLanguage?: string;
};

type BriefInput = {
  clientRequest?: string;
};

type BusinessInput = {
  service?: string;
  scopeSummary?: string;
  deliverables?: string[];
  currency?: string;
  price?: number;
  validDays?: number;
  timelineWeeks?: number;
  payments?: { label?: string; amount?: number }[];
  clientName?: string;
  company?: string;
};

type GenerateBody = {
  business?: BusinessInput;
  strategy?: StrategyInput;
  brief?: BriefInput;
  profile?: Partial<FreelancerProfile> | FreelancerProfile;
};

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicMessageResponse = {
  content?: AnthropicTextBlock[];
  error?: { message?: string };
};

function normalizeDeliverables(raw: unknown): [string, string, string, string, string] | null {
  if (!Array.isArray(raw)) return null;
  const d = raw.map((x) => String(x ?? "").trim()).filter((s) => s.length > 0);
  if (d.length < 5) return null;
  return [d[0]!, d[1]!, d[2]!, d[3]!, d[4]!];
}

function validatePaymentsApprox(
  price: number,
  payments: { label: string; amount: number }[]
): boolean {
  if (payments.length === 0) return false;
  const sum = payments.reduce((s, p) => s + p.amount, 0);
  return Math.abs(sum - price) <= 0.05;
}

function parseBusinessFacts(b: BusinessInput): BusinessFacts | null {
  const service = String(b.service ?? "").trim();
  const scopeSummary = String(b.scopeSummary ?? "").trim();
  const currency = String(b.currency ?? "USD").trim().toUpperCase();
  const price = Number(b.price);
  const validDays = Number(b.validDays);
  const timelineWeeks = Number(b.timelineWeeks);
  const clientName = String(b.clientName ?? "").trim();
  const company = String(b.company ?? "").trim();
  const del = normalizeDeliverables(b.deliverables);

  if (!service || !del) return null;
  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(validDays) || validDays < 1) return null;
  if (!Number.isFinite(timelineWeeks) || timelineWeeks < 1) return null;
  if (!clientName) return null;

  const payments: { label: string; amount: number }[] = [];
  if (Array.isArray(b.payments)) {
    for (const p of b.payments) {
      const label = String(p?.label ?? "").trim();
      const amount = Number(p?.amount);
      if (!label || !Number.isFinite(amount) || amount <= 0) return null;
      payments.push({ label, amount });
    }
  }
  if (!validatePaymentsApprox(price, payments)) return null;

  return {
    service,
    scopeSummary: scopeSummary || "As described in deliverables below.",
    deliverables: del,
    currency,
    price,
    validDays: Math.round(validDays),
    timelineWeeks: Math.round(timelineWeeks),
    payments,
    clientName,
    company,
  };
}

function buildUserPrompt(
  business: BusinessFacts,
  strategy: StrategyInput & { proposalLanguage: string },
  brief: BriefInput,
  profile: FreelancerProfile
): string {
  const businessFactsJson = JSON.stringify(
    {
      service: business.service,
      scopeSummary: business.scopeSummary,
      deliverables: business.deliverables,
      currency: business.currency,
      price: business.price,
      validDays: business.validDays,
      timelineWeeks: business.timelineWeeks,
      payments: business.payments,
      client: { name: business.clientName, company: business.company },
      freelancer: {
        businessName: profile.businessName,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        website: profile.website,
        bio: profile.bio,
      },
    },
    null,
    2
  );

  const strategyBriefJson = JSON.stringify(
    {
      strategy: {
        clientType: strategy.clientType,
        urgency: strategy.urgency,
        goal: strategy.goal,
        tone: strategy.tone,
        proposalLanguage: strategy.proposalLanguage,
      },
      brief: {
        clientRequest: brief.clientRequest ?? "",
      },
    },
    null,
    2
  );

  return `BUSINESS_FACTS (read-only; do not contradict or replace these facts in your reasoning — server enforces them):
${businessFactsJson}

STRATEGY_AND_BRIEF (for tone and persuasion only):
${strategyBriefJson}

Write the JSON object now. Copy deliverables exactly from BUSINESS_FACTS.deliverables (same strings, same order). Set validDays to BUSINESS_FACTS.validDays. Format price as a currency string matching BUSINESS_FACTS.currency and price. Align paymentTerms with BUSINESS_FACTS.payments.`;
}

export async function POST(request: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const profileRaw = body.profile;
  if (!profileRaw || !isFreelancerProfileComplete(profileRaw)) {
    return NextResponse.json(
      { error: "Missing or incomplete freelancer profile", fields: ["profile"] },
      { status: 400 }
    );
  }

  const profile: FreelancerProfile = {
    fullName: String(profileRaw.fullName).trim(),
    businessName: String(profileRaw.businessName).trim(),
    email: String(profileRaw.email).trim(),
    phone: String(profileRaw.phone).trim(),
    website: String(profileRaw.website ?? "").trim(),
    bio: String(profileRaw.bio).trim(),
  };

  const businessFacts = parseBusinessFacts(body.business ?? {});
  if (!businessFacts) {
    return NextResponse.json(
      {
        error: "Invalid or incomplete business data",
        hint: "Require service, 5 deliverables, valid price, currency, validDays, timelineWeeks, clientName, and payments summing to price.",
      },
      { status: 400 }
    );
  }

  const strategy = body.strategy ?? {};
  const brief = body.brief ?? {};
  const missingStrategy: string[] = [];
  if (!String(strategy.clientType ?? "").trim()) missingStrategy.push("strategy.clientType");
  if (!String(strategy.urgency ?? "").trim()) missingStrategy.push("strategy.urgency");
  if (!String(strategy.goal ?? "").trim()) missingStrategy.push("strategy.goal");
  if (!String(strategy.tone ?? "").trim()) missingStrategy.push("strategy.tone");
  if (!String(strategy.proposalLanguage ?? "").trim()) {
    missingStrategy.push("strategy.proposalLanguage");
  }
  if (!String(brief.clientRequest ?? "").trim()) missingStrategy.push("brief.clientRequest");

  if (missingStrategy.length > 0) {
    return NextResponse.json(
      { error: "Missing strategy or brief fields", fields: missingStrategy },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: ANTHROPIC_API_KEY is not set" },
      { status: 500 }
    );
  }

  const proposalLanguage = String(strategy.proposalLanguage ?? "").trim();

  const userMessage = buildUserPrompt(
    businessFacts,
    {
      clientType: String(strategy.clientType).trim(),
      urgency: String(strategy.urgency).trim(),
      goal: String(strategy.goal).trim(),
      tone: String(strategy.tone).trim(),
      proposalLanguage,
    },
    { clientRequest: String(brief.clientRequest).trim() },
    profile
  );

  const anthropicRes = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      system: buildSystemPrompt(proposalLanguage),
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const raw = await anthropicRes.text();
  let anthropicData: AnthropicMessageResponse;
  try {
    anthropicData = JSON.parse(raw) as AnthropicMessageResponse;
  } catch {
    return NextResponse.json(
      {
        error: "Anthropic returned non-JSON response",
        status: anthropicRes.status,
        details: raw.slice(0, 500),
      },
      { status: 502 }
    );
  }

  if (!anthropicRes.ok) {
    return NextResponse.json(
      {
        error: "Anthropic API request failed",
        status: anthropicRes.status,
        details: anthropicData.error?.message ?? raw.slice(0, 500),
      },
      { status: anthropicRes.status >= 400 && anthropicRes.status < 600 ? anthropicRes.status : 502 }
    );
  }

  const textBlocks =
    anthropicData.content?.filter(
      (b): b is AnthropicTextBlock => b.type === "text" && typeof b.text === "string"
    ) ?? [];
  const combined = textBlocks.map((b) => b.text).join("").trim();

  if (!combined) {
    return NextResponse.json(
      { error: "Empty response from model", details: anthropicData },
      { status: 502 }
    );
  }

  let parsed: unknown;
  try {
    parsed = parseAnthropicJsonText(combined);
  } catch (e) {
    return NextResponse.json(
      {
        error: "Model did not return valid JSON",
        details: combined.slice(0, 800),
        parseError: e instanceof Error ? e.message : "parse error",
      },
      { status: 502 }
    );
  }

  const coerced = coerceStructuredProposal(parsed);
  if (!coerced) {
    return NextResponse.json(
      {
        error: "JSON did not match narrative schema",
        details: JSON.stringify(parsed).slice(0, 800),
      },
      { status: 502 }
    );
  }

  const merged = mergeBusinessIntoProposal(coerced, businessFacts);
  return NextResponse.json(merged);
}
