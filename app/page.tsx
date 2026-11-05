import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardContent from "./dashboard-content";
import { isAdminEmail } from "@/lib/auth";
import { MOCK_MOODLE_COURSES } from "@/lib/moodle";

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
      courses={MOCK_MOODLE_COURSES}
      courseError={null}
      moodleUrl={process.env.MOODLE_URL ?? ""}
    />
  );
}
