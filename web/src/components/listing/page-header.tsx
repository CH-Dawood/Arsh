import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export function PageHeader({ title, description, eyebrow, crumbs }: {
  title: string;
  description?: string | null;
  eyebrow?: string;
  crumbs: { name: string; href: string }[];
}) {
  return (
    <div className="container-page pb-10 pt-6 sm:pt-8">
      <Breadcrumbs items={crumbs} />
      <div className="mx-auto mt-10 max-w-2xl text-center sm:mt-14">
        {eyebrow && <p className="label text-gold-deep">{eyebrow}</p>}
        <h1 className="mt-3 text-display">{title}</h1>
        {description && <p className="mt-5 text-lg font-light text-cocoa">{description}</p>}
      </div>
    </div>
  );
}
