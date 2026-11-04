import { NextResponse } from "next/server";

export async function GET() {
  const moodleUrl = process.env.MOODLE_URL;
  const token = process.env.MOODLE_TOKEN;

  if (!moodleUrl || !token) {
    return NextResponse.json(
      { error: "Missing MOODLE_URL or MOODLE_TOKEN in Cloudflare environment variables." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${moodleUrl}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_course_get_courses&moodlewsrestformat=json`,
      { cache: "no-store" }
    );

    const data = await res.json();

    if (data.exception || data.errorcode) {
      return NextResponse.json({ error: data.message || data.errorcode }, { status: 400 });
    }

    // Exclude Moodle's default frontpage course (ID: 1)
    const courses = Array.isArray(data) ? data.filter((c: { id: number }) => c.id !== 1) : [];

    return NextResponse.json({ courses });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch from Moodle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}