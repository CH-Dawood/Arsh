// Storefront view models. They mirror the database tables (supabase/migrations) in camelCase.

export type Badge = "new" | "bestseller" | "sale" | "luxury";

export interface CatalogImage {
  url: string;
  alt: string;
}

export interface Size {
  code: string;
  label: string;
}

/** One purchasable size of a product (a variant), as shown on cards and pickers. */
export interface SizeOption {
  variantId: string;
  code: string;
  label: string;
  stock: number;
}

export interface Variant {
  id: string;
  sku: string;
  size: Size;
  color: string | null;
  stock: number;
  price: number;
}

export interface CategoryRef {
  name: string;
  slug: string;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: CatalogImage[];
  sizes: SizeOption[];
  badges: Badge[];
  brand: CategoryRef | null;
  category: CategoryRef;
  inStock: boolean;
  createdAt: string;
}

export interface Product extends ProductSummary {
  shortDescription: string;
  description: string;
  fabric: string | null;
  embroidery: string | null;
  care: string | null;
  pieceCount: number | null;
  variants: Variant[];
}

export interface Category extends CategoryRef {
  description: string | null;
  image: CatalogImage | null;
}

export interface Brand extends CategoryRef {
  description: string | null;
  isFeatured: boolean;
}

export type HomeSectionKind = "new_arrivals" | "luxury" | "best_sellers" | "brands" | "category";

export interface Collection {
  slug: string;
  title: string;
  description: string;
  kind: HomeSectionKind;
  categorySlug: string | null;
  image: CatalogImage;
}

export interface Banner {
  id: string;
  heading: string;
  subheading: string | null;
  promoText: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  image: CatalogImage;
}

export interface StoreSettings {
  storeName: string;
  tagline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  whatsappNumber: string | null;
  whatsappMessage: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  freeShippingThreshold: number;
  shippingFee: number;
  codEnabled: boolean;
  bankTransferEnabled: boolean;
}

export interface ContentPage {
  slug: string;
  title: string;
  body: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

export type SortKey = "newest" | "price-asc" | "price-desc";

export interface ProductQuery {
  collection?: string;
  category?: string;
  brand?: string;
  size?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}
