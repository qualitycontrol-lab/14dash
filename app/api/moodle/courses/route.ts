import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { MOCK_MOODLE_COURSES } from "@/lib/moodle";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email;

  if (!email?.trim().toLowerCase().endsWith("@bonadmin.com")) {
    const response = NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    console.error("API response error:", response.status, await response.clone().text());
    return response;
  }

  return NextResponse.json(MOCK_MOODLE_COURSES);
}