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

function unwrapSellabilityRecord(value: unknown, key: string): SellabilityRecord | null {
  const record =
    isRecord(value) && isRecord(value[key]) ? value[key] : value;
  return isSellabilityRecord(record) ? record : null;
}

function sellabilityRecords(
  value: unknown,
  pluralKey: string,
  singularKey: string,
): SellabilityRecord[] | null {
  const records =
    Array.isArray(value)
      ? value
      : isRecord(value) && Array.isArray(value[pluralKey])
        ? value[pluralKey]
        : null;
  if (!records) return null;

  const unwrapped = records.map((record) =>
    unwrapSellabilityRecord(record, singularKey),
  );
  if (unwrapped.some((record) => record === null)) return null;
  return unwrapped.filter(
    (record): record is SellabilityRecord => record !== null,
  );
}

function idKey(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

function firstName(...values: unknown[]): string | null {
  const name = values.find(
    (value): value is string => typeof value === "string" && Boolean(value.trim()),
  );
  return name?.trim() ?? null;
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

const PAGE_SIZE = 100;

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!isAdminEmail(session?.user?.email)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
    return jsonResponse({ error: "Page must be a positive integer." }, 400);
  }
  const offset = (requestedPage - 1) * PAGE_SIZE;
  if (!Number.isSafeInteger(offset)) {
    return jsonResponse({ error: "Page is out of range." }, 400);
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

  try {
    const [coursesRes, enrollmentsRes] = await Promise.all([
      fetch(`${BASE_URL}/courses?limit=100`, {
        headers,
        next: { revalidate: 86400 },
      }),
      fetch(
        `${BASE_URL}/enrollments?limit=${PAGE_SIZE}&offset=${offset}`,
        { headers, next: { revalidate: 60 } },
      ),
    ]);

    if (!coursesRes.ok || !enrollmentsRes.ok) {
      console.error("Sellability enrollment lookup failed:", {
        coursesStatus: coursesRes.status,
        enrollmentsStatus: enrollmentsRes.status,
      });
      return jsonResponse({ error: "Failed to connect to Sellability." }, 502);
    }

    const [coursesData, enrollmentsData] = await Promise.all([
      coursesRes.json() as Promise<unknown>,
      enrollmentsRes.json() as Promise<unknown>,
    ]);

    const courses = sellabilityRecords(coursesData, "courses", "course");
    if (
      !courses ||
      !Array.isArray(enrollmentsData) ||
      !enrollmentsData.every(isSellabilityRecord)
    ) {
      console.error("Sellability returned an unexpected enrollment data response.");
      return jsonResponse({ error: "Sellability returned invalid data." }, 502);
    }

    const studentsById = new Map<string, Record<string, unknown>>();
    for (const enrollment of enrollmentsData) {
      const embeddedStudent = unwrapSellabilityRecord(enrollment.student, "student");
      const studentId = embeddedStudent ? idKey(embeddedStudent.id) : null;
      if (embeddedStudent && studentId) {
        studentsById.set(studentId, embeddedStudent);
      }
    }

    const unresolvedStudentIds = [
      ...new Set(
        enrollmentsData
          .filter((enrollment) => {
            const student =
              unwrapSellabilityRecord(enrollment.student, "student");
            const studentId = idKey(enrollment.student_id) ?? idKey(student?.id);
            return studentId !== null && !studentsById.has(studentId);
          })
          .map((enrollment) => {
            const student =
              unwrapSellabilityRecord(enrollment.student, "student");
            return idKey(enrollment.student_id) ?? idKey(student?.id);
          })
          .filter((studentId): studentId is string => studentId !== null),
      ),
    ];
    const studentDetails = await Promise.all(
      unresolvedStudentIds.map(async (studentId) => {
        const response = await fetch(
          `${BASE_URL}/students/${encodeURIComponent(studentId)}`,
          { headers, next: { revalidate: 3600 } },
        );
        if (!response.ok) {
          console.warn("Sellability student detail lookup failed:", {
            studentId,
            status: response.status,
          });
          return null;
        }
        const data: unknown = await response.json();
        const student = unwrapSellabilityRecord(data, "student");
        if (!student) {
          console.warn("Sellability returned invalid student details:", studentId);
          return null;
        }
        return student;
      }),
    );
    for (const student of studentDetails) {
      if (student) {
        const studentId = idKey(student.id);
        if (studentId) studentsById.set(studentId, student);
      }
    }

    const coursesById = new Map<string, SellabilityRecord>();
    for (const course of courses) {
      const courseId = idKey(course.id);
      if (courseId) coursesById.set(courseId, course);
    }
    for (const enrollment of enrollmentsData) {
      const embeddedCourse = unwrapSellabilityRecord(enrollment.course, "course");
      const courseId = idKey(enrollment.course_id) ?? idKey(embeddedCourse?.id);
      if (embeddedCourse && courseId && !coursesById.has(courseId)) {
        coursesById.set(courseId, embeddedCourse);
      }
    }
    const unresolvedCourseIds = [
      ...new Set(
        enrollmentsData
          .map((enrollment) => {
            const embeddedCourse =
              unwrapSellabilityRecord(enrollment.course, "course");
            return idKey(enrollment.course_id) ?? idKey(embeddedCourse?.id);
          })
          .filter((courseId): courseId is string => courseId !== null && !coursesById.has(courseId)),
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
        const course = unwrapSellabilityRecord(data, "course");
        if (!course) {
          console.warn("Sellability returned invalid course details:", courseId);
          return null;
        }
        return course;
      }),
    );
    for (const course of courseDetails) {
      if (course) {
        const courseId = idKey(course.id);
        if (courseId) coursesById.set(courseId, course);
      }
    }

    let unmatchedStudentCount = 0;
    let unmatchedCourseCount = 0;
    const enrollments = enrollmentsData.map((enrollment) => {
      const embeddedStudent = unwrapSellabilityRecord(enrollment.student, "student");
      const embeddedCourse = unwrapSellabilityRecord(enrollment.course, "course");
      const studentId = idKey(enrollment.student_id) ?? idKey(embeddedStudent?.id);
      const courseId = idKey(enrollment.course_id) ?? idKey(embeddedCourse?.id);
      const student = studentId ? studentsById.get(studentId) : undefined;
      const course = courseId ? coursesById.get(courseId) : undefined;

      if (!student) unmatchedStudentCount += 1;
      if (!course) unmatchedCourseCount += 1;

      const startedAt = dateValue(enrollment.started_at);
      const completedAt = dateValue(enrollment.completed_at);
      const enrolledAt = dateValue(enrollment.enrolled_at ?? enrollment.created_at);
      const expiresAt = dateValue(enrollment.expires_at);
      const status = completedAt
        ? "Completed"
        : startedAt
          ? "In Progress"
          : "Not Started";

      return {
        enrollmentId: enrollment.id,
        studentName: student
          ? firstName(
              student.name,
              `${firstName(student.given_name, student.first_name) ?? ""} ${firstName(student.family_name, student.last_name) ?? ""}`,
            ) ?? "Unknown Student"
          : "Unassigned / Archived User",
        studentEmail:
          typeof student?.email === "string" ? student.email.trim() : "N/A",
        courseTitle:
          firstName(course?.name, course?.title, enrollment.custom_name) ??
          "Online Training Course",
        courseId,
        status,
        progressPercentage: completedAt ? 100 : startedAt ? 50 : 0,
        enrolledAt,
        startedAt,
        completedAt,
        expiresAt,
        courseUrl: courseId
          ? `${BASE_URL.replace("/api/v1", "")}/manage/courses/${encodeURIComponent(courseId)}`
          : null,
      };
    });

    if (
      enrollmentsData.length === 0 ||
      unmatchedStudentCount > 0 ||
      unmatchedCourseCount > 0
    ) {
      console.warn("Sellability enrollment data counts:", {
        enrollmentCount: enrollmentsData.length,
        unmatchedStudentCount,
        unmatchedCourseCount,
        studentCount: studentsById.size,
        courseCount: courses.length,
      });
    }

    return jsonResponse({
      enrollments,
      page: requestedPage,
      pageSize: PAGE_SIZE,
      hasMore: enrollmentsData.length === PAGE_SIZE,
    });
  } catch (error) {
    console.error("Sellability enrollment lookup failed:", error);
    return jsonResponse({ error: "Unable to load Sellability enrollments." }, 502);
  }
}
