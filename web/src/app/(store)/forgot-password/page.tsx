import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Reset Password", description: "Reset your account password.", path: "/forgot-password", noIndex: true });

export default function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  return (
    <div className="container-page max-w-md py-16 sm:py-24">
      <h1 className="text-center text-heading">Reset your password</h1>
      <p className="mt-3 text-center text-cocoa">Enter your account email and we&apos;ll send you a link to choose a new password.</p>
      <Suspense fallback={null}>
        {searchParams.then((sp) => sp.expired ? (
          <p role="alert" className="mt-6 border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">That link has expired or was already used. Request a new one below.</p>
        ) : null)}
      </Suspense>
      <div className="mt-10"><ForgotPasswordForm /></div>
    </div>
  );
}
