import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <p className="label text-gold-deep">Error 404</p>
      <h1 className="mt-4 text-display">This page has moved on</h1>
      <p className="mt-5 max-w-md text-cocoa">The piece or page you&apos;re looking for isn&apos;t here. It may have sold out or the link may be incorrect.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/search" variant="outline">Search the store</ButtonLink>
      </div>
    </div>
  );
}
