export interface MoodleCourse {
  id: number | string;
  fullname: string;
  summary?: string;
  progress?: number | null;
  url?: string;
  [key: string]: unknown;
}

export const MOCK_MOODLE_COURSES: MoodleCourse[] = [
  {
    id: 101,
    fullname: "BON Compliance & Safety Training",
    summary: "Review essential workplace compliance and safety practices.",
    progress: 85,
    url: "https://moodle-dev.starksys.dev/course/view.php?id=101",
  },
  {
    id: 102,
    fullname: "Cybersecurity Essentials 2026",
    summary: "Learn how to recognize threats and protect organizational data.",
    progress: 40,
    url: "https://moodle-dev.starksys.dev/course/view.php?id=102",
  },
  {
    id: 103,
    fullname: "Operational Leadership",
    summary: "Build practical leadership skills for daily operations.",
    progress: 0,
    url: "https://moodle-dev.starksys.dev/course/view.php?id=103",
  },
  {
    id: 104,
    fullname: "Effective Communication at Work",
    summary: "Practice clear, constructive communication with colleagues.",
    progress: 65,
    url: "https://moodle-dev.starksys.dev/course/view.php?id=104",
  },
];

export class MoodleApiError extends Error {
  readonly cause: unknown;

  constructor(
    message: string,
    readonly status = 502,
    cause?: unknown,
  ) {
    super(message);
    this.name = "MoodleApiError";
    this.cause = cause;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getErrorCause(error: unknown): unknown {
  return isRecord(error) && "cause" in error ? error.cause : undefined;
}

export function logMoodleFetchError(error: unknown): void {
  const message = getErrorMessage(error);
  const cause = getErrorCause(error);
  console.error("Moodle Fetch Error:", message, JSON.stringify(cause) || cause);
}

export function getMoodleErrorDetails(error: unknown): string {
  const message = getErrorMessage(error);
  const cause = getErrorCause(error);
  const causeDetails = JSON.stringify(cause) || cause;
  return causeDetails === undefined ? message : `${message}\n${String(causeDetails)}`;
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
  } catch (error) {
    logMoodleFetchError(error);
    throw new MoodleApiError(
      `Unable to communicate with Moodle: ${getErrorMessage(error)}`,
      502,
      getErrorCause(error) ?? error,
    );
  }

  let rawText: string;
  try {
    rawText = await response.text();
  } catch (error) {
    logMoodleFetchError(error);
    throw new MoodleApiError(
      `Unable to read Moodle response: ${getErrorMessage(error)}`,
      502,
      getErrorCause(error) ?? error,
    );
  }

  if (!response.ok) {
    console.error("API response error:", response.status, rawText);
    throw new MoodleApiError(`${failureMessage}: ${rawText || response.statusText}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawText);
  } catch (error) {
    logMoodleFetchError(error);
    throw new MoodleApiError(
      `Moodle returned an invalid response: ${getErrorMessage(error)}`,
      502,
      getErrorCause(error) ?? error,
    );
  }

  if (isRecord(data) && ("exception" in data || "errorcode" in data)) {
    throw new MoodleApiError(`${failureMessage}: ${JSON.stringify(data)}`);
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
