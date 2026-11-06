import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardContent from "./dashboard-content";
import { isAdminEmail } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const name = session.user.name?.trim();

  return (
    <DashboardContent
      welcomeMessage={name ? `Welcome back, ${name}.` : "Welcome back."}
      isAdmin={isAdminEmail(session.user.email)}
      userEmail={session.user.email}
    />
  );
}
