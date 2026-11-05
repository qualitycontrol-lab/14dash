import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import AdminContent from "./admin-content";
import { isAdminEmail } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    redirect("/sign-in");
  }

  return <AdminContent adminName={session.user.name ?? "Administrator"} />;
}
