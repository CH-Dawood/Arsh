"use client";

import { Button, ButtonLink } from "@/components/ui/button";

/** Route-level error boundary: a calm message for customers; details stay in server logs. */
export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <h1 className="text-heading">Something went wrong</h1>
      <p className="mt-4 max-w-md text-cocoa">Please try again. If the problem continues, contact us and we&apos;ll help.</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">Back to home</ButtonLink>
      </div>
    </div>
  );
}
