import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartSync } from "@/components/cart/cart-sync";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { getCategories, getSettings, isDemoCatalog } from "@/lib/catalog";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <>
      <a href="#main" className="label sr-only z-50 bg-espresso px-4 py-3 text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {isDemoCatalog && (
        <p className="bg-champagne px-4 py-2 text-center text-xs text-cocoa">
          Preview mode: demo products, prices and photography (Unsplash). Orders open once the store database is connected.
        </p>
      )}
      <Header
        storeName={settings.storeName}
        freeShippingThreshold={settings.freeShippingThreshold}
        categories={categories.map(({ name, slug }) => ({ name, slug }))}
      />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <WhatsAppButton number={settings.whatsappNumber} message={settings.whatsappMessage} />
      <CartDrawer freeShippingThreshold={settings.freeShippingThreshold} />
      <CartSync />
    </>
  );
}
