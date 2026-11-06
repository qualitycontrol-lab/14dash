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
    const [coursesRes, studentsRes] = await Promise.all([
      fetch(`${BASE_URL}/courses?limit=100`, { headers, cache: "no-store" }),
      fetch(`${BASE_URL}/students?limit=100`, { headers, cache: "no-store" }),
    ]);

    if (!coursesRes.ok || !studentsRes.ok) {
      console.error("Sellability course lookup failed:", {
        coursesStatus: coursesRes.status,
        studentsStatus: studentsRes.status,
      });
      return jsonResponse({ error: "Failed to connect to Sellability" }, 502);
    }

    const [coursesData, studentsData] = await Promise.all([
      coursesRes.json() as Promise<unknown>,
      studentsRes.json() as Promise<unknown>,
    ]);

    if (
      !Array.isArray(coursesData) ||
      !coursesData.every(isSellabilityRecord) ||
      !Array.isArray(studentsData) ||
      !studentsData.every(isSellabilityRecord)
    ) {
      console.error("Sellability returned an unexpected courses or students response.");
      return jsonResponse({ error: "Sellability returned invalid data." }, 502);
    }

    const student = studentsData.find(
      (record) =>
        typeof record.email === "string" &&
        record.email.trim().toLowerCase() === email,
    );

    if (!student) {
      return jsonResponse({ courses: [], message: "No student found with this email" });
    }

    const enrollmentsRes = await fetch(`${BASE_URL}/enrollments?limit=100`, {
      headers,
      cache: "no-store",
    });

    if (!enrollmentsRes.ok) {
      console.error("Sellability enrollment lookup failed:", enrollmentsRes.status);
      return jsonResponse({ error: "Failed to connect to Sellability" }, 502);
    }

    const enrollmentsData: unknown = await enrollmentsRes.json();
    if (
      !Array.isArray(enrollmentsData) ||
      !enrollmentsData.every(isSellabilityRecord)
    ) {
      console.error("Sellability returned an unexpected enrollments response.");
      return jsonResponse({ error: "Sellability returned invalid data." }, 502);
    }

    const studentEnrollments = enrollmentsData.filter(
      (enrollment) =>
        String(enrollment.student_id) === String(student.id) &&
        enrollment.active === true,
    );

    const userCourses = studentEnrollments.map((enrollment) => {
      const course = coursesData.find(
        (record) => String(record.id) === String(enrollment.course_id),
      );
      const isComplete = Boolean(enrollment.completed_at);
      const isStarted = Boolean(enrollment.started_at);
      const courseId = enrollment.course_id;

      return {
        id: enrollment.id,
        courseId,
        title: typeof course?.name === "string" ? course.name : "Assigned Course",
        summary:
          typeof course?.summary === "string"
            ? course.summary
            : "Review required workplace material and complete your training.",
        progress: isComplete ? 100 : isStarted ? 50 : 0,
        status: isComplete ? "Completed" : isStarted ? "In Progress" : "Not Started",
        url: `${BASE_URL.replace("/api/v1", "")}/courses/${encodeURIComponent(String(courseId))}`,
      };
    });

    return jsonResponse({ courses: userCourses });
  } catch (error) {
    console.error("Sellability course lookup failed:", error);
    return jsonResponse({ error: "Unable to load courses from Sellability." }, 502);
  }
}
