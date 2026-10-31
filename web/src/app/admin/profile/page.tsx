import { Suspense } from "react";
import { ProfileForm } from "@/components/admin/profile-form";
import { AdminButton, AdminPageHeader, Card, Skeleton, formatDateTime } from "@/components/admin/ui";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser, requireAdmin } from "@/lib/auth";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <AdminPageHeader title="Profile" description="Your admin account details." />
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Profile />
      </Suspense>
    </>
  );
}

async function Profile() {
  const { supabase, userId } = await requireAdmin();
  const [{ data: profile }, user] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, role, created_at").eq("id", userId).single(),
    getCurrentUser(),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Details">
        <ProfileForm initial={{ full_name: profile?.full_name ?? "", phone: profile?.phone ?? "" }} />
      </Card>
      <Card title="Account">
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-cocoa">Email</dt><dd>{user?.email ?? "—"}</dd>
          <dt className="text-cocoa">Role</dt><dd className="capitalize">{profile?.role ?? "admin"}</dd>
          {profile?.created_at && <><dt className="text-cocoa">Member since</dt><dd>{formatDateTime(profile.created_at)}</dd></>}
        </dl>
        <div className="border-t border-hairline p-5">
          <p className="mb-3 text-xs text-cocoa">Admin access is granted in the database by an existing admin; it can&apos;t be changed from this page.</p>
          <form action={logout}><AdminButton type="submit" variant="outline">Sign out</AdminButton></form>
        </div>
      </Card>
    </div>
  );
}
