import type {
  Banner, Brand, Category, Collection, ContentPage, Faq, HangerConfig, Product, ProductQuery, ProductSummary, StoreSettings,
} from "./types";

export interface ProductPage {
  items: ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
}

/** Everything the storefront reads. Implemented by the Supabase source and the offline demo source. */
export interface CatalogSource {
  settings(): Promise<StoreSettings>;
  banners(): Promise<Banner[]>;
  /** Admin-managed hanger content, or null when the store has none (the rail then picks pieces itself). */
  hanger(): Promise<HangerConfig | null>;
  collections(): Promise<Collection[]>;
  categories(): Promise<Category[]>;
  brands(): Promise<Brand[]>;
  products(query: ProductQuery): Promise<ProductPage>;
  product(slug: string): Promise<Product | null>;
  productSlugs(): Promise<string[]>;
  related(slug: string, limit: number): Promise<ProductSummary[]>;
  search(q: string, limit: number): Promise<ProductSummary[]>;
  contentPage(slug: string): Promise<ContentPage | null>;
  faqs(): Promise<Faq[]>;
}

export const PAGE_SIZE = 24;

export const toSummary = ({ id, slug, name, price, compareAtPrice, images, sizes, badges, brand, category, inStock, createdAt, featured }: Product): ProductSummary =>
  ({ id, slug, name, price, compareAtPrice, images: images.slice(0, 2), sizes, badges, brand, category, inStock, createdAt, featured });

/** Search terms: lowercase letters/digits only, at most 8. */
export const searchTerms = (q: string) => q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);
