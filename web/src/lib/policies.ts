/** The store policy pages managed in Admin → Store Settings → Policies (linked from the footer). */
export const POLICY_PAGES = [
  { slug: "privacy-policy", title: "Privacy Policy" },
  { slug: "shipping-policy", title: "Shipping Policy" },
  { slug: "refund-policy", title: "Refund & Return Policy" },
  { slug: "terms", title: "Terms & Conditions" },
] as const;

/** Every page written in Admin → Store Settings → Policies & Pages. */
export const EDITABLE_PAGES = [
  ...POLICY_PAGES,
  { slug: "about", title: "About Us" },
  { slug: "size-guide", title: "Size Guide" },
] as const;
export const isEditableSlug = (s: string) => EDITABLE_PAGES.some((p) => p.slug === s);

export type PolicySlug = (typeof POLICY_PAGES)[number]["slug"];
export const isPolicySlug = (s: string): s is PolicySlug => POLICY_PAGES.some((p) => p.slug === s);
