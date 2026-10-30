/**
 * DEMO CATALOGUE — used only while Supabase is not configured (see lib/catalog/index.ts).
 * Every name, price and stock figure here is a placeholder for previewing the design.
 * Photography: Unsplash License (free to use) by Muneeb Malhotra (@muneebmalhotra),
 * Shireen Lakdawala (@shireenlakdawala1), M Naeem (@mnaeemad) and Talha (@talha6566).
 */
import type {
  Banner, Brand, Category, Collection, ContentPage, Faq, Product, Size, StoreSettings,
} from "./types";

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=80`;

export const demoSettings: StoreSettings = {
  storeName: "Arsh",
  tagline: "Pakistani couture, quietly refined",
  contactEmail: null,
  contactPhone: null,
  address: null,
  whatsappNumber: null,
  whatsappMessage: "Hello! I have a question about an order.",
  instagramUrl: null,
  tiktokUrl: null,
  facebookUrl: null,
  freeShippingThreshold: 12000,
  shippingFee: 250,
  codEnabled: true,
  bankTransferEnabled: false,
};

const SIZES: Record<string, Size> = {
  XS: { code: "XS", label: "Extra Small" },
  S: { code: "S", label: "Small" },
  M: { code: "M", label: "Medium" },
  L: { code: "L", label: "Large" },
  XL: { code: "XL", label: "Extra Large" },
  UNSTITCHED: { code: "UNSTITCHED", label: "Unstitched" },
};

export const demoCategories: Category[] = [
  ["Kurta Shalwar", "kurta-shalwar", "Classic kurta and shalwar sets."],
  ["2 Piece Suits", "2-piece-suits", "Shirt and trouser or shirt and dupatta sets."],
  ["3 Piece Suits", "3-piece-suits", "Shirt, trouser and dupatta ensembles."],
  ["Embroidered Suits", "embroidered-suits", "Hand and machine embroidered pieces."],
  ["Printed Suits", "printed-suits", "Digital and block printed lawn and cambric."],
  ["Ready To Wear", "ready-to-wear", "Stitched and ready to wear."],
  ["Designer Collection", "designer-collection", "Limited designer pieces."],
].map(([name, slug, description]) => ({ name, slug, description, image: null }));

export const demoBrands: Brand[] = [
  { name: "Arsh Luxe", slug: "arsh-luxe", description: "Occasion and bridal couture.", isFeatured: true },
  { name: "Arsh Prêt", slug: "arsh-pret", description: "Everyday ready-to-wear.", isFeatured: true },
  { name: "Arsh Lawn", slug: "arsh-lawn", description: "Seasonal lawn and cambric.", isFeatured: true },
];

type Flag = "new" | "luxury" | "bestseller";
type Seed = {
  name: string; slug: string; category: string; brand: string; price: number; compare?: number;
  images: string[]; flags?: Flag[]; stitched: boolean; pieces: number; fabric: string; embroidery?: string; color: string;
  blurb: string;
};

const seeds: Seed[] = [
  { name: "Mint Threadwork Lawn Suit", slug: "mint-threadwork-lawn-suit", category: "3-piece-suits", brand: "arsh-lawn", price: 8950, images: ["1773439878222-c383967772de", "1773439877127-ecfe17c9eb62"], flags: ["new", "bestseller"], stitched: false, pieces: 3, fabric: "Lawn shirt, cambric trouser, chiffon dupatta", embroidery: "White thread embroidery on neckline and sleeves", color: "Mint", blurb: "A breezy mint lawn with tonal white threadwork, made for long summer days." },
  { name: "Noir Chikankari Ensemble", slug: "noir-chikankari-ensemble", category: "embroidered-suits", brand: "arsh-luxe", price: 18500, images: ["1773439877255-55e63cf17b2c", "1773439878258-3c5fa24afa75"], flags: ["luxury"], stitched: true, pieces: 3, fabric: "Cotton net shirt, raw silk trouser, organza dupatta", embroidery: "Chikankari with silver tilla highlights", color: "Black", blurb: "Classic chikankari reimagined in midnight black with a soft silver glint." },
  { name: "Lilac Resham Two Piece", slug: "lilac-resham-two-piece", category: "2-piece-suits", brand: "arsh-pret", price: 7450, compare: 8950, images: ["1773439877918-8b7253ac852e", "1773439877904-39a38b3584da"], flags: ["new"], stitched: true, pieces: 2, fabric: "Cotton slub shirt and trouser", embroidery: "Resham embroidered yoke and hem", color: "Lilac", blurb: "Soft lilac cotton with a hand-finished resham yoke. Effortless and polished." },
  { name: "Dove Grey Printed Suit", slug: "dove-grey-printed-suit", category: "printed-suits", brand: "arsh-lawn", price: 6250, images: ["1773439878338-c61b0fe9ed48"], stitched: false, pieces: 3, fabric: "Printed lawn shirt, dyed trouser, voile dupatta", color: "Grey", blurb: "Dove grey digital print paired with a contrast black dupatta." },
  { name: "Rose Gota Festive Suit", slug: "rose-gota-festive-suit", category: "3-piece-suits", brand: "arsh-luxe", price: 14800, compare: 16500, images: ["1773439878760-cdb8c7aa13fa", "1773439877295-15e34acb4ae0"], flags: ["new", "bestseller"], stitched: true, pieces: 3, fabric: "Raw silk shirt, cotton silk trouser, net dupatta", embroidery: "Gota and sequin borders", color: "Pink", blurb: "Festive rose pink finished with gota borders and a shimmering net dupatta." },
  { name: "Lavender Shawl Set", slug: "lavender-shawl-set", category: "embroidered-suits", brand: "arsh-pret", price: 11200, images: ["1773439878676-b0ab6febe677", "1773439878503-1e96ace29e1b"], flags: ["new"], stitched: true, pieces: 3, fabric: "Khaddar shirt and trouser, embroidered wool shawl", embroidery: "Tonal floral embroidery on shawl border", color: "Lavender", blurb: "A winter-ready lavender suit layered with a soft beige embroidered shawl." },
  { name: "Sand & Blush Embroidered Two Piece", slug: "sand-blush-embroidered-two-piece", category: "2-piece-suits", brand: "arsh-pret", price: 8250, images: ["1773439878392-74abd38c55ec"], stitched: true, pieces: 2, fabric: "Cambric shirt and trouser", embroidery: "Blush floral motifs on front panel", color: "Beige", blurb: "Warm sand cambric with blush florals and a relaxed straight silhouette." },
  { name: "Emerald Velvet Kalidar", slug: "emerald-velvet-kalidar", category: "designer-collection", brand: "arsh-luxe", price: 32500, images: ["1733731406510-d2f6405c85dc"], flags: ["luxury"], stitched: true, pieces: 2, fabric: "Micro velvet kalidar, silk trouser", embroidery: "Zardozi neckline", color: "Emerald", blurb: "A floor-grazing emerald kalidar in rich velvet for winter weddings." },
  { name: "Navy Zardozi Jacket Set", slug: "navy-zardozi-jacket-set", category: "designer-collection", brand: "arsh-luxe", price: 28900, images: ["1733731402602-ab5bfcfa53fa"], flags: ["bestseller"], stitched: true, pieces: 2, fabric: "Crepe jacket and wide-leg trouser", embroidery: "Gold zardozi sleeves", color: "Navy", blurb: "Deep navy crepe with sculpted gold zardozi sleeves." },
  { name: "Ruby Silk Maxi", slug: "ruby-silk-maxi", category: "embroidered-suits", brand: "arsh-luxe", price: 24750, compare: 27500, images: ["1733731402680-50c115b0c5b3"], flags: ["bestseller"], stitched: true, pieces: 1, fabric: "Pure silk maxi", embroidery: "Hand-embellished neckline", color: "Red", blurb: "A fluid ruby silk maxi with a delicately embellished neckline." },
  { name: "Ochre Cambric Kurta Set", slug: "ochre-cambric-kurta-set", category: "ready-to-wear", brand: "arsh-pret", price: 5950, images: ["1733209589780-ece842d0dcf8"], stitched: true, pieces: 2, fabric: "Cambric kurta and trouser", embroidery: "Self-tone pintucks", color: "Ochre", blurb: "Sun-warmed ochre cambric with fine pintuck detailing." },
  { name: "Seafoam Co-ord Set", slug: "seafoam-co-ord-set", category: "2-piece-suits", brand: "arsh-pret", price: 6850, images: ["1733209589578-97136bee7d7a"], flags: ["new"], stitched: true, pieces: 2, fabric: "Linen blend shirt and trouser", color: "Mint", blurb: "A crisp seafoam co-ord that moves from day to evening." },
  { name: "White Chikan Kurta", slug: "white-chikan-kurta", category: "ready-to-wear", brand: "arsh-pret", price: 5450, images: ["1733209589780-99d3a8a3b3e4"], stitched: true, pieces: 2, fabric: "Cotton voile kurta, cotton trouser", embroidery: "Chikankari front panel", color: "White", blurb: "An airy white chikankari kurta, a wardrobe essential." },
  { name: "Pistachio Lace Kurta", slug: "pistachio-lace-kurta", category: "ready-to-wear", brand: "arsh-pret", price: 6150, images: ["1733209587957-7fd1ccbdfa87"], flags: ["new"], stitched: true, pieces: 2, fabric: "Cotton kurta with lace inserts, trouser", color: "Pistachio", blurb: "Pistachio cotton trimmed with delicate lace inserts." },
  { name: "Camel Straight Kurta", slug: "camel-straight-kurta", category: "ready-to-wear", brand: "arsh-pret", price: 5250, compare: 6250, images: ["1733209593218-87dc1bbe4927"], stitched: true, pieces: 2, fabric: "Cotton satin kurta and trouser", color: "Camel", blurb: "A minimal camel kurta with a clean, straight cut." },
  { name: "Ice Blue Embroidered Kurta", slug: "ice-blue-embroidered-kurta", category: "ready-to-wear", brand: "arsh-pret", price: 6450, images: ["1733209588000-339b73c36575"], flags: ["bestseller"], stitched: true, pieces: 2, fabric: "Lawn kurta and cambric trouser", embroidery: "Tonal neckline embroidery", color: "Blue", blurb: "Cool ice blue with tonal embroidery framing the neckline." },
  { name: "Pearl Grey Tunic Set", slug: "pearl-grey-tunic-set", category: "ready-to-wear", brand: "arsh-pret", price: 5750, images: ["1733209590486-4ed0bfcbc52a"], stitched: true, pieces: 2, fabric: "Cotton tunic and trouser", color: "Grey", blurb: "Understated pearl grey for effortless everyday elegance." },
  { name: "Blush Pleated Kurta", slug: "blush-pleated-kurta", category: "ready-to-wear", brand: "arsh-pret", price: 5850, images: ["1733209484732-6b094322a89f"], stitched: true, pieces: 2, fabric: "Cotton silk kurta and trouser", color: "Blush", blurb: "Soft blush with gentle pleats and a graceful drape." },
  { name: "Lime Organza Sleeve Kurta", slug: "lime-organza-sleeve-kurta", category: "ready-to-wear", brand: "arsh-pret", price: 6350, images: ["1733209587923-77ff33202f7c"], flags: ["new"], stitched: true, pieces: 2, fabric: "Cotton kurta with organza sleeves, trouser", color: "Lime", blurb: "Fresh lime cotton with sheer organza sleeves." },
  { name: "Teal Bridal Lehenga", slug: "teal-bridal-lehenga", category: "designer-collection", brand: "arsh-luxe", price: 185000, images: ["1747847471517-952a3eb93a89"], flags: ["luxury"], stitched: true, pieces: 3, fabric: "Raw silk lehenga, blouse and net dupatta", embroidery: "Hand-worked dabka, nakshi and kora", color: "Teal", blurb: "Heirloom bridal couture in teal, hand-embroidered over months." },
  { name: "Crimson Mirrorwork Suit", slug: "crimson-mirrorwork-suit", category: "embroidered-suits", brand: "arsh-luxe", price: 21500, images: ["1733470381571-c3d082e68457"], flags: ["luxury"], stitched: true, pieces: 3, fabric: "Chiffon shirt, silk trouser, chiffon dupatta", embroidery: "Mirror and thread work", color: "Red", blurb: "Crimson chiffon alive with mirrorwork, made for mehndi nights." },
  { name: "Ivory Pearl Formal", slug: "ivory-pearl-formal", category: "3-piece-suits", brand: "arsh-luxe", price: 26500, images: ["1733470324488-d0e10d014d80"], flags: ["luxury"], stitched: true, pieces: 3, fabric: "Organza shirt, silk trouser, organza dupatta", embroidery: "Pearl and sequin scatter", color: "Ivory", blurb: "Luminous ivory organza scattered with pearls and fine sequins." },
  { name: "Powder Blue Festive Suit", slug: "powder-blue-festive-suit", category: "3-piece-suits", brand: "arsh-luxe", price: 16900, images: ["1733470381436-bb5a2a441708"], flags: ["bestseller"], stitched: true, pieces: 3, fabric: "Jacquard shirt, cotton silk trouser, net dupatta", embroidery: "Silver thread borders", color: "Blue", blurb: "Powder blue jacquard finished with soft silver borders." },
  { name: "Noir & Gold Formal", slug: "noir-gold-formal", category: "embroidered-suits", brand: "arsh-luxe", price: 29500, images: ["1733470381591-c5dfb9df3c3d"], flags: ["luxury"], stitched: true, pieces: 3, fabric: "Chiffon shirt, silk trouser, chiffon dupatta", embroidery: "Gold kora and dabka", color: "Black", blurb: "Black chiffon worked in gold for an unforgettable evening." },
  { name: "Plum Straight Suit", slug: "plum-straight-suit", category: "kurta-shalwar", brand: "arsh-pret", price: 7950, images: ["1733731402869-57e0cce24aea"], stitched: true, pieces: 2, fabric: "Cotton silk kurta and shalwar", color: "Plum", blurb: "A deep plum kurta shalwar with a timeless straight cut." },
  { name: "Lilac Chiffon Formal", slug: "lilac-chiffon-formal", category: "designer-collection", brand: "arsh-luxe", price: 34500, images: ["1705920824583-0e783235394d"], flags: ["luxury"], stitched: true, pieces: 3, fabric: "Chiffon shirt, silk trouser, chiffon dupatta", embroidery: "Sequin and pearl embroidery", color: "Lilac", blurb: "Dreamy lilac chiffon with all-over sequin and pearl work." },
  { name: "Ebony Printed Dupatta Set", slug: "ebony-printed-dupatta-set", category: "2-piece-suits", brand: "arsh-lawn", price: 6950, images: ["1704119142483-1269733bcedb"], stitched: false, pieces: 2, fabric: "Lawn shirt, printed silk dupatta", color: "Black", blurb: "Solid ebony lawn paired with a statement printed silk dupatta." },
  { name: "Marigold Kurta Shalwar", slug: "marigold-kurta-shalwar", category: "2-piece-suits", brand: "arsh-lawn", price: 5650, images: ["1701252072712-e939599623f2"], stitched: false, pieces: 2, fabric: "Lawn kurta and cambric shalwar", color: "Yellow", blurb: "Bright marigold lawn, perfect for haldi and summer gatherings." },
  { name: "Scarlet Bridal Lehenga", slug: "scarlet-bridal-lehenga", category: "designer-collection", brand: "arsh-luxe", price: 245000, images: ["1707576618343-26a1b377ca7a"], flags: ["luxury"], stitched: true, pieces: 3, fabric: "Velvet and raw silk lehenga, net dupatta", embroidery: "Hand-worked zardozi and resham", color: "Red", blurb: "Traditional scarlet bridal lehenga, richly hand-embroidered." },
];

// Deterministic placeholder stock so the preview shows in-stock and sold-out sizes.
const stockFor = (i: number, s: number) => ((i * 7 + s * 3) % 9 === 0 ? 0 : ((i + s) % 6) + 2);

export const demoProducts: Product[] = seeds.map((s, i) => {
  const category = demoCategories.find((c) => c.slug === s.category)!;
  const brand = demoBrands.find((b) => b.slug === s.brand)!;
  const sizeCodes = s.stitched ? ["XS", "S", "M", "L", "XL"] : ["UNSTITCHED"];
  const variants = sizeCodes.map((code, si) => ({
    id: `demo-${s.slug}-${code.toLowerCase()}`,
    sku: `${s.slug.split("-").map((w) => w[0]).join("").toUpperCase()}-${code}`,
    size: SIZES[code],
    color: s.color,
    stock: s.stitched ? stockFor(i, si) : 8 + (i % 5),
    price: s.price,
  }));
  const flags = s.flags ?? [];
  return {
    id: `demo-${i + 1}`,
    slug: s.slug,
    name: s.name,
    price: s.price,
    compareAtPrice: s.compare ?? null,
    images: s.images.map((id, n) => ({ url: img(id), alt: `${s.name}${n ? " — alternate view" : ""}` })),
    sizes: variants.map((v) => ({ variantId: v.id, code: v.size.code, label: v.size.label, stock: v.stock })),
    badges: [...flags, ...(s.compare ? (["sale"] as const) : [])],
    brand: { name: brand.name, slug: brand.slug },
    category: { name: category.name, slug: category.slug },
    inStock: variants.some((v) => v.stock > 0),
    // Newer products first: later seeds are treated as older.
    createdAt: new Date(Date.UTC(2026, 9, 28) - i * 86_400_000).toISOString(),
    shortDescription: s.blurb,
    description: `${s.blurb} Cut and finished in our studio with attention to every seam. Colours may vary slightly due to photographic lighting.`,
    fabric: s.fabric,
    embroidery: s.embroidery ?? null,
    care: "Dry clean recommended for embroidered pieces. Otherwise hand wash cold, separately; do not bleach; iron on reverse.",
    pieceCount: s.pieces,
    variants,
  };
});

const cover = (slug: string, n = 0) => demoProducts.find((p) => p.slug === slug)!.images[n];

// The six home-page collections, in the order the spec requires.
export const demoCollections: Collection[] = [
  { slug: "new-arrivals", title: "New Arrivals", kind: "new_arrivals", categorySlug: null, description: "The latest pieces, fresh from the studio.", image: cover("rose-gota-festive-suit") },
  { slug: "luxury-collection", title: "Luxury Collection", kind: "luxury", categorySlug: null, description: "Couture for weddings and celebrations.", image: cover("teal-bridal-lehenga") },
  { slug: "2-piece-set", title: "2 Piece Set", kind: "category", categorySlug: "2-piece-suits", description: "Easy coordinated sets for every day.", image: cover("lilac-resham-two-piece") },
  { slug: "brands", title: "Brands", kind: "brands", categorySlug: null, description: "Our house labels, from prêt to couture.", image: cover("emerald-velvet-kalidar") },
  { slug: "ready-to-wear", title: "Ready To Wear", kind: "category", categorySlug: "ready-to-wear", description: "Stitched, finished and ready to go.", image: cover("seafoam-co-ord-set") },
  { slug: "best-sellers", title: "Best Sellers", kind: "best_sellers", categorySlug: null, description: "The pieces our customers love most.", image: cover("mint-threadwork-lawn-suit") },
];

export const demoBanners: Banner[] = [
  { id: "b1", heading: "The Festive Edit", subheading: "Hand-embroidered couture for weddings and celebrations.", promoText: "New season", ctaLabel: "Shop luxury", ctaHref: "/collections/luxury-collection", image: { url: img("1747847471517-952a3eb93a89"), alt: "Model in a teal hand-embroidered bridal ensemble" } },
  { id: "b2", heading: "Summer Prêt", subheading: "Breathable cottons and lawns, stitched and ready to wear.", promoText: "Ready to wear", ctaLabel: "Shop prêt", ctaHref: "/collections/ready-to-wear", image: { url: img("1733209589780-ece842d0dcf8"), alt: "Model in an ochre cambric kurta beside a pool" } },
  { id: "b3", heading: "Threads of Spring", subheading: "Soft lawns with delicate threadwork, just arrived.", promoText: "Just in", ctaLabel: "Shop new arrivals", ctaHref: "/collections/new-arrivals", image: { url: img("1773439878222-c383967772de"), alt: "Model in a mint embroidered lawn suit" } },
];

// Long-form pages stay empty until the owner writes them in Admin → Content.
export const demoPages: ContentPage[] = [
  ["about", "About Us"],
  ["privacy-policy", "Privacy Policy"],
  ["shipping-policy", "Shipping Policy"],
  ["refund-policy", "Refund & Return Policy"],
  ["terms", "Terms & Conditions"],
  ["size-guide", "Size Guide"],
].map(([slug, title]) => ({ slug, title, body: "" }));

export const demoFaqs: Faq[] = [];
