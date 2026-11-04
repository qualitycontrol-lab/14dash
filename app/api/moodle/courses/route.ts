import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  let moodleUrl = process.env.MOODLE_URL;
  let token = process.env.MOODLE_TOKEN;

  // 1. Read Cloudflare Workers runtime environment
  try {
    const cf = await getCloudflareContext({ async: true });
    if (cf?.env) {
      const env = cf.env as Record<string, string | undefined>;
      moodleUrl = moodleUrl || env.MOODLE_URL;
      token = token || env.MOODLE_TOKEN;
    }
  } catch {
    // Falls back to process.env if running outside Cloudflare Worker isolate
  }

  // 2. Validate presence of credentials
  if (!moodleUrl || !token) {
    return NextResponse.json(
      {
        error: "Missing credentials in Cloudflare environment variables",
        detected_url: moodleUrl ? "Present" : "Missing",
        detected_token: token ? "Present" : "Missing",
      },
      { status: 500 }
    );
  }

  // 3. Automatically sanitize the URL (removes /login, /login/index.php, and trailing slashes)
  const cleanUrl = moodleUrl
    .replace(/\/login(\/index\.php)?\/?$/i, "")
    .replace(/\/+$/, "");

  const targetApiUrl = `${cleanUrl}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_course_get_courses&moodlewsrestformat=json`;

  try {
    const res = await fetch(targetApiUrl, { cache: "no-store" });
    const data = await res.json();

    if (data.exception || data.errorcode) {
      return NextResponse.json(
        {
          error: data.message || data.errorcode,
          queried_url: cleanUrl,
        },
        { status: 400 }
      );
    }

    // Filter out Moodle's default frontpage course (ID 1)
    const courses = Array.isArray(data) ? data.filter((c: { id: number }) => c.id !== 1) : [];

    return NextResponse.json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch from Moodle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}