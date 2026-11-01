/** The store policy pages managed in Admin → Store Settings → Policies (linked from the footer). */
export const POLICY_PAGES = [
  { slug: "privacy-policy", title: "Privacy Policy" },
  { slug: "shipping-policy", title: "Shipping Policy" },
  { slug: "refund-policy", title: "Refund & Return Policy" },
  { slug: "terms", title: "Terms & Conditions" },
] as const;

export type PolicySlug = (typeof POLICY_PAGES)[number]["slug"];
export const isPolicySlug = (s: string): s is PolicySlug => POLICY_PAGES.some((p) => p.slug === s);
