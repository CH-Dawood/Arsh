"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/sheet";
import { RichBody } from "@/components/ui/rich-doc";
import { deleteFaq, reorderFaqs, saveFaq, setFaqActive } from "@/lib/admin/actions/content";
import { toastResult } from "@/lib/admin/toast";
import { bodyText, docText, parseDoc, type RichDoc } from "@/lib/rich-doc";
import { ConfirmDialog, Toggle } from "./client";
import { RichEditor } from "./rich-editor";
import { AdminButton, Card, EmptyState, FieldRow, TextInput } from "./ui";

export interface FaqRow { id: string; question: string; answer: string; is_active: boolean }
type Draft = { id?: string; question: string; doc: RichDoc | null; is_active: boolean };

const toDoc = (answer: string): RichDoc | null =>
  parseDoc(answer) ?? (answer.trim() ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: answer.trim() }] }] } : null);

export function FaqManager({ faqs }: { faqs: FaqRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [toDelete, setToDelete] = useState<FaqRow | null>(null);
  const [preview, setPreview] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; message: string }>, after?: () => void) =>
    start(async () => {
      if (toastResult(await fn())) {
        after?.();
        router.refresh();
      }
    });

  const move = (i: number, dir: -1 | 1) => {
    const ids = faqs.map((f) => f.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => reorderFaqs(ids));
  };

  const openEditor = (d: Draft) => { setDraft(d); setDirty(false); };
  const closeEditor = () => {
    if (dirty && !window.confirm("Discard your unsaved changes to this FAQ?")) return;
    setDraft(null);
    setDirty(false);
  };
  const edit = (patch: Partial<Draft>) => { setDraft((d) => (d ? { ...d, ...patch } : d)); setDirty(true); };
  const active = faqs.filter((f) => f.is_active);

  return (
    <>
      <Card
        title={`${faqs.length} FAQ${faqs.length === 1 ? "" : "s"} · ${active.length} shown`}
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminButton size="sm" variant="outline" onClick={() => setPreview(true)}><Eye className="size-4" aria-hidden /> Preview</AdminButton>
            <AdminButton size="sm" onClick={() => openEditor({ question: "", doc: null, is_active: true })}><Plus className="size-4" aria-hidden /> Add FAQ</AdminButton>
          </div>
        }
      >
        {faqs.length === 0 ? (
          <EmptyState title="No FAQs yet">Add the questions customers ask most, such as delivery times, payment methods and returns.</EmptyState>
        ) : (
          <ul className="divide-y divide-hairline">
            {faqs.map((f, i) => (
              <li key={f.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <div className="flex shrink-0 flex-col">
                  <button type="button" disabled={i === 0 || pending} onClick={() => move(i, -1)} className="grid size-7 place-items-center disabled:opacity-30" aria-label={`Move “${f.question}” up`}><ArrowUp className="size-4" /></button>
                  <button type="button" disabled={i === faqs.length - 1 || pending} onClick={() => move(i, 1)} className="grid size-7 place-items-center disabled:opacity-30" aria-label={`Move “${f.question}” down`}><ArrowDown className="size-4" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={f.is_active ? "font-medium" : "font-medium text-cocoa"}>{f.question}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-cocoa">{bodyText(f.answer)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                    <input type="checkbox" checked={f.is_active} disabled={pending} onChange={(e) => run(() => setFaqActive(f.id, e.target.checked))} className="size-4 accent-espresso" aria-label={`Show “${f.question}” on the website`} />
                    {f.is_active ? "Shown" : <span className="text-cocoa">Hidden</span>}
                  </label>
                  <div className="flex">
                    <AdminButton size="sm" variant="ghost" onClick={() => openEditor({ id: f.id, question: f.question, doc: toDoc(f.answer), is_active: f.is_active })} aria-label={`Edit “${f.question}”`}><Pencil className="size-4" /></AdminButton>
                    <AdminButton size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(f)} aria-label={`Delete “${f.question}”`}><Trash2 className="size-4" /></AdminButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Sheet open={draft !== null} onClose={closeEditor} side="right" label={draft?.id ? "Edit FAQ" : "Add FAQ"}>
        {draft && (
          <form
            className="flex h-full flex-col overflow-y-auto p-6 pt-12"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveFaq({ id: draft.id, question: draft.question, is_active: draft.is_active, answer: JSON.stringify(draft.doc ?? { type: "doc", content: [] }) }), () => { setDraft(null); setDirty(false); });
            }}
          >
            <h2 className="text-2xl">{draft.id ? "Edit FAQ" : "Add FAQ"}</h2>
            <div className="mt-6 space-y-4">
              <FieldRow label="Question *" htmlFor="faq-q">
                <TextInput id="faq-q" data-autofocus required minLength={5} maxLength={300} value={draft.question} onChange={(e) => edit({ question: e.target.value })} placeholder="How long does delivery take?" />
              </FieldRow>
              <div>
                <p className="mb-1.5 text-xs font-medium text-cocoa">Answer *</p>
                <RichEditor label="Answer" value={draft.doc} onChange={(doc) => edit({ doc })} minHeight="12rem" />
              </div>
              <Toggle checked={draft.is_active} onChange={(x) => edit({ is_active: x })} label="Show on the website" description="Hidden FAQs stay here so you can show them again later." />
            </div>
            <div className="mt-auto flex justify-end gap-2 pt-8">
              <AdminButton variant="outline" onClick={closeEditor}>Cancel</AdminButton>
              <AdminButton type="submit" disabled={pending || draft.question.trim().length < 5 || !draft.doc || !docText(draft.doc).trim()}>{pending ? "Saving…" : "Save"}</AdminButton>
            </div>
          </form>
        )}
      </Sheet>

      <Sheet open={preview} onClose={() => setPreview(false)} side="right" label="FAQ preview">
        <div className="h-full overflow-y-auto bg-ivory p-6 pt-12 sm:p-10 sm:pt-14">
          <p className="label text-gold-deep">Preview · shown FAQs only</p>
          <h2 className="mt-3 text-heading">Frequently Asked Questions</h2>
          {active.length ? (
            <div className="mt-8 divide-y divide-hairline border-y border-hairline">
              {active.map((f) => (
                <details key={f.id} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span className="text-xl transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <RichBody body={f.answer} className="mt-4 space-y-3 leading-relaxed" />
                </details>
              ))}
            </div>
          ) : (
            <p className="mt-8 border border-dashed border-taupe p-6 text-center text-cocoa">No FAQs are shown yet.</p>
          )}
          <Link href="/faqs" target="_blank" className="mt-6 inline-flex items-center gap-1.5 text-sm text-cocoa hover:text-espresso">Open the FAQ page <ExternalLink className="size-3.5" aria-hidden /></Link>
        </div>
      </Sheet>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.question}”?`}
        destructive
        confirmLabel="Delete FAQ"
        pending={pending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && run(() => deleteFaq(toDelete.id), () => setToDelete(null))}
      >
        This removes it from the website and can&apos;t be undone. To hide it for now instead, untick “Shown”.
      </ConfirmDialog>
    </>
  );
}
