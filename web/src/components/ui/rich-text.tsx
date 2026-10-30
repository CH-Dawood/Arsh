import { Fragment } from "react";

/**
 * Renders admin-written plain text safely: blank lines become paragraphs, lines starting
 * with "## " become headings and "- " lines become lists. No HTML is ever interpreted.
 */
export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-5 text-[0.95rem] leading-relaxed text-cocoa">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (block.startsWith("## ")) return <h2 key={i} className="pt-4 text-2xl text-espresso">{block.slice(3)}</h2>;
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-gold">
              {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{l}</Fragment>)}
          </p>
        );
      })}
    </div>
  );
}
