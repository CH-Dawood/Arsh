import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/auth-forms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Sign In", description: "Sign in to your account.", path: "/login", noIndex: true });

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="container-page max-w-md py-16 sm:py-24">
      <h1 className="text-center text-heading">Welcome back</h1>
      <p className="mt-3 text-center text-cocoa">Sign in to track orders and save your details.</p>
      <div className="mt-10">
        <Suspense fallback={<LoginForm />}>
          {searchParams.then((sp) => <LoginForm next={typeof sp.next === "string" ? sp.next : undefined} />)}
        </Suspense>
      </div>
    </div>
  );
}
