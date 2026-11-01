"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Pilcrow, Quote, Redo2, Underline, Undo2, Unlink } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { safeHref, type RichDoc } from "@/lib/rich-doc";

/** Rich-text editor for policies and FAQ answers. Emits editor JSON (cleaned again on the server). */
export function RichEditor({ value, onChange, label, minHeight = "18rem" }: {
  value: RichDoc | null; onChange: (doc: RichDoc) => void; label: string; minHeight?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => safeHref(url) !== null,
          HTMLAttributes: { rel: "noopener noreferrer", target: null },
        },
      }),
    ],
    content: value ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: {
        "aria-label": label,
        "aria-multiline": "true",
        role: "textbox",
        class: "rich-editor max-w-none px-4 py-3 text-sm leading-relaxed text-espresso outline-none",
        style: `min-height:${minHeight}`,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichDoc),
  });

  return (
    <div className="border border-hairline bg-ivory focus-within:border-espresso">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      p: e.isActive("paragraph"), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"), link: e.isActive("link"),
      undo: e.can().undo(), redo: e.can().redo(),
    }),
  });

  const setLink = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("Link address (https://…, /page, mailto: or tel:)", current ?? "https://");
    if (input === null) return;
    if (input.trim() === "") return void editor.chain().focus().extendMarkRange("link").unsetLink().run();
    const href = safeHref(input.trim());
    if (!href) return void window.alert("Use a web address (https://…), a page on this site (/…), mailto: or tel:.");
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-hairline bg-paper p-1" role="toolbar" aria-label="Formatting">
      <Btn label="Paragraph" active={s.p} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow /></Btn>
      <Btn label="Heading" active={s.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 /></Btn>
      <Btn label="Subheading" active={s.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 /></Btn>
      <Sep />
      <Btn label="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></Btn>
      <Btn label="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></Btn>
      <Btn label="Underline" active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline /></Btn>
      <Sep />
      <Btn label="Bulleted list" active={s.ul} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></Btn>
      <Btn label="Numbered list" active={s.ol} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></Btn>
      <Btn label="Quote" active={s.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></Btn>
      <Sep />
      <Btn label={s.link ? "Edit link" : "Add link"} active={s.link} onClick={setLink}><Link2 /></Btn>
      {s.link && <Btn label="Remove link" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}><Unlink /></Btn>}
      <Sep />
      <Btn label="Undo" disabled={!s.undo} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></Btn>
      <Btn label="Redo" disabled={!s.redo} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></Btn>
    </div>
  );
}

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("grid size-8 place-items-center text-espresso transition-colors hover:bg-linen disabled:opacity-30 [&_svg]:size-4", active && "bg-champagne")}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-hairline" aria-hidden />;
