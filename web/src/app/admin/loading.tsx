import { PageSkeleton } from "@/components/admin/ui";

// Shown the moment an admin link is clicked, while the server checks the session and loads data.
export default function AdminLoading() {
  return <PageSkeleton />;
}
