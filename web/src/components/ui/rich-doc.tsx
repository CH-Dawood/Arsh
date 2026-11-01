import type { ReactNode } from "react";
import { RichText } from "@/components/ui/rich-text";
import { cn } from "@/lib/format";
import { parseDoc, safeHref, type RichDoc, type RichNode } from "@/lib/rich-doc";

function renderText(node: RichNode, key: number): ReactNode {
  let out: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong className="font-medium text-espresso">{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
    else if (mark.type === "underline") out = <u className="underline-offset-4">{out}</u>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs.href);
      if (!href) continue;
      const external = /^https?:\/\//i.test(href);
      out = (
        <a href={href} className="text-espresso underline underline-offset-4 hover:text-gold-deep" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {out}
        </a>
      );
    }
  }
  return <span key={key}>{out}</span>;
}

function renderNode(node: RichNode, key: number): ReactNode {
  const kids = (node.content ?? []).map((c, i) => renderNode(c, i));
  switch (node.type) {
    case "text": return renderText(node, key);
    case "hardBreak": return <br key={key} />;
    case "horizontalRule": return <hr key={key} className="border-hairline" />;
    case "paragraph": return <p key={key}>{kids.length ? kids : <br />}</p>;
    case "heading":
      return node.attrs?.level === 3
        ? <h3 key={key} className="pt-2 text-xl text-espresso">{kids}</h3>
        : <h2 key={key} className="pt-4 text-2xl text-espresso">{kids}</h2>;
    case "bulletList": return <ul key={key} className="list-disc space-y-1.5 pl-5 marker:text-gold">{kids}</ul>;
    case "orderedList": return <ol key={key} start={node.attrs?.start} className="list-decimal space-y-1.5 pl-5 marker:text-gold-deep">{kids}</ol>;
    case "listItem": return <li key={key} className="space-y-2">{kids}</li>;
    case "blockquote": return <blockquote key={key} className="border-l-2 border-gold pl-4 italic">{kids}</blockquote>;
    default: return null;
  }
}

/** Renders a rich document with the store's typography. Never interprets HTML. */
export function RichDocView({ doc, className }: { doc: RichDoc; className?: string }) {
  return (
    <div className={cn("space-y-5 text-[0.95rem] leading-relaxed text-cocoa", className)}>
      {(doc.content ?? []).map((n, i) => renderNode(n, i))}
    </div>
  );
}

/** A stored body: rich JSON from the editor, or older plain text. */
export function RichBody({ body, className }: { body: string; className?: string }) {
  const doc = parseDoc(body);
  return doc ? <RichDocView doc={doc} className={className} /> : <div className={className}><RichText text={body} /></div>;
}
