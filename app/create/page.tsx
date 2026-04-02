"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { readFreelancerProfile } from "@/lib/freelancer-profile";
import {
  buildPaymentsFromPreset,
  sumPercents,
  type CustomPaymentRow,
  type PaymentPreset,
} from "@/lib/payments";
import {
  coerceStructuredProposal,
  type StructuredProposal,
} from "@/lib/proposal-structured";

const PROPOSAL_STORAGE_KEY = "scopeprop_proposal_v1";

const navy = "#0a1628";
const border = "rgba(255,255,255,0.14)";
const muted = "rgba(255,255,255,0.68)";

const SERVICES = [
  "Web Design",
  "SEO",
  "Branding",
  "Paid Ads",
  "Development",
  "Consulting",
  "Other",
] as const;

const CLIENT_TYPES = [
  { value: "cold", label: "Cold (never met)" },
  { value: "warm", label: "Warm (already talked)" },
  { value: "referral", label: "Referral (recommended)" },
] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

const URGENCIES = ["Low", "Normal", "Urgent"] as const;

const GOALS = [
  { value: "close", label: "Close fast" },
  { value: "price", label: "Maximize price" },
  { value: "relationship", label: "Build relationship" },
] as const;

const TONES = [
  "Professional",
  "Persuasive",
  "Premium",
  "Friendly",
  "Direct",
] as const;

const PROPOSAL_LANGUAGES = [
  "English",
  "Hebrew (עברית)",
  "Arabic (عربي)",
  "French",
  "Spanish",
] as const;

const LOGO_ACCEPT =
  "image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg";

function isAllowedLogoFile(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/png" || t === "image/jpeg" || t === "image/svg+xml") {
    return true;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "svg";
}

