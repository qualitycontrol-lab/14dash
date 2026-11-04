import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardContent from "./dashboard-content";
import { getMoodleCourses, MoodleApiError, type MoodleCourse } from "@/lib/moodle";

export default async function Home() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/api/auth/signin");
  }

  let courses: MoodleCourse[] = [];
  let courseError: string | null = null;
  try {
    courses = await getMoodleCourses(session.user.email);
  } catch (error) {
    if (error instanceof MoodleApiError) {
      courseError = error.message;
    } else {
      throw error;
    }
  }

  const welcomeMessage = `Welcome, ${session.user?.name ?? session.user?.email ?? "there"}`;

  return (
    <DashboardContent
      welcomeMessage={welcomeMessage}
      courses={courses}
      courseError={courseError}
      moodleUrl={process.env.MOODLE_URL ?? ""}
    />
  );
}
