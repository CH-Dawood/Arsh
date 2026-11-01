import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/listing/page-header";
import { RichBody } from "@/components/ui/rich-doc";
import { getFaqs } from "@/lib/catalog";
import { bodyText } from "@/lib/rich-doc";
import { JsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "FAQs", description: "Answers to common questions about orders, delivery, sizing and returns.", path: "/faqs" });

export default async function FaqsPage() {
  const faqs = await getFaqs();
  return (
    <>
      {faqs.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: bodyText(f.answer) } })),
          }}
        />
      )}
      <PageHeader title="Frequently Asked Questions" crumbs={[{ name: "FAQs", href: "/faqs" }]} />
      <div className="container-page max-w-3xl">
        {faqs.length ? (
          <div className="divide-y divide-hairline border-y border-hairline">
            {faqs.map((f) => (
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
          <p className="border border-dashed border-taupe p-6 text-center text-cocoa">
            We&apos;re putting our answers together. Need help now? <Link href="/contact" className="underline underline-offset-4">Contact us</Link>.
          </p>
        )}
      </div>
    </>
  );
}
