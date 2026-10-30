import type { Metadata } from "next";
import { env } from "@/lib/env";

export const absoluteUrl = (path = "/") => `${env.siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

/** Per-page metadata with canonical URL and social cards. Titles get the store name from the root template. */
export function pageMetadata({ title, description, path, image, noIndex }: {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt: string };
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", images: image ? [{ url: image.url, alt: image.alt }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image.url] : undefined },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

/** Serialises JSON-LD safely for a <script> tag (escapes "<" so content can't close the tag). */
export const jsonLd = (data: object) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />;
}
