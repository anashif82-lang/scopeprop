"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FREELANCER_PROFILE_KEY,
  readFreelancerProfile,
  type FreelancerProfile,
} from "@/lib/freelancer-profile";

const navy = "#0a1628";
const border = "rgba(255,255,255,0.14)";
const muted = "rgba(255,255,255,0.68)";

export default function SettingsPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);
  const [hasStoredProfile, setHasStoredProfile] = useState(false);

  useEffect(() => {
    const p = readFreelancerProfile();
    if (p) {
      setFullName(p.fullName);
      setBusinessName(p.businessName);
      setEmail(p.email);
      setPhone(p.phone);
      setWebsite(p.website);
      setBio(p.bio);
      setHasStoredProfile(true);
    }
  }, []);

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

  const labelStyle = {
    display: "block" as const,
    marginTop: 20,
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.95)",
  };

  function handleSave(e: FormEvent) {
    e.preventDefault();
    const profile: FreelancerProfile = {
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      website: website.trim(),
      bio: bio.trim(),
    };
    if (
      !profile.fullName ||
      !profile.businessName ||
      !profile.email ||
      !profile.phone ||
      !profile.bio
    ) {
      return;
    }
    localStorage.setItem(FREELANCER_PROFILE_KEY, JSON.stringify(profile));
    setHasStoredProfile(true);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  const canSave =
    fullName.trim() &&
    businessName.trim() &&
    email.trim() &&
    phone.trim() &&
    bio.trim();

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
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <a
          href="/"
          style={{ color: "#fff", textDecoration: "none", fontWeight: 600 }}
        >
          ← ScopeProp
        </a>
        <button
          type="button"
          onClick={() => router.push("/create")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${border}`,
            backgroundColor: "transparent",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          New proposal
        </button>
      </header>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "32px 22px 64px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>
          Your profile
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: 15, color: muted, lineHeight: 1.5 }}>
          One-time setup so proposals are written in your voice and include your
          business details. Saved only in this browser (localStorage).
        </p>

        <form
          onSubmit={handleSave}
          style={{
            backgroundColor: "rgba(255,255,255,0.04)",
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 22,
          }}
        >
          <label style={{ ...labelStyle, marginTop: 0 }}>
            Full name *
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              required
              autoComplete="name"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Business name *
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Morgan Creative Studio"
              required
              autoComplete="organization"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Email *
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Phone *
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
              autoComplete="tel"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Website (optional)
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourbusiness.com"
              autoComplete="url"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            Short bio * (2–3 sentences about your expertise)
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
              rows={5}
              placeholder="I'm a web designer with 8 years of experience helping SaaS teams ship conversion-focused marketing sites."
              style={{
                ...inputStyle,
                minHeight: 120,
                resize: "vertical" as const,
                lineHeight: 1.5,
              }}
            />
          </label>

          {savedMsg ? (
            <p
              style={{
                margin: "18px 0 0",
                fontSize: 14,
                color: "#86efac",
              }}
            >
              Profile saved.
            </p>
          ) : null}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 26,
            }}
          >
            <button
              type="submit"
              disabled={!canSave}
              style={{
                padding: "12px 22px",
                borderRadius: 8,
                border: "none",
                backgroundColor: canSave ? "#fff" : "rgba(255,255,255,0.25)",
                color: navy,
                fontWeight: 600,
                fontSize: 15,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
            >
              Save profile
            </button>
            <button
              type="button"
              disabled={!hasStoredProfile}
              onClick={() => router.push("/create")}
              style={{
                padding: "12px 22px",
                borderRadius: 8,
                border: `1px solid ${border}`,
                backgroundColor: "transparent",
                color: hasStoredProfile ? "#fff" : muted,
                fontWeight: 600,
                fontSize: 15,
                cursor: hasStoredProfile ? "pointer" : "not-allowed",
              }}
            >
              Continue to proposal
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
