import Link from "next/link";
import { WhatsappIcon } from "@/components/ui/brand-icons";
import { whatsappLink } from "@/lib/format";

/**
 * Floating chat button. Opens WhatsApp when a business number is configured in settings;
 * until then it links to the contact page rather than inventing a number.
 */
export function WhatsAppButton({ number, message }: { number: string | null; message: string | null }) {
  const cls =
    "group fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform duration-300 ease-luxe hover:-translate-y-1 hover:scale-105 sm:bottom-8 sm:right-8";
  const icon = (
    <>
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/30 [animation-duration:2.6s] motion-reduce:hidden" aria-hidden />
      <WhatsappIcon className="relative size-7" />
    </>
  );

  return number ? (
    <a href={whatsappLink(number, message)} target="_blank" rel="noopener noreferrer" className={cls} aria-label="Chat with us on WhatsApp (opens in a new tab)">
      {icon}
    </a>
  ) : (
    <Link href="/contact" className={cls} aria-label="Contact us" title="WhatsApp number not configured yet">
      {icon}
    </Link>
  );
}
