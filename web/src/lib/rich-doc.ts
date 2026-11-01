/**
 * Rich text for policies and FAQ answers, stored as editor (Tiptap/ProseMirror) JSON.
 * Content is never stored or rendered as HTML: cleanDoc() keeps only the node types, marks
 * and link targets below, and the renderer turns them into ordinary React elements.
 */

export type RichMark = { type: "bold" | "italic" | "underline" } | { type: "link"; attrs: { href: string } };
export type RichNode = {
  type: "doc" | "paragraph" | "heading" | "bulletList" | "orderedList" | "listItem" | "blockquote" | "hardBreak" | "horizontalRule" | "text";
  attrs?: { level?: 2 | 3; start?: number };
  content?: RichNode[];
  text?: string;
  marks?: RichMark[];
};
export type RichDoc = RichNode & { type: "doc" };

const BLOCKS = new Set(["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "hardBreak", "horizontalRule", "text"]);
const SIMPLE_MARKS = new Set(["bold", "italic", "underline"]);

/** Same-site paths, web links, email and phone links only (no javascript:, data:, etc.). */
export function safeHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const href = raw.trim();
  if (href.length === 0 || href.length > 2000) return null;
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) return href;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href) && !/[\s<>"]/.test(href)) return href;
  return null;
}

function cleanNode(input: unknown, depth: number): RichNode | null {
  if (depth > 20 || !input || typeof input !== "object") return null;
  const n = input as Record<string, unknown>;
  const type = n.type;
  if (typeof type !== "string" || !BLOCKS.has(type)) return null;

  if (type === "text") {
    const text = typeof n.text === "string" ? n.text.slice(0, 20000) : "";
    if (!text) return null;
    const marks: RichMark[] = [];
    for (const m of Array.isArray(n.marks) ? n.marks : []) {
      const mt = (m as { type?: unknown })?.type;
      if (typeof mt === "string" && SIMPLE_MARKS.has(mt)) marks.push({ type: mt as "bold" | "italic" | "underline" });
      if (mt === "link") {
        const href = safeHref((m as { attrs?: { href?: unknown } }).attrs?.href);
        if (href) marks.push({ type: "link", attrs: { href } });
      }
    }
    return marks.length ? { type, text, marks } : { type, text };
  }
  if (type === "hardBreak" || type === "horizontalRule") return { type };

  const content = (Array.isArray(n.content) ? n.content : []).map((c) => cleanNode(c, depth + 1)).filter((c): c is RichNode => c !== null);
  const node: RichNode = { type: type as RichNode["type"], content };
  const attrs = (n.attrs ?? {}) as { level?: unknown; start?: unknown };
  if (type === "heading") node.attrs = { level: attrs.level === 3 ? 3 : 2 };
  if (type === "orderedList" && typeof attrs.start === "number" && attrs.start > 1 && attrs.start < 10000) node.attrs = { start: Math.floor(attrs.start) };
  return node;
}

/** Validates editor output (from the browser) and drops anything not on the allow-list. */
export function cleanDoc(input: unknown): RichDoc {
  const n = (input ?? {}) as { type?: unknown; content?: unknown };
  const content = n.type === "doc" && Array.isArray(n.content)
    ? n.content.map((c) => cleanNode(c, 1)).filter((c): c is RichNode => c !== null)
    : [];
  return { type: "doc", content };
}

/** Reads a stored body. Older plain-text bodies come back as null (shown with the plain-text renderer). */
export function parseDoc(body: string | null | undefined): RichDoc | null {
  if (!body || !body.startsWith("{")) return null;
  try {
    return cleanDoc(JSON.parse(body));
  } catch {
    return null;
  }
}

export function docText(node: RichNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inner = (node.content ?? []).map(docText).join(node.type === "doc" || node.type.endsWith("List") ? "\n" : "");
  return node.type === "listItem" ? `• ${inner}` : inner;
}

/** True when the document has no visible text. */
export const isEmptyDoc = (doc: RichDoc | null) => !doc || docText(doc).trim().length === 0;

/** Plain text of a stored body, for search engines (JSON-LD) and previews. */
export function bodyText(body: string) {
  const doc = parseDoc(body);
  return (doc ? docText(doc) : body).trim();
}
