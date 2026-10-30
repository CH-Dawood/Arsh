import type { Metadata } from "next";
import { RegisterForm } from "@/components/forms/auth-forms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Create Account", description: "Create an account.", path: "/register", noIndex: true });

export default function RegisterPage() {
  return (
    <div className="container-page max-w-md py-16 sm:py-24">
      <h1 className="text-center text-heading">Create your account</h1>
      <p className="mt-3 text-center text-cocoa">Faster checkout, order history and a saved wishlist.</p>
      <div className="mt-10"><RegisterForm /></div>
    </div>
  );
}
