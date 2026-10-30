import Link from "next/link";
import { cacheLife } from "next/cache";
import { Banknote, Landmark } from "lucide-react";
import { FacebookIcon, InstagramIcon, TiktokIcon } from "@/components/ui/brand-icons";
import type { StoreSettings } from "@/lib/catalog/types";
import { BackToTop, NewsletterForm } from "./footer-client";
import { policyNav, supportNav } from "./nav-links";

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer({ settings }: { settings: StoreSettings }) {
  const year = await currentYear();
  const socials = [
    { url: settings.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { url: settings.tiktokUrl, label: "TikTok", Icon: TiktokIcon },
    { url: settings.facebookUrl, label: "Facebook", Icon: FacebookIcon },
  ].filter((s): s is typeof s & { url: string } => Boolean(s.url));

  const column = (title: string, links: readonly { href: string; label: string }[]) => (
    <div>
      <h2 className="label text-champagne">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm text-ivory/75">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="transition-colors hover:text-ivory">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="mt-24 bg-espresso text-ivory sm:mt-32">
      <div className="container-page grid gap-10 border-b border-ivory/10 py-14 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="label text-champagne">The {settings.storeName} letter</p>
          <h2 className="mt-3 text-3xl text-ivory sm:text-4xl">New collections, first.</h2>
          <p className="mt-3 max-w-md text-sm text-ivory/70">Early access to launches, private sales and styling notes. No spam, unsubscribe any time.</p>
        </div>
        <NewsletterForm />
      </div>

      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-12 py-14 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="font-display text-3xl uppercase tracking-[0.3em]">{settings.storeName}</Link>
          {settings.tagline && <p className="mt-4 max-w-xs text-sm text-ivory/70">{settings.tagline}</p>}
          {(settings.contactPhone || settings.contactEmail) && (
            <p className="mt-4 space-y-1 text-sm text-ivory/70">
              {settings.contactPhone && <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="block hover:text-ivory">{settings.contactPhone}</a>}
              {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`} className="block hover:text-ivory">{settings.contactEmail}</a>}
            </p>
          )}
        </div>
        {column("Customer Support", supportNav)}
        {column("Policies", policyNav)}
        <div>
          <h2 className="label text-champagne">Follow Us</h2>
          {socials.length > 0 ? (
            <ul className="mt-5 flex gap-3">
              {socials.map(({ url, label, Icon }) => (
                <li key={label}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.storeName} on ${label} (opens in a new tab)`}
                    className="grid size-11 place-items-center border border-ivory/25 transition-[background-color,color,transform] duration-300 ease-luxe hover:-translate-y-0.5 hover:bg-ivory hover:text-espresso"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-ivory/50">Social profiles appear here once added in Admin → Settings.</p>
          )}
        </div>
      </div>

      <div className="container-page flex flex-col gap-6 border-t border-ivory/10 py-8 sm:flex-row sm:items-center sm:justify-between">
        <ul className="flex flex-wrap items-center gap-3" aria-label="Accepted payment methods">
          {settings.codEnabled && (
            <li className="label flex items-center gap-2 border border-ivory/20 px-3 py-2 text-[0.625rem] text-ivory/80">
              <Banknote className="size-4" strokeWidth={1.5} aria-hidden /> Cash on Delivery
            </li>
          )}
          {settings.bankTransferEnabled && (
            <li className="label flex items-center gap-2 border border-ivory/20 px-3 py-2 text-[0.625rem] text-ivory/80">
              <Landmark className="size-4" strokeWidth={1.5} aria-hidden /> Bank Transfer
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between gap-8 text-xs text-ivory/60">
          <p>© {year} {settings.storeName}. All rights reserved.</p>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
