import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardContent from "./dashboard-content";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect("/api/auth/signin");
  }

  const welcomeMessage = `Welcome, ${session.user?.name ?? session.user?.email ?? "there"}`;

  return <DashboardContent welcomeMessage={welcomeMessage} />;
}
