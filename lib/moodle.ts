export interface MoodleCourse {
  id: number | string;
  fullname: string;
  progress?: number | null;
  [key: string]: unknown;
}

export class MoodleApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "MoodleApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMoodleCourse(value: unknown): value is MoodleCourse {
  return (
    isRecord(value) &&
    (typeof value.id === "number" || typeof value.id === "string") &&
    typeof value.fullname === "string" &&
    (value.progress === undefined ||
      value.progress === null ||
      typeof value.progress === "number")
  );
}

async function fetchMoodleJson(url: URL, failureMessage: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    throw new MoodleApiError("Unable to communicate with Moodle.");
  }

  if (!response.ok) {
    throw new MoodleApiError(failureMessage);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new MoodleApiError("Moodle returned an invalid response.");
  }

  if (isRecord(data) && ("exception" in data || "errorcode" in data)) {
    throw new MoodleApiError(failureMessage);
  }

  return data;
}

export async function getMoodleCourses(email: string): Promise<MoodleCourse[]> {
  const moodleUrl = process.env.MOODLE_URL;
  const token = process.env.MOODLE_TOKEN;

  if (!moodleUrl || !token) {
    throw new MoodleApiError("Missing Moodle configuration.", 500);
  }

  const endpoint = new URL(
    `${moodleUrl.replace(/\/+$/, "")}/webservice/rest/server.php`,
  );
  endpoint.searchParams.set("wstoken", token.trim());
  endpoint.searchParams.set("moodlewsrestformat", "json");

  const userLookupUrl = new URL(endpoint);
  userLookupUrl.searchParams.set("wsfunction", "core_user_get_users_by_field");
  userLookupUrl.searchParams.set("field", "email");
  userLookupUrl.searchParams.set("values[0]", email);

  const users: unknown = await fetchMoodleJson(
    userLookupUrl,
    "Moodle user lookup failed.",
  );
  if (!Array.isArray(users)) {
    throw new MoodleApiError("Moodle returned an invalid user lookup response.");
  }

  if (users.length === 0) {
    return [];
  }

  const moodleUserId = isRecord(users[0]) ? users[0].id : undefined;
  if (typeof moodleUserId !== "number" && typeof moodleUserId !== "string") {
    throw new MoodleApiError("Moodle user response is missing an ID.");
  }

  const coursesUrl = new URL(endpoint);
  coursesUrl.searchParams.set("wsfunction", "core_enrol_get_users_courses");
  coursesUrl.searchParams.set("userid", String(moodleUserId));

  const courses: unknown = await fetchMoodleJson(
    coursesUrl,
    "Moodle course lookup failed.",
  );
  if (!Array.isArray(courses) || !courses.every(isMoodleCourse)) {
    throw new MoodleApiError("Moodle returned an invalid course list.");
  }

  return courses;
}
