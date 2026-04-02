"use client";

import { useEffect, useState } from "react";
import { readFreelancerProfile } from "@/lib/freelancer-profile";
import {
  coerceStructuredProposal,
  type ProposalStoragePayload,
  type StructuredProposal,
} from "@/lib/proposal-structured";

const PROPOSAL_STORAGE_KEY = "scopeprop_proposal_v1";
const navy = "#0a1628";
const pageFont =
  'var(--font-geist-sans, ui-sans-serif), system-ui, sans-serif';

const printCss = `
@media print {
  [data-print-hide] {
    display: none !important;
  }
  @page {
    margin: 0.55in 0.5in 0.6in;
  }
  html, body {
    background: #fff !important;
    color: #111 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  [data-proposal-shell] {
    background: #fff !important;
    padding: 0 !important;
  }
  [data-proposal-inner] {
    max-width: none !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
  [data-invest-block] {
    background: ${navy} !important;
    color: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ResultPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "legacy">(
    "loading"
  );
  const [doc, setDoc] = useState<StructuredProposal | null>(null);
  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [preparedAt, setPreparedAt] = useState("");
  const [freelancer, setFreelancer] = useState(() => readFreelancerProfile());

  useEffect(() => {
    setFreelancer(readFreelancerProfile());
    const raw = sessionStorage.getItem(PROPOSAL_STORAGE_KEY);
    if (!raw) {
      setStatus("empty");
      return;
    }
    try {
      const p = JSON.parse(raw) as Record<string, unknown>;
      if (typeof p.proposal === "string" && !p.document) {
        setStatus("legacy");
        return;
      }
      const payload = p as ProposalStoragePayload;
      if (!payload.document) {
        setStatus("empty");
        return;
      }
      const structured = coerceStructuredProposal(payload.document);
      if (!structured) {
        setStatus("empty");
        return;
      }
      setDoc(structured);
      setClientName(String(payload.clientName ?? ""));
      setCompany(String(payload.company ?? ""));
      setPreparedAt(String(payload.preparedAt ?? ""));
      setStatus("ready");
    } catch {
      setStatus("empty");
    }
  }, []);

  if (status === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: pageFont,
        }}
      >
        <p style={{ margin: 0, color: "#888", fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  if (status === "legacy" || status === "empty") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#fafafa",
          fontFamily: pageFont,
          padding: 48,
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 16px", fontSize: 17, color: "#333" }}>
          {status === "legacy"
            ? "This proposal was created with an older format. Generate a new one to see the updated layout."
            : "No proposal found."}
        </p>
        <a
          href="/create"
          style={{ color: navy, fontWeight: 600, textDecoration: "underline" }}
        >
          Create New Proposal
        </a>
      </div>
    );
  }

  if (!doc) return null;

  const subtitleLines = doc.subtitle.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const goalsPreview = doc.understood;
  const preparedFor =
    company.trim() || clientName.trim()
      ? [clientName.trim(), company.trim()].filter(Boolean).join(" · ")
      : "Client";

  return (
    <>
      <style>{printCss}</style>
      <div
        data-proposal-shell
        style={{
          minHeight: "100vh",
          backgroundColor: "#f4f4f2",
          fontFamily: pageFont,
          color: "#1a1a1a",
          padding: "32px 20px 64px",
        }}
      >
        <div
          data-print-hide
          style={{
            maxWidth: 850,
            margin: "0 auto 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              border: `1px solid ${navy}`,
              backgroundColor: navy,
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Download PDF
          </button>
          <a
            href="/create"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              borderRadius: 6,
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              color: "#333",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Create New Proposal
          </a>
        </div>

        <article
          data-proposal-inner
          style={{
            maxWidth: 850,
            margin: "0 auto",
            backgroundColor: "#fff",
            boxShadow: "0 4px 48px rgba(0,0,0,0.08)",
            borderRadius: 2,
            border: "1px solid #eaeaea",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 20,
              padding: "36px 48px 28px",
              borderBottom: "1px solid #eee",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: navy,
                }}
              >
                {freelancer?.businessName ?? "Your studio"}
              </div>
              {freelancer?.fullName ? (
                <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
                  {freelancer.fullName}
                </div>
              ) : null}
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#888",
                  fontWeight: 600,
                }}
              >
                Proposal
              </div>
              <div style={{ marginTop: 6, fontSize: 14, color: "#333" }}>
                {preparedAt ? formatDate(preparedAt) : formatDate(new Date().toISOString())}
              </div>
            </div>
          </header>

          <div style={{ padding: "48px 48px 40px" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.85rem, 4vw, 2.35rem)",
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                color: "#0a0a0a",
              }}
            >
              {doc.title}
            </h1>
            <div
              style={{
                width: 72,
                height: 4,
                backgroundColor: navy,
                marginTop: 20,
                borderRadius: 1,
              }}
            />
            <div style={{ marginTop: 22, maxWidth: 620 }}>
              {subtitleLines.length > 0 ? (
                subtitleLines.map((line, i) => (
                  <p
                    key={i}
                    style={{
                      margin: i === 0 ? 0 : "8px 0 0",
                      fontSize: 17,
                      lineHeight: 1.55,
                      color: "#444",
                      fontWeight: 400,
                    }}
                  >
                    {line}
                  </p>
                ))
              ) : (
                <p style={{ margin: 0, fontSize: 17, color: "#444" }}>
                  {doc.subtitle}
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              padding: "0 48px 44px",
            }}
          >
            {[
              {
                label: "Goals",
                body: (
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#444" }}>
                    {goalsPreview.map((g, i) => (
                      <li
                        key={i}
                        style={{
                          marginBottom: 8,
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {g}
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                label: "Solution",
                body: (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.65,
                      color: "#444",
                    }}
                  >
                    {doc.solution}
                  </p>
                ),
              },
              {
                label: "Key deliverables",
                body: (
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#444" }}>
                    {doc.deliverables.map((d, i) => (
                      <li
                        key={i}
                        style={{
                          marginBottom: 8,
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {d}
                      </li>
                    ))}
                  </ul>
                ),
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  flex: "1 1 200px",
                  minWidth: 0,
                  padding: "22px 22px 24px",
                  border: "1px solid #ebebeb",
                  borderRadius: 4,
                  backgroundColor: "#fafafa",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: navy,
                    marginBottom: 14,
                  }}
                >
                  {card.label}
                </div>
                {card.body}
              </div>
            ))}
          </div>

          <div style={{ padding: "0 48px 48px" }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: navy,
                marginBottom: 28,
              }}
            >
              Timeline
            </div>
            <div style={{ position: "relative", paddingTop: 8 }}>
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  right: 24,
                  top: 15,
                  height: 2,
                  backgroundColor: "#e3e3e3",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  justifyContent: "space-between",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 8,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {doc.timeline.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      flex: "1 1 0",
                      minWidth: 100,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: navy,
                        border: "3px solid #fff",
                        boxSizing: "content-box",
                        margin: "0 auto 16px",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#111",
                        marginBottom: 6,
                      }}
                    >
                      {step.week}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: "#666",
                        padding: "0 4px",
                      }}
                    >
                      {step.task}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: "0 48px 48px" }}>
            <div
              data-invest-block
              style={{
                backgroundColor: navy,
                color: "#fff",
                borderRadius: 4,
                padding: "40px 40px 36px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  opacity: 0.85,
                  marginBottom: 12,
                }}
              >
                Investment
              </div>
              <div
                style={{
                  fontSize: "clamp(2.25rem, 5vw, 2.85rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  marginBottom: 28,
                }}
              >
                {doc.price}
              </div>
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.9,
                  marginBottom: 10,
                  fontWeight: 600,
                }}
              >
                Payment terms
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 14,
                  lineHeight: 1.8,
                  opacity: 0.95,
                }}
              >
                {doc.paymentTerms.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ padding: "0 48px 48px" }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: navy,
                marginBottom: 22,
              }}
            >
              Why us
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {doc.whyUs.map((reason, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "flex-start", gap: 14 }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      backgroundColor: navy,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    ✓
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: "#333",
                    }}
                  >
                    {reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 48px 56px" }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 700,
                color: navy,
                marginBottom: 22,
              }}
            >
              Next steps
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 22,
                fontSize: 15,
                lineHeight: 1.85,
                color: "#333",
              }}
            >
              {doc.nextSteps.map((s, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {s}
                </li>
              ))}
            </ol>
          </div>

          <footer
            style={{
              borderTop: "1px solid #eee",
              padding: "32px 48px 40px",
              backgroundColor: "#fafafa",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 24,
                fontSize: 13,
                lineHeight: 1.6,
                color: "#555",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#888",
                    marginBottom: 8,
                  }}
                >
                  Prepared for
                </div>
                <div style={{ fontWeight: 600, color: "#111" }}>
                  {preparedFor}
                </div>
                <div style={{ marginTop: 14, color: "#666" }}>
                  Valid for {doc.validDays} days from proposal date.
                </div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#888",
                    marginBottom: 8,
                  }}
                >
                  Questions
                </div>
                {freelancer ? (
                  <>
                    <div>{freelancer.email}</div>
                    <div>{freelancer.phone}</div>
                    {freelancer.website ? (
                      <div style={{ marginTop: 4 }}>{freelancer.website}</div>
                    ) : null}
                  </>
                ) : (
                  <div style={{ color: "#999" }}>—</div>
                )}
              </div>
            </div>
          </footer>
        </article>
      </div>
    </>
  );
}
