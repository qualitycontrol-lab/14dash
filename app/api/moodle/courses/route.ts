import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function GET() {
  let moodleUrl = process.env.MOODLE_URL;
  let token = process.env.MOODLE_TOKEN;

  try {
    const cf = getCloudflareContext();
    if (cf?.env) {
      const cfEnv = cf.env as Record<string, string | undefined>;
      moodleUrl = moodleUrl || cfEnv.MOODLE_URL;
      token = token || cfEnv.MOODLE_TOKEN;
    }
  } catch {}

  if (!moodleUrl || !token) {
    return NextResponse.json(
      { error: "Missing MOODLE_URL or MOODLE_TOKEN in Cloudflare environment." },
      { status: 500 }
    );
  }

  // Sanitize: strip trailing slashes, whitespace, and any /login path
  const cleanUrl = moodleUrl
    .trim()
    .replace(/\/login(\/index\.php)?\/?$/i, "")
    .replace(/\/+$/, "");

  const cleanToken = token.trim();
  const targetApiUrl = `${cleanUrl}/webservice/rest/server.php?wstoken=${cleanToken}&wsfunction=core_course_get_courses&moodlewsrestformat=json`;

  try {
    const res = await fetch(targetApiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "BON-Dashboard-Worker/1.0",
      },
    });

    const rawText = await res.text();

    // Check if upstream returned a Cloudflare error (like 1016) or HTML
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Upstream server returned non-JSON response",
          http_status: res.status,
          target_url: targetApiUrl,
          raw_snippet: rawText.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (data.exception || data.errorcode) {
      return NextResponse.json({ error: data.message || data.errorcode }, { status: 400 });
    }

    // Filter out Moodle's frontpage container (course ID 1)
    const courses = Array.isArray(data) ? data.filter((c: { id: number }) => c.id !== 1) : [];

    return NextResponse.json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to Moodle";
    return NextResponse.json({ error: message, target_url: targetApiUrl }, { status: 500 });
  }
}