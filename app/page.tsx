import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardContent from "./dashboard-content";
import { MOCK_MOODLE_COURSES } from "@/lib/moodle";

export default async function Home() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  const welcomeMessage = `Welcome, ${session.user?.name ?? session.user?.email ?? "there"}`;

  return (
    <DashboardContent
      welcomeMessage={welcomeMessage}
      courses={MOCK_MOODLE_COURSES}
      courseError={null}
      moodleUrl={process.env.MOODLE_URL ?? "https://moodle-dev.starksys.dev"}
    />
  );
}
