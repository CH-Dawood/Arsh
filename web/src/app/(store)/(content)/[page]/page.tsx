import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/listing/page-header";
import { SizeGuideContent } from "@/components/product/size-guide";
import { RichText } from "@/components/ui/rich-text";
import { getContentPage } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";

const PAGES = ["about", "privacy-policy", "shipping-policy", "refund-policy", "terms", "size-guide"];

export function generateStaticParams() {
  return PAGES.map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/[page]">): Promise<Metadata> {
  const { page } = await params;
  const content = PAGES.includes(page) ? await getContentPage(page) : null;
  // Resolved before the page streams, so unknown pages get a real 404 status.
  if (!content) notFound();
  return pageMetadata({ title: content.title, description: `${content.title}.`, path: `/${page}` });
}

export default function ContentPage({ params }: PageProps<"/[page]">) {
  return (
    <Suspense fallback={<div className="container-page h-96 max-w-3xl animate-pulse pt-40" aria-busy="true" />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/[page]">, "params">) {
  const { page } = await params;
  const content = PAGES.includes(page) ? await getContentPage(page) : null;
  if (!content) notFound();

  return (
    <>
      <PageHeader title={content.title} crumbs={[{ name: content.title, href: `/${page}` }]} />
      <article className="container-page max-w-3xl">
        {page === "size-guide" ? (
          <SizeGuideContent body={content.body} />
        ) : content.body ? (
          <RichText text={content.body} />
        ) : (
          <p className="border border-dashed border-taupe p-6 text-center text-cocoa">
            This page&apos;s text is written in Admin → Content. Questions in the meantime? <Link href="/contact" className="underline underline-offset-4">Contact us</Link>.
          </p>
        )}
      </article>
    </>
  );
}
