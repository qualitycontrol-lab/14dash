import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getMoodleCourses, MoodleApiError } from "@/lib/moodle";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email;

  if (!email) {
    const response = NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    console.error("API response error:", response.status, await response.clone().text());
    return response;
  }

  try {
    return NextResponse.json(await getMoodleCourses(email));
  } catch (error) {
    console.error("Moodle Fetch Error:", error);
    if (error instanceof MoodleApiError) {
      const response = NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
      if (!response.ok) {
        console.error("API response error:", response.status, await response.clone().text());
      }
      return response;
    }

    throw error;
  }
}