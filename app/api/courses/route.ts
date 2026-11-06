import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";

const BASE_URL = "https://balance-of-nature.sellability.net/api/v1";

type SellabilityRecord = Record<string, unknown> & {
  id: string | number;
};

function idKey(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSellabilityRecord(value: unknown): value is SellabilityRecord {
  return (
    isRecord(value) &&
    (typeof value.id === "string" || typeof value.id === "number")
  );
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const session = await getServerSession();
  const sessionEmail = session?.user?.email?.trim().toLowerCase();

  if (!sessionEmail) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();

  if (!email) {
    return jsonResponse({ error: "Email query parameter is required" }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "A valid email address is required" }, 400);
  }

  if (email !== sessionEmail && !isAdminEmail(sessionEmail)) {
    return jsonResponse({ error: "Unauthorized." }, 403);
  }

  const apiKey = process.env.SELLABILITY_API_KEY;
  if (!apiKey) {
    console.error("Sellability courses are not configured: SELLABILITY_API_KEY is missing.");
    return jsonResponse({ error: "Courses are not configured." }, 503);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  try {
    const [coursesRes, studentsRes, enrollmentsRes] = await Promise.all([
      fetch(`${BASE_URL}/courses?limit=100`, {
        headers,
        next: { revalidate: 86400 },
      }),
      fetch(
        `${BASE_URL}/students?email=${encodeURIComponent(email)}&limit=100&offset=0`,
        {
          headers,
          next: { revalidate: 3600 },
        },
      ),
      fetch(`${BASE_URL}/enrollments?limit=100&offset=0`, {
        headers,
        next: { revalidate: 60 },
      }),
    ]);

    if (!coursesRes.ok || !enrollmentsRes.ok) {
      console.error("Sellability course/enrollment lookup failed:", {
        coursesStatus: coursesRes.status,
        enrollmentsStatus: enrollmentsRes.status,
      });
      return jsonResponse({ error: "Failed to connect to Sellability" }, 502);
    }

    const [coursesData, studentsData] = await Promise.all([
      coursesRes.json() as Promise<unknown>,
      studentsRes.ok ? studentsRes.json() as Promise<unknown> : Promise.resolve(null),
    ]);
    const enrollmentsData: unknown = await enrollmentsRes.json();

    if (
      !Array.isArray(coursesData) ||
      !coursesData.every(isSellabilityRecord) ||
      !Array.isArray(enrollmentsData) ||
      !enrollmentsData.every(isSellabilityRecord)
    ) {
      console.error("Sellability returned an unexpected courses or enrollments response.");
      return jsonResponse({ error: "Sellability returned invalid data." }, 502);
    }

    const students = Array.isArray(studentsData)
      ? studentsData.filter(isSellabilityRecord)
      : isSellabilityRecord(studentsData)
        ? [studentsData]
        : [];
    const student = students.find(
      (record) =>
        typeof record.email === "string" &&
        record.email.trim().toLowerCase() === email,
    );

    if (!studentsRes.ok) {
      console.warn("Sellability student email lookup is unavailable; checking embedded enrollment students.", {
        status: studentsRes.status,
      });
    }

    const studentId = student ? idKey(student.id) : null;
    const studentEnrollments = enrollmentsData.filter((enrollment) => {
      if (enrollment.active !== true) return false;
      const embeddedStudent = isRecord(enrollment.student)
        ? enrollment.student
        : undefined;
      const emailMatches =
        typeof embeddedStudent?.email === "string" &&
        embeddedStudent.email.trim().toLowerCase() === email;
      const idMatches =
        studentId !== null && idKey(enrollment.student_id) === studentId;
      return emailMatches || idMatches;
    });

    if (studentEnrollments.length === 0) {
      return jsonResponse({
        courses: [],
        message: "No active Sellability enrollments",
      });
    }

    const coursesById = new Map(
      coursesData
        .map((course) => [idKey(course.id), course] as const)
        .filter((entry): entry is readonly [string, SellabilityRecord] => entry[0] !== null),
    );
    const unresolvedCourseIds = [
      ...new Set(
        studentEnrollments
          .map((enrollment) => idKey(enrollment.course_id))
          .filter((id): id is string => id !== null && !coursesById.has(id)),
      ),
    ];
    const courseDetails = await Promise.all(
      unresolvedCourseIds.map(async (courseId) => {
        const response = await fetch(
          `${BASE_URL}/courses/${encodeURIComponent(courseId)}`,
          { headers, next: { revalidate: 86400 } },
        );
        if (!response.ok) {
          console.warn("Sellability course detail lookup failed:", {
            courseId,
            status: response.status,
          });
          return null;
        }
        const data: unknown = await response.json();
        return isSellabilityRecord(data) ? data : null;
      }),
    );
    for (const course of courseDetails) {
      if (course) {
        const courseId = idKey(course.id);
        if (courseId) coursesById.set(courseId, course);
      }
    }

    const userCourses = studentEnrollments.map((enrollment) => {
      const courseId = idKey(enrollment.course_id);
      const course = courseId ? coursesById.get(courseId) : undefined;
      const isComplete = Boolean(enrollment.completed_at);
      const isStarted = Boolean(enrollment.started_at);

      return {
        id: enrollment.id,
        courseId: courseId ?? "",
        title: typeof course?.name === "string" ? course.name : "Assigned Course",
        summary:
          typeof course?.summary === "string"
            ? course.summary
            : "Review required workplace material and complete your training.",
        progress: isComplete ? 100 : isStarted ? 50 : 0,
        status: isComplete ? "Completed" : isStarted ? "In Progress" : "Not Started",
        startedAt: typeof enrollment.started_at === "string" ? enrollment.started_at : null,
        completedAt: typeof enrollment.completed_at === "string" ? enrollment.completed_at : null,
        url: `${BASE_URL.replace("/api/v1", "")}/courses/${encodeURIComponent(String(enrollment.course_id))}`,
      };
    });

    return jsonResponse({ courses: userCourses });
  } catch (error) {
    console.error("Sellability course lookup failed:", error);
    return jsonResponse({ error: "Unable to load courses from Sellability." }, 502);
  }
}
