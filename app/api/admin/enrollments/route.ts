import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";

const BASE_URL = "https://balance-of-nature.sellability.net/api/v1";

type SellabilityRecord = Record<string, unknown> & {
  id: string | number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSellabilityRecord(value: unknown): value is SellabilityRecord {
  return (
    isRecord(value) &&
    (typeof value.id === "string" || typeof value.id === "number")
  );
}

function dateValue(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  const session = await getServerSession();

  if (!isAdminEmail(session?.user?.email)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const apiKey = process.env.SELLABILITY_API_KEY;
  if (!apiKey) {
    console.error("Sellability enrollments are not configured: SELLABILITY_API_KEY is missing.");
    return jsonResponse({ error: "Sellability is not configured." }, 503);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
  const fetchOptions = { headers, next: { revalidate: 60 } };

  try {
    const [coursesRes, studentsRes, enrollmentsRes] = await Promise.all([
      fetch(`${BASE_URL}/courses?limit=100`, fetchOptions),
      fetch(`${BASE_URL}/students?limit=100`, fetchOptions),
      fetch(`${BASE_URL}/enrollments?limit=100`, fetchOptions),
    ]);

    if (!coursesRes.ok || !studentsRes.ok || !enrollmentsRes.ok) {
      console.error("Sellability enrollment lookup failed:", {
        coursesStatus: coursesRes.status,
        studentsStatus: studentsRes.status,
        enrollmentsStatus: enrollmentsRes.status,
      });
      return jsonResponse({ error: "Failed to connect to Sellability." }, 502);
    }

    const [coursesData, studentsData, enrollmentsData] = await Promise.all([
      coursesRes.json() as Promise<unknown>,
      studentsRes.json() as Promise<unknown>,
      enrollmentsRes.json() as Promise<unknown>,
    ]);

    if (
      !Array.isArray(coursesData) ||
      !coursesData.every(isSellabilityRecord) ||
      !Array.isArray(studentsData) ||
      !studentsData.every(isSellabilityRecord) ||
      !Array.isArray(enrollmentsData) ||
      !enrollmentsData.every(isSellabilityRecord)
    ) {
      console.error("Sellability returned an unexpected enrollment data response.");
      return jsonResponse({ error: "Sellability returned invalid data." }, 502);
    }

    const studentsById = new Map(
      studentsData.map((student) => [String(student.id), student]),
    );
    const coursesById = new Map(
      coursesData.map((course) => [String(course.id), course]),
    );

    const enrollments = enrollmentsData.flatMap((enrollment) => {
      const student = studentsById.get(String(enrollment.student_id));
      const course = coursesById.get(String(enrollment.course_id));

      if (!student || !course) {
        return [];
      }

      const startedAt = dateValue(enrollment.started_at);
      const completedAt = dateValue(enrollment.completed_at);
      const status = completedAt
        ? "Completed"
        : startedAt
          ? "In Progress"
          : "Not Started";

      return [
        {
          enrollmentId: enrollment.id,
          studentName:
            typeof student.name === "string" && student.name.trim()
              ? student.name.trim()
              : [student.first_name, student.last_name]
                  .filter((name): name is string => typeof name === "string" && Boolean(name.trim()))
                  .join(" ") || "Unknown Student",
          studentEmail:
            typeof student.email === "string" ? student.email.trim() : "",
          courseTitle:
            typeof course.name === "string" ? course.name : "Untitled Course",
          status,
          progressPercentage: completedAt ? 100 : startedAt ? 50 : 0,
          startedAt,
          completedAt,
          courseUrl: `${BASE_URL.replace("/api/v1", "")}/courses/${encodeURIComponent(String(course.id))}`,
        },
      ];
    });

    return jsonResponse(enrollments);
  } catch (error) {
    console.error("Sellability enrollment lookup failed:", error);
    return jsonResponse({ error: "Unable to load Sellability enrollments." }, 502);
  }
}
