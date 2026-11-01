import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/forms/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Choose a New Password", description: "Choose a new password.", path: "/reset-password", noIndex: true });

export default function ResetPasswordPage() {
  return (
    <div className="container-page max-w-md py-16 sm:py-24">
      <h1 className="text-center text-heading">Choose a new password</h1>
      <div className="mt-10">
        <Suspense fallback={null}>
          <ResetBody />
        </Suspense>
      </div>
    </div>
  );
}

async function ResetBody() {
  // The reset link signs the person in first (see /auth/callback); without a session there is nothing to reset.
  if (!(await getCurrentUser())) {
    return (
      <p className="text-center text-cocoa">
        This page opens from the link in your reset email.{" "}
        <Link href="/forgot-password" className="text-espresso underline underline-offset-4">Request a new link</Link>
      </p>
    );
  }
  return <ResetPasswordForm />;
}
