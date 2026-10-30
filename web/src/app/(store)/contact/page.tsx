import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { PageHeader } from "@/components/listing/page-header";
import { WhatsappIcon } from "@/components/ui/brand-icons";
import { getSettings } from "@/lib/catalog";
import { whatsappLink } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Contact Us", description: "Questions about an order, sizing or a piece? Get in touch.", path: "/contact" });

export default async function ContactPage() {
  const s = await getSettings();
  const channels = [
    s.whatsappNumber && { Icon: WhatsappIcon, label: "WhatsApp", value: "Chat with us", href: whatsappLink(s.whatsappNumber, s.whatsappMessage) },
    s.contactPhone && { Icon: Phone, label: "Phone", value: s.contactPhone, href: `tel:${s.contactPhone.replace(/[^\d+]/g, "")}` },
    s.contactEmail && { Icon: Mail, label: "Email", value: s.contactEmail, href: `mailto:${s.contactEmail}` },
    s.address && { Icon: MapPin, label: "Studio", value: s.address, href: null },
  ].filter(Boolean) as { Icon: React.ComponentType<{ className?: string }>; label: string; value: string; href: string | null }[];

  return (
    <>
      <PageHeader title="Contact Us" description="Questions about an order, sizing or a piece? We're happy to help." crumbs={[{ name: "Contact Us", href: "/contact" }]} />
      <div className="container-page grid gap-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl">Reach us directly</h2>
          {channels.length ? (
            <ul className="mt-8 space-y-6">
              {channels.map(({ Icon, label, value, href }) => (
                <li key={label} className="flex gap-4">
                  <Icon className="mt-1 size-5 shrink-0 text-gold-deep" />
                  <div>
                    <p className="label text-cocoa">{label}</p>
                    {href ? (
                      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="mt-1 block hover:text-gold-deep">{value}</a>
                    ) : <p className="mt-1">{value}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 border border-dashed border-taupe p-4 text-sm text-cocoa">Phone, email, WhatsApp and address appear here once added in Admin → Settings. Meanwhile, use the form.</p>
          )}
        </div>
        <ContactForm />
      </div>
    </>
  );
}
