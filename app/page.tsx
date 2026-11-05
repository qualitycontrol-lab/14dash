import { getServerSession } from "next-auth";
import DashboardContent from "./dashboard-content";
import SignInContent from "./sign-in-content";
import { isAdminEmail } from "@/lib/auth";
import { MOCK_MOODLE_COURSES } from "@/lib/moodle";

export default async function Home() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return <SignInContent />;
  }

  const welcomeMessage = `Welcome, ${session.user?.name ?? session.user?.email ?? "there"}`;

  return (
    <DashboardContent
      welcomeMessage={welcomeMessage}
      isAdmin={isAdminEmail(session.user.email)}
      courses={MOCK_MOODLE_COURSES}
      courseError={null}
      moodleUrl={process.env.MOODLE_URL ?? "https://moodle-dev.starksys.dev"}
    />
  );
}
