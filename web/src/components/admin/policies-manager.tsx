"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { RichDocView } from "@/components/ui/rich-doc";
import { savePolicy } from "@/lib/admin/actions/content";
import { toastResult } from "@/lib/admin/toast";
import { cn } from "@/lib/format";
import { docText, parseDoc, type RichDoc } from "@/lib/rich-doc";
import { Toggle } from "./client";
import { RichEditor } from "./rich-editor";
import { AdminButton, Card, FieldRow, TextInput, formatDateTime } from "./ui";

export interface PolicyRow { slug: string; title: string; body: string; is_published: boolean; updated_at: string }
type Draft = { title: string; is_published: boolean; doc: RichDoc | null };

const toDraft = (p: PolicyRow): Draft => ({ title: p.title, is_published: p.is_published, doc: parseDoc(p.body) ?? plainToDoc(p.body) });

/** Older plain-text bodies open in the editor as paragraphs. */
function plainToDoc(body: string): RichDoc | null {
  if (!body.trim()) return null;
  return { type: "doc", content: body.trim().split(/\n{2,}/).map((para) => ({ type: "paragraph", content: [{ type: "text", text: para }] })) };
}

export function PoliciesManager({ policies }: { policies: PolicyRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(policies);
  const [slug, setSlug] = useState(policies[0]?.slug ?? "");
  const [draft, setDraft] = useState<Draft | null>(policies[0] ? toDraft(policies[0]) : null);
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(0); // remounts the editor on switch / discard
  const [preview, setPreview] = useState(false);
  const current = saved.find((p) => p.slug === slug);

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const open = (p: PolicyRow) => {
    if (p.slug === slug) return;
    if (dirty && !window.confirm("You have unsaved changes to this page. Discard them?")) return;
    setSlug(p.slug);
    setDraft(toDraft(p));
    setDirty(false);
    setVersion((v) => v + 1);
  };

  const discard = () => {
    if (!current) return;
    setDraft(toDraft(current));
    setDirty(false);
    setVersion((v) => v + 1);
  };

  const save = () => {
    if (!draft || !current) return;
    start(async () => {
      const res = await savePolicy({ slug, title: draft.title, is_published: draft.is_published, body: JSON.stringify(draft.doc ?? { type: "doc", content: [] }) });
      if (toastResult(res) && res.ok) {
        setSaved((all) => all.map((p) => p.slug === slug
          ? { ...p, title: draft.title.trim(), is_published: draft.is_published, body: draft.doc && docText(draft.doc).trim() ? JSON.stringify(draft.doc) : "", updated_at: res.data?.updatedAt ?? p.updated_at }
          : p));
        setDirty(false);
        router.refresh();
      }
    });
  };

  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <Card title="Pages">
        <ul className="divide-y divide-hairline">
          {saved.map((p) => {
            const empty = !docText(parseDoc(p.body)).trim() && !p.body.trim();
            return (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => open(p)}
                  aria-current={p.slug === slug ? "true" : undefined}
                  className={cn("block w-full px-5 py-3.5 text-left text-sm transition-colors hover:bg-linen", p.slug === slug && "bg-champagne/60")}
                >
                  <span className="block font-medium">{p.title}{p.slug === slug && dirty ? " •" : ""}</span>
                  <span className="mt-0.5 block text-xs text-cocoa">
                    {empty ? "No content yet" : p.is_published ? "Published" : "Draft (hidden)"} · Updated {formatDateTime(p.updated_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {draft && current && (
        <Card
          title={current.title}
          actions={
            <Link href={`/${slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs text-cocoa hover:text-espresso">
              View on website <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          }
        >
          <div className="space-y-5 p-5">
            <FieldRow label="Page title *" htmlFor="pol-title">
              <TextInput id="pol-title" maxLength={120} value={draft.title} onChange={(e) => edit({ title: e.target.value })} />
            </FieldRow>
            <div>
              <p className="mb-1.5 text-xs font-medium text-cocoa">Content</p>
              <RichEditor key={`${slug}-${version}`} label={`${current.title} content`} value={draft.doc} onChange={(doc) => edit({ doc })} minHeight="26rem" />
              <p className="mt-1 text-xs text-cocoa/80">Use Heading and Subheading for sections. You can paste text from a document; formatting the website can&apos;t show is removed.</p>
            </div>
            <Toggle checked={draft.is_published} onChange={(x) => edit({ is_published: x })} label="Published" description="When off, the page shows “This page is being updated” instead of its content." />
            <p className="text-xs text-cocoa">Last updated {formatDateTime(current.updated_at)}</p>
          </div>
          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-hairline bg-paper/95 px-5 py-3 backdrop-blur">
            {dirty && <span className="mr-auto text-xs text-warning">Unsaved changes</span>}
            <AdminButton variant="ghost" onClick={() => setPreview(true)}><Eye className="size-4" aria-hidden /> Preview</AdminButton>
            <AdminButton variant="outline" disabled={!dirty || pending} onClick={discard}>Discard changes</AdminButton>
            <AdminButton disabled={!dirty || pending || draft.title.trim().length < 2} onClick={save}>{pending ? "Saving…" : "Save changes"}</AdminButton>
          </div>
        </Card>
      )}

      <Sheet open={preview} onClose={() => setPreview(false)} side="right" label="Page preview">
        {draft && (
          <div className="h-full overflow-y-auto bg-ivory p-6 pt-12 sm:p-10 sm:pt-14">
            <p className="label text-gold-deep">Preview{draft.is_published ? "" : " · draft, not on the website"}</p>
            <h2 className="mt-3 text-heading">{draft.title}</h2>
            <div className="mt-8">
              {draft.doc && docText(draft.doc).trim()
                ? <RichDocView doc={draft.doc} />
                : <p className="border border-dashed border-taupe p-6 text-center text-cocoa">This page is being updated.</p>}
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
