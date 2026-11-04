import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getMoodleCourses, MoodleApiError } from "@/lib/moodle";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getMoodleCourses(email));
  } catch (error) {
    if (error instanceof MoodleApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}