export default function CreateProposalPage() {
  const router = useRouter();
  const [profileReady, setProfileReady] = useState(false);
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  useEffect(() => {
    if (!readFreelancerProfile()) {
      router.replace("/settings");
      return;
    }
    setProfileReady(true);
  }, [router]);

  const [serviceType, setServiceType] = useState("");
  const [serviceOther, setServiceOther] = useState("");
  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("");
  const [clientType, setClientType] = useState("");
  const [scopeSummary, setScopeSummary] = useState("");

  const [urgency, setUrgency] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("");
  const [proposalLanguage, setProposalLanguage] =
    useState<(typeof PROPOSAL_LANGUAGES)[number]>("English");

  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [clientRequest, setClientRequest] = useState("");
  const [deliverables, setDeliverables] = useState(["", "", "", "", ""]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");
  const [logoInputKey, setLogoInputKey] = useState(0);

  const [currency, setCurrency] = useState("USD");
  const [price, setPrice] = useState("");
  const [paymentPreset, setPaymentPreset] = useState<PaymentPreset>("50_50");
  const [customPaymentRows, setCustomPaymentRows] = useState<
    { label: string; percent: string }[]
  >([
    { label: "Deposit", percent: "40" },
    { label: "Mid-project", percent: "30" },
    { label: "Final", percent: "30" },
  ]);
  const [timelineWeeks, setTimelineWeeks] = useState("6");
  const [validDays, setValidDays] = useState("14");

  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState("");

  function revokeLogoPreview() {
    setLogoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function assignLogoFile(file: File | null) {
    revokeLogoPreview();
    if (file) {
      setLogoPreviewUrl(URL.createObjectURL(file));
      setLogoFile(file);
    } else {
      setLogoFile(null);
    }
  }

  const filteredServices = SERVICES.filter((s) =>
    s.toLowerCase().includes(serviceFilter.trim().toLowerCase())
  );

  function selectService(s: string) {
    setServiceType(s);
    setServiceFilter("");
    setServiceMenuOpen(false);
    if (s !== "Other") setServiceOther("");
  }

  function setDeliverableLine(i: number, v: string) {
    setDeliverables((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function pricingStepValid(): boolean {
    const p = parseFloat(price);
    if (!Number.isFinite(p) || p <= 0) return false;
    const vd = parseInt(validDays, 10);
    const tw = parseInt(timelineWeeks, 10);
    if (!Number.isFinite(vd) || vd < 1) return false;
    if (!Number.isFinite(tw) || tw < 1) return false;
    if (paymentPreset === "custom") {
      const rows: CustomPaymentRow[] = customPaymentRows.map((r) => ({
        label: r.label.trim(),
        percent: parseFloat(r.percent) || 0,
      }));
      if (rows.some((r) => !r.label || r.percent <= 0)) return false;
      return Math.abs(sumPercents(rows) - 100) <= 0.15;
    }
    return true;
  }

  function canContinue(): boolean {
    if (step === 0) {
      if (!serviceType) return false;
      if (serviceType === "Other" && !serviceOther.trim()) return false;
      if (!clientType) return false;
      if (scopeSummary.trim().length < 8) return false;
      return true;
    }
    if (step === 1) {
      return Boolean(urgency && goal && tone && proposalLanguage);
    }
    if (step === 2) {
      if (!clientName.trim() || !clientRequest.trim()) return false;
      return deliverables.every((d) => d.trim().length > 0);
    }
    if (step === 3) {
      return pricingStepValid();
    }
    return true;
  }

  const selectStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    marginTop: 8,
    padding: "12px 14px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    backgroundColor: "rgba(255,255,255,0.07)",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer" as const,
  };

  const labelBlock = {
    display: "block" as const,
    marginTop: 20,
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.95)",
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    marginTop: 8,
    padding: "12px 14px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    backgroundColor: "rgba(255,255,255,0.07)",
    color: "#fff",
    fontSize: 16,
  };

  const serviceDisplay =
    serviceType === "Other" && serviceOther.trim()
      ? `Other: ${serviceOther.trim()}`
      : serviceType || "Search and select…";

  function serviceLabelForApi(): string {
    if (serviceType === "Other") return serviceOther.trim() || "Other";
    return serviceType;
  }

  function buildPaymentsForApi() {
    const priceNum = parseFloat(price);
    const custom: CustomPaymentRow[] = customPaymentRows.map((r) => ({
      label: r.label.trim(),
      percent: parseFloat(r.percent) || 0,
    }));
    return buildPaymentsFromPreset(
      priceNum,
      paymentPreset,
      paymentPreset === "custom" ? custom : []
    );
  }

  async function handleGenerateProposal() {
    const profile = readFreelancerProfile();
    if (!profile) {
      setGenerateError(
        "Your freelancer profile is missing. Please complete settings."
      );
      router.replace("/settings");
      return;
    }
    setGenerateError("");
    setGenerateLoading(true);
    let navigated = false;
    try {
      const payments = buildPaymentsForApi();
      const priceNum = parseFloat(price);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: {
            service: serviceLabelForApi(),
            scopeSummary: scopeSummary.trim(),
            deliverables: deliverables.map((d) => d.trim()),
            currency,
            price: priceNum,
            validDays: parseInt(validDays, 10),
            timelineWeeks: parseInt(timelineWeeks, 10),
            payments,
            clientName: clientName.trim(),
            company: company.trim(),
          },
          strategy: {
            clientType:
              CLIENT_TYPES.find((c) => c.value === clientType)?.label ??
              clientType,
            urgency,
            goal: GOALS.find((g) => g.value === goal)?.label ?? goal,
            tone,
            proposalLanguage,
          },
          brief: {
            clientRequest: clientRequest.trim(),
          },
          profile: {
            fullName: profile.fullName,
            businessName: profile.businessName,
            email: profile.email,
            phone: profile.phone,
            website: profile.website,
            bio: profile.bio,
          },
        }),
      });
      const text = await res.text();
      let data: StructuredProposal & { error?: string; details?: string } =
        {} as StructuredProposal & { error?: string; details?: string };
      try {
        data = JSON.parse(text) as typeof data;
      } catch {
        setGenerateError(
          text.slice(0, 240) || `Request failed (${res.status})`
        );
        return;
      }
      if (!res.ok) {
        setGenerateError(
          data.error || data.details || `Request failed (${res.status})`
        );
        return;
      }
      const structured = coerceStructuredProposal(data);
      if (!structured) {
        setGenerateError(
          "The proposal response was not in the expected format. Try again."
        );
        return;
      }
      sessionStorage.setItem(
        PROPOSAL_STORAGE_KEY,
        JSON.stringify({
          document: structured,
          clientName: clientName.trim(),
          company: company.trim(),
          preparedAt: new Date().toISOString(),
        })
      );
      router.push("/result");
      navigated = true;
    } catch {
      setGenerateError("Network error. Check your connection and try again.");
    } finally {
      if (!navigated) setGenerateLoading(false);
    }
  }

  const stepTitles = [
    "Project & scope",
    "Strategy",
    "Brief & deliverables",
    "Pricing & terms",
    "Review & generate",
  ];

  if (!profileReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: navy,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'var(--font-geist-sans, ui-sans-serif), system-ui, sans-serif',
        }}
      >
        <p style={{ margin: 0, color: muted, fontSize: 16 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: navy,
        color: "#fff",
        fontFamily:
          'var(--font-geist-sans, ui-sans-serif), system-ui, sans-serif',
      }}
    >
      <header
        style={{
          borderBottom: `1px solid ${border}`,
          padding: "14px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="/"
          style={{ color: "#fff", textDecoration: "none", fontWeight: 600 }}
        >
          ← ScopeProp
        </a>
        <span style={{ fontSize: 14, color: muted }}>New proposal</span>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "28px 22px 56px" }}>
        <p style={{ margin: "0 0 6px", fontSize: 13, color: muted }}>
          Step {step + 1} of {totalSteps}
        </p>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 28,
          }}
        >
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor:
                  i <= step ? "#fff" : "rgba(255,255,255,0.14)",
              }}
            />
          ))}
        </div>

        <h1 style={{ margin: "0 0 20px", fontSize: 26, fontWeight: 700 }}>
          {stepTitles[step]}
        </h1>

        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 22,
            overflow: "visible",
          }}
        >
          {step === 0 && (
            <div>
              <div style={labelBlock}>
                <span
                  id="service-type-label"
                  style={{ display: "block", marginBottom: 0 }}
                >
                  Service type
                </span>
                <div
                  style={{ position: "relative", marginTop: 6, zIndex: 1 }}
                >
                  <button
                    type="button"
                    aria-expanded={serviceMenuOpen}
                    aria-haspopup="listbox"
                    aria-labelledby="service-type-label"
                    onClick={(e) => {
                      e.preventDefault();
                      setServiceMenuOpen((o) => !o);
                      setServiceFilter("");
                    }}
                    style={{
                      ...selectStyle,
                      marginTop: 0,
                      textAlign: "left" as const,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        color: serviceType ? "#fff" : muted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {serviceDisplay}
                    </span>
                    <span style={{ marginLeft: 8, flexShrink: 0 }}>
                      {serviceMenuOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {serviceMenuOpen && (
                    <div
                      role="listbox"
                      aria-labelledby="service-type-label"
                      style={{
                        position: "absolute",
                        zIndex: 100,
                        left: 0,
                        right: 0,
                        top: "100%",
                        marginTop: 6,
                        borderRadius: 8,
                        border: `1px solid ${border}`,
                        backgroundColor: "#0d1f35",
                        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                        overflow: "hidden",
                      }}
                    >
                      <input
                        type="text"
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        placeholder="Search services…"
                        autoFocus
                        style={{
                          ...inputStyle,
                          marginTop: 0,
                          borderRadius: 0,
                          border: "none",
                          borderBottom: `1px solid ${border}`,
                        }}
                      />
                      <div style={{ maxHeight: 220, overflowY: "auto" }}>
                        {filteredServices.length === 0 ? (
                          <div
                            style={{
                              padding: "14px 16px",
                              color: muted,
                              fontSize: 14,
                            }}
                          >
                            No matches
                          </div>
                        ) : (
                          filteredServices.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => selectService(s)}
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                borderBottom: `1px solid ${border}`,
                                backgroundColor:
                                  serviceType === s
                                    ? "rgba(255,255,255,0.1)"
                                    : "transparent",
                                color: "#fff",
                                fontSize: 15,
                                textAlign: "left" as const,
                                cursor: "pointer",
                              }}
                            >
                              {s}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {serviceType === "Other" && (
                <label style={labelBlock}>
                  Describe your service
                  <input
                    value={serviceOther}
                    onChange={(e) => setServiceOther(e.target.value)}
                    placeholder="e.g. Video production"
                    style={inputStyle}
                  />
                </label>
              )}
              <label style={labelBlock}>
                Client type
                <select
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  style={selectStyle}
                >
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  {CLIENT_TYPES.map((c) => (
                    <option key={c.value} value={c.value} style={{ color: "#111" }}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelBlock}>
                Scope summary *
                <textarea
                  value={scopeSummary}
                  onChange={(e) => setScopeSummary(e.target.value)}
                  placeholder="One short paragraph: what you’re proposing to do and the outcome."
                  rows={4}
                  style={{
                    ...inputStyle,
                    minHeight: 100,
                    resize: "vertical" as const,
                    lineHeight: 1.5,
                  }}
                />
                <span style={{ fontSize: 12, color: muted }}>
                  Min. ~8 characters. This stays in your business record for the AI.
                </span>
              </label>
            </div>
          )}

          {step === 1 && (
            <div>
              <label style={labelBlock}>
                Urgency
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  style={selectStyle}
                >
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  {URGENCIES.map((u) => (
                    <option key={u} value={u} style={{ color: "#111" }}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelBlock}>
                What do you want to achieve with this proposal?
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  style={selectStyle}
                >
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  {GOALS.map((g) => (
                    <option key={g.value} value={g.value} style={{ color: "#111" }}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelBlock}>
                Tone
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={selectStyle}
                >
                  <option value="" style={{ color: "#111" }}>
                    Select…
                  </option>
                  {TONES.map((t) => (
                    <option key={t} value={t} style={{ color: "#111" }}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelBlock}>
                Proposal language
                <select
                  value={proposalLanguage}
                  onChange={(e) =>
                    setProposalLanguage(
                      e.target.value as (typeof PROPOSAL_LANGUAGES)[number]
                    )
                  }
                  style={selectStyle}
                >
                  {PROPOSAL_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang} style={{ color: "#111" }}>
                      {lang}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <label style={{ ...labelBlock, marginTop: 0 }}>
                Client name *
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Jane Doe"
                  style={inputStyle}
                />
              </label>
              <label style={labelBlock}>
                Company (optional)
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Inc."
                  style={inputStyle}
                />
              </label>
              <div style={{ marginTop: 20 }}>
                <span style={{ ...labelBlock, marginTop: 0 }}>Logo (optional)</span>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: muted }}>
                  PNG, JPG, or SVG
                </p>
                <input
                  key={logoInputKey}
                  id="logo-upload"
                  type="file"
                  accept={LOGO_ACCEPT}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setLogoError("");
                    if (!file) return;
                    if (!isAllowedLogoFile(file)) {
                      setLogoError("Please use PNG, JPG, or SVG.");
                      assignLogoFile(null);
                      setLogoInputKey((k) => k + 1);
                      return;
                    }
                    assignLogoFile(file);
                  }}
                />
                <label
                  htmlFor="logo-upload"
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: `1px solid ${border}`,
                    backgroundColor: "rgba(255,255,255,0.08)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {logoFile ? "Replace logo" : "Upload logo"}
                </label>
                {logoFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoError("");
                      assignLogoFile(null);
                      setLogoInputKey((k) => k + 1);
                    }}
                    style={{
                      marginLeft: 10,
                      marginTop: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      backgroundColor: "transparent",
                      color: "rgba(255,255,255,0.88)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
                {logoError ? (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#fca5a5" }}>
                    {logoError}
                  </p>
                ) : null}
                {logoPreviewUrl ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 14,
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      backgroundColor: "rgba(0,0,0,0.2)",
                      textAlign: "center" as const,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreviewUrl}
                      alt="Logo preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: 100,
                        objectFit: "contain" as const,
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <label style={labelBlock}>
                Client request *
                <textarea
                  value={clientRequest}
                  onChange={(e) => setClientRequest(e.target.value)}
                  placeholder="Goals, constraints, timeline expectations, links…"
                  rows={5}
                  style={{
                    ...inputStyle,
                    minHeight: 120,
                    resize: "vertical" as const,
                    lineHeight: 1.5,
                  }}
                />
              </label>
              <p style={{ margin: "16px 0 8px", fontSize: 13, color: muted }}>
                Deliverables * (exactly five line items — these lock into the proposal)
              </p>
              {[0, 1, 2, 3, 4].map((i) => (
                <label key={i} style={{ ...labelBlock, marginTop: i === 0 ? 0 : 12 }}>
                  Deliverable {i + 1}
                  <input
                    value={deliverables[i]}
                    onChange={(e) => setDeliverableLine(i, e.target.value)}
                    placeholder={`Item ${i + 1}`}
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div>
              <label style={{ ...labelBlock, marginTop: 0 }}>
                Currency *
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={selectStyle}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c} style={{ color: "#111" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelBlock}>
                Total price *
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="6900"
                  style={inputStyle}
                />
              </label>
              <label style={labelBlock}>
                Payment structure *
                <select
                  value={paymentPreset}
                  onChange={(e) =>
                    setPaymentPreset(e.target.value as PaymentPreset)
                  }
                  style={selectStyle}
                >
                  <option value="100" style={{ color: "#111" }}>
                    100% upfront
                  </option>
                  <option value="50_50" style={{ color: "#111" }}>
                    50% deposit / 50% final
                  </option>
                  <option value="40_30_30" style={{ color: "#111" }}>
                    40% / 30% / 30%
                  </option>
                  <option value="custom" style={{ color: "#111" }}>
                    Custom %
                  </option>
                </select>
              </label>
              {paymentPreset === "custom" && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: muted }}>
                    Labels + percentages must total 100%.
                  </p>
                  {customPaymentRows.map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <input
                        value={row.label}
                        onChange={(e) => {
                          const next = [...customPaymentRows];
                          next[idx] = { ...next[idx]!, label: e.target.value };
                          setCustomPaymentRows(next);
                        }}
                        placeholder="Label"
                        style={{ ...inputStyle, flex: "1 1 140px", marginTop: 0 }}
                      />
                      <input
                        type="number"
                        value={row.percent}
                        onChange={(e) => {
                          const next = [...customPaymentRows];
                          next[idx] = { ...next[idx]!, percent: e.target.value };
                          setCustomPaymentRows(next);
                        }}
                        placeholder="%"
                        style={{
                          ...inputStyle,
                          width: 88,
                          marginTop: 0,
                        }}
                      />
                    </div>
                  ))}
                  <p style={{ fontSize: 13, color: muted }}>
                    Sum:{" "}
                    {customPaymentRows
                      .reduce((s, r) => s + (parseFloat(r.percent) || 0), 0)
                      .toFixed(1)}
                    %
                  </p>
                </div>
              )}
              <label style={labelBlock}>
                Timeline (weeks) *
                <input
                  type="number"
                  min={1}
                  value={timelineWeeks}
                  onChange={(e) => setTimelineWeeks(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={labelBlock}>
                Proposal valid for (days) *
                <input
                  type="number"
                  min={1}
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <p style={{ marginTop: 16, fontSize: 13, color: muted, lineHeight: 1.5 }}>
                Numbers here are binding: the AI will not invent price, milestones, or
                deliverables — they are merged from your inputs after generation.
              </p>
            </div>
          )}

          {step === 4 && (
            <div style={{ fontSize: 15, lineHeight: 1.55 }}>
              <button
                type="button"
                disabled={generateLoading}
                onClick={() => setStep(3)}
                style={{
                  marginBottom: 20,
                  padding: "12px 20px",
                  borderRadius: 8,
                  border: `1px solid ${border}`,
                  backgroundColor: "transparent",
                  color: generateLoading ? muted : "#fff",
                  fontWeight: 600,
                  cursor: generateLoading ? "not-allowed" : "pointer",
                  fontSize: 15,
                }}
              >
                Back
              </button>
              <p style={{ margin: "0 0 18px", color: muted }}>
                Business terms are locked from your Pricing step; the AI writes
                narrative only.
              </p>
              <SummaryRow label="Service" value={serviceLabelForApi()} />
              <SummaryRow label="Scope" value={scopeSummary.trim() || "—"} />
              <SummaryRow
                label="Client type"
                value={
                  CLIENT_TYPES.find((c) => c.value === clientType)?.label ?? "—"
                }
              />
              <SummaryRow label="Urgency" value={urgency || "—"} />
              <SummaryRow
                label="Goal"
                value={GOALS.find((g) => g.value === goal)?.label ?? "—"}
              />
              <SummaryRow label="Tone" value={tone || "—"} />
              <SummaryRow label="Proposal language" value={proposalLanguage} />
              <SummaryRow
                label="Client"
                value={
                  clientName +
                  (company.trim() ? ` · ${company.trim()}` : "")
                }
              />
              <SummaryRow
                label="Deliverables"
                value={deliverables.filter(Boolean).join(" · ") || "—"}
              />
              <SummaryRow
                label="Price"
                value={
                  price && currency
                    ? `${currency} ${price}`
                    : "—"
                }
              />
              <SummaryRow
                label="Payments"
                value={buildPaymentsForApi()
                  .map((p) => `${p.label}: ${p.amount}`)
                  .join(" | ")}
              />
              <SummaryRow label="Timeline" value={`${timelineWeeks} weeks`} />
              <SummaryRow label="Valid (days)" value={validDays || "—"} />
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    margin: 0,
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    color: muted,
                  }}
                >
                  Client request
                </div>
                <div
                  style={{
                    margin: "6px 0 0",
                    whiteSpace: "pre-wrap" as const,
                  }}
                >
                  {clientRequest.trim() || "—"}
                </div>
              </div>
              {generateError ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: "rgba(248, 113, 113, 0.12)",
                    border: "1px solid rgba(248, 113, 113, 0.35)",
                    color: "#fecaca",
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                >
                  {generateError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={generateLoading}
                onClick={() => void handleGenerateProposal()}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: "16px 20px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: generateLoading
                    ? "rgba(255,255,255,0.35)"
                    : "#fff",
                  color: navy,
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: generateLoading ? "wait" : "pointer",
                }}
              >
                {generateLoading ? "Generating…" : "Generate Proposal"}
              </button>
            </div>
          )}

          {step < 4 && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 26,
                flexWrap: "wrap",
              }}
            >
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 8,
                    border: `1px solid ${border}`,
                    backgroundColor: "transparent",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                disabled={!canContinue()}
                onClick={() => {
                  if (canContinue()) setStep((s) => s + 1);
                }}
                style={{
                  padding: "12px 22px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: canContinue() ? "#fff" : "rgba(255,255,255,0.22)",
                  color: navy,
                  fontWeight: 600,
                  cursor: canContinue() ? "pointer" : "not-allowed",
                  fontSize: 15,
                }}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          margin: 0,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          color: muted,
        }}
      >
        {label}
      </div>
      <div style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" as const }}>
        {value}
      </div>
    </div>
  );
}
