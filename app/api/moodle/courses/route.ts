import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const moodleUrl = process.env.MOODLE_URL || "https://moodle-dev.starksys.dev";
  const token = process.env.MOODLE_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "Missing MOODLE_TOKEN." }, { status: 500 });
  }

  const targetApiUrl = `${moodleUrl}/webservice/rest/server.php?wstoken=${token.trim()}&wsfunction=core_course_get_courses&moodlewsrestformat=json`;

  try {
    const res = await fetch(targetApiUrl, { cache: "no-store" });
    const data = await res.json();

    if (data.exception || data.errorcode) {
      return NextResponse.json({ error: data.message || data.errorcode }, { status: 400 });
    }

    const courses = Array.isArray(data) ? data.filter((c: { id: number }) => c.id !== 1) : [];
    return NextResponse.json({ success: true, count: courses.length, courses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}