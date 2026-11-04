import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  let cloudflareEnv: CloudflareEnv | undefined;
  let cloudflareContextError: unknown;

  try {
    cloudflareEnv = (await getCloudflareContext({ async: true })).env;
  } catch (error: unknown) {
    cloudflareContextError = error;
  }

  const moodleUrl = cloudflareEnv?.MOODLE_URL || process.env.MOODLE_URL;
  const token = cloudflareEnv?.MOODLE_TOKEN || process.env.MOODLE_TOKEN;

  if (!moodleUrl || !token) {
    if (cloudflareContextError) {
      const message =
        cloudflareContextError instanceof Error
          ? cloudflareContextError.message
          : "Unknown Cloudflare context error";
      return NextResponse.json(
        { error: `Unable to access Cloudflare runtime bindings: ${message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Missing Moodle configuration.",
        missing: [
          ...(!moodleUrl ? ["MOODLE_URL"] : []),
          ...(!token ? ["MOODLE_TOKEN"] : []),
        ],
      },
      { status: 500 }
    );
  }

  try {
    const cleanUrl = moodleUrl.replace(/\/+$/, "");
    const query = new URLSearchParams({
      wstoken: token,
      wsfunction: "core_course_get_courses",
      moodlewsrestformat: "json",
    });
    const res = await fetch(
      `${cleanUrl}/webservice/rest/server.php?${query}`,
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