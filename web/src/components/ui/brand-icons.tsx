import { siFacebook, siInstagram, siTiktok, siWhatsapp, type SimpleIcon } from "simple-icons";

function make(icon: SimpleIcon) {
  function BrandIcon({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden focusable="false">
        <path d={icon.path} />
      </svg>
    );
  }
  return BrandIcon;
}

export const InstagramIcon = make(siInstagram);
export const FacebookIcon = make(siFacebook);
export const TiktokIcon = make(siTiktok);
export const WhatsappIcon = make(siWhatsapp);
