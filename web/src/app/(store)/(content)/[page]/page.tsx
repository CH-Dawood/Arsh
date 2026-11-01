import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/listing/page-header";
import { SizeGuideContent } from "@/components/product/size-guide";
import { RichBody } from "@/components/ui/rich-doc";
import { getContentPage } from "@/lib/catalog";
import { isPolicySlug, POLICY_PAGES } from "@/lib/policies";
import { bodyText } from "@/lib/rich-doc";
import { pageMetadata } from "@/lib/seo";

const formatDate = (iso: string) => new Intl.DateTimeFormat("en-PK", { dateStyle: "long", timeZone: "Asia/Karachi" }).format(new Date(iso));

const PAGES = ["about", "privacy-policy", "shipping-policy", "refund-policy", "terms", "size-guide"];

export function generateStaticParams() {
  return PAGES.map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/[page]">): Promise<Metadata> {
  const { page } = await params;
  const content = PAGES.includes(page) ? await getContentPage(page) : null;
  // Resolved before the page streams, so unknown pages get a real 404 status. Footer policy
  // pages always exist (an unpublished one shows a short notice instead of a 404).
  if (!content && !isPolicySlug(page)) notFound();
  const title = content?.title ?? POLICY_PAGES.find((p) => p.slug === page)?.title ?? "";
  const description = content ? bodyText(content.body).slice(0, 160) || `${title}.` : `${title}.`;
  return pageMetadata({ title, description, path: `/${page}` });
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
  if (!content && !isPolicySlug(page)) notFound();
  const title = content?.title ?? POLICY_PAGES.find((p) => p.slug === page)?.title ?? "";
  const hasBody = Boolean(content && bodyText(content.body));

  return (
    <>
      <PageHeader title={title} crumbs={[{ name: title, href: `/${page}` }]} />
      <article className="container-page max-w-3xl">
        {content && page === "size-guide" ? (
          <SizeGuideContent body={content.body} />
        ) : content && hasBody ? (
          <>
            {content.updatedAt && isPolicySlug(page) && <p className="mb-8 text-sm text-cocoa">Last updated {formatDate(content.updatedAt)}</p>}
            <RichBody body={content.body} />
          </>
        ) : (
          <p className="border border-dashed border-taupe p-6 text-center text-cocoa">
            This page is being updated. Questions in the meantime? <Link href="/contact" className="underline underline-offset-4">Contact us</Link>.
          </p>
        )}
      </article>
    </>
  );
}
