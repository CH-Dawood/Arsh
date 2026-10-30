import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/listing/page-header";
import { getFaqs } from "@/lib/catalog";
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
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
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
                <p className="mt-4 leading-relaxed text-cocoa">{f.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-taupe p-6 text-center text-cocoa">
            Questions and answers appear here once added in Admin → FAQs. Need help now? <Link href="/contact" className="underline underline-offset-4">Contact us</Link>.
          </p>
        )}
      </div>
    </>
  );
}
