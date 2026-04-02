export const FREELANCER_PROFILE_KEY = "scopeprop_freelancer_profile_v1";

export type FreelancerProfile = {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  website: string;
  bio: string;
};

export function readFreelancerProfile(): FreelancerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FREELANCER_PROFILE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const fullName = String(o.fullName ?? "").trim();
    const businessName = String(o.businessName ?? "").trim();
    const email = String(o.email ?? "").trim();
    const phone = String(o.phone ?? "").trim();
    const website = String(o.website ?? "").trim();
    const bio = String(o.bio ?? "").trim();
    if (!fullName || !businessName || !email || !phone || !bio) {
      return null;
    }
    return { fullName, businessName, email, phone, website, bio };
  } catch {
    return null;
  }
}

export function isFreelancerProfileComplete(
  value: unknown
): value is FreelancerProfile {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return Boolean(
    String(o.fullName ?? "").trim() &&
      String(o.businessName ?? "").trim() &&
      String(o.email ?? "").trim() &&
      String(o.phone ?? "").trim() &&
      String(o.bio ?? "").trim()
  );
}
