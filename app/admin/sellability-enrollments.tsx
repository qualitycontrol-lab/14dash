"use client";

import { useEffect, useMemo, useState } from "react";

type EnrollmentStatus = "Completed" | "In Progress" | "Not Started";
type Enrollment = {
  enrollmentId: string | number;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  status: EnrollmentStatus;
  progressPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  courseUrl: string;
};

const statuses: Array<"All" | EnrollmentStatus> = [
  "All",
  "Completed",
  "In Progress",
  "Not Started",
];

function isEnrollment(value: unknown): value is Enrollment {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const enrollment = value as Record<string, unknown>;
  return (
    (typeof enrollment.enrollmentId === "string" ||
      typeof enrollment.enrollmentId === "number") &&
    typeof enrollment.studentName === "string" &&
    typeof enrollment.studentEmail === "string" &&
    typeof enrollment.courseTitle === "string" &&
    (enrollment.status === "Completed" ||
      enrollment.status === "In Progress" ||
      enrollment.status === "Not Started") &&
    typeof enrollment.progressPercentage === "number" &&
    (typeof enrollment.startedAt === "string" || enrollment.startedAt === null) &&
    (typeof enrollment.completedAt === "string" || enrollment.completedAt === null) &&
    typeof enrollment.courseUrl === "string"
  );
}

function downloadCsv(enrollments: Enrollment[]) {
  const columns: Array<[string, (enrollment: Enrollment) => string]> = [
    ["Student Name", (enrollment) => enrollment.studentName],
    ["Student Email", (enrollment) => enrollment.studentEmail],
    ["Course Title", (enrollment) => enrollment.courseTitle],
    ["Progress", (enrollment) => `${enrollment.progressPercentage}%`],
    ["Status", (enrollment) => enrollment.status],
    ["Started At", (enrollment) => enrollment.startedAt ?? ""],
    ["Completed At", (enrollment) => enrollment.completedAt ?? ""],
    ["Course URL", (enrollment) => enrollment.courseUrl],
  ];
  const rows = [
    columns.map(([heading]) => heading),
    ...enrollments.map((enrollment) =>
      columns.map(([, value]) => value(enrollment)),
    ),
  ];
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const safeCell = /^[\t\r ]*[=+\-@]/.test(cell) ? `'${cell}` : cell;
          return `"${safeCell.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sellability-enrollments.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-[#d7e1dd] bg-[#f8fbf9] p-5">
      <p className="text-sm font-medium text-[#687975]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#15221f]">{value}</p>
      <p className="mt-2 text-xs text-[#7b8985]">{note}</p>
    </article>
  );
}

export default function SellabilityEnrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All Courses");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("All");

  useEffect(() => {
    const controller = new AbortController();

    async function loadEnrollments() {
      try {
        const response = await fetch("/api/admin/enrollments", {
          signal: controller.signal,
        });
        const data: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Unable to load Sellability enrollments.";
          throw new Error(message);
        }

        if (!Array.isArray(data) || !data.every(isEnrollment)) {
          throw new Error("The Sellability enrollment response was invalid.");
        }

        setEnrollments(data);
        setError(null);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load Sellability enrollments:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load Sellability enrollments.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadEnrollments();
    return () => controller.abort();
  }, []);

  const courses = useMemo(
    () => [...new Set(enrollments.map((enrollment) => enrollment.courseTitle))].sort(),
    [enrollments],
  );
  const filteredEnrollments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enrollments.filter((enrollment) => {
      const matchesSearch =
        !query ||
        enrollment.studentName.toLowerCase().includes(query) ||
        enrollment.studentEmail.toLowerCase().includes(query);
      const matchesCourse =
        courseFilter === "All Courses" || enrollment.courseTitle === courseFilter;
      const matchesStatus =
        statusFilter === "All" || enrollment.status === statusFilter;
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [courseFilter, enrollments, search, statusFilter]);

  const totalStudents = new Set(
    enrollments.map((enrollment) => enrollment.studentEmail.toLowerCase()),
  ).size;
  const activeEnrollments = enrollments.filter(
    (enrollment) => enrollment.status !== "Completed",
  ).length;
  const completedEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === "Completed",
  ).length;
  const completionRate = enrollments.length
    ? Math.round((completedEnrollments / enrollments.length) * 100)
    : 0;

  return (
    <div className="space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168f89]">
          Sellability
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[#14211f] sm:text-5xl">
              Training enrollments
            </h1>
            <p className="mt-3 text-[#5b6d69]">
              Review student progress across Sellability courses.
            </p>
          </div>
          <button
            type="button"
            disabled={filteredEnrollments.length === 0}
            onClick={() => downloadCsv(filteredEnrollments)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#1b8076] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#15665e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export Filtered CSV
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-[#edc9c9] bg-[#fff4f3] px-5 py-4 text-sm text-[#a94856]"
        >
          {error}
        </div>
      )}

      <section aria-label="Enrollment summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Students" value={totalStudents} note="With listed enrollments" />
        <Metric label="Active Enrollments" value={activeEnrollments} note="Not yet completed" />
        <Metric label="Completed Courses" value={completedEnrollments} note="Completed enrollments" />
        <Metric label="Overall Completion Rate" value={`${completionRate}%`} note="Completed enrollments" />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#d7e1dd] bg-[#f8fbf9] p-4 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search students</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student name or email"
            className="h-11 w-full rounded-xl border border-[#cfdad6] bg-white px-4 text-sm text-[#344743] outline-none focus:border-[#1b8076] focus:ring-2 focus:ring-[#1b8076]/15"
          />
        </label>
        <label>
          <span className="sr-only">Filter by course</span>
          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#cfdad6] bg-white px-4 text-sm text-[#344743] outline-none focus:border-[#1b8076] sm:min-w-[220px]"
          >
            <option>All Courses</option>
            {courses.map((course) => <option key={course}>{course}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as (typeof statuses)[number])}
            className="h-11 w-full rounded-xl border border-[#cfdad6] bg-white px-4 text-sm text-[#344743] outline-none focus:border-[#1b8076] sm:min-w-[180px]"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>{status === "All" ? "All Statuses" : status}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#d7e1dd] bg-white">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm text-[#71807c]">
            Loading Sellability enrollments...
          </p>
        ) : filteredEnrollments.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-[#71807c]">
            {enrollments.length
              ? "No enrollments match the selected filters."
              : "No Sellability enrollments found."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-[#f3f7f5] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#71807c]">
                <tr>
                  <th scope="col" className="px-5 py-4">Student</th>
                  <th scope="col" className="px-5 py-4">Course</th>
                  <th scope="col" className="w-52 px-5 py-4">Progress</th>
                  <th scope="col" className="px-5 py-4">Status</th>
                  <th scope="col" className="px-5 py-4"><span className="sr-only">Course link</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5ebe8]">
                {filteredEnrollments.map((enrollment) => {
                  const progress = Math.min(100, Math.max(0, enrollment.progressPercentage));
                  const badgeStyle =
                    enrollment.status === "Completed"
                      ? "bg-[#e2f2e9] text-[#277657]"
                      : enrollment.status === "In Progress"
                        ? "bg-[#fff2d6] text-[#94651a]"
                        : "bg-[#eff2f0] text-[#66736f]";

                  return (
                    <tr key={enrollment.enrollmentId} className="align-middle">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#172523]">{enrollment.studentName}</p>
                        <p className="mt-1 text-xs text-[#71807c]">{enrollment.studentEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#344743]">
                        {enrollment.courseTitle}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-2 flex-1 overflow-hidden rounded-full bg-[#e6ece9]"
                            role="progressbar"
                            aria-label={`${enrollment.courseTitle} progress for ${enrollment.studentName}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress}
                          >
                            <div
                              className="h-full rounded-full bg-[#1b8076]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold text-[#344743]">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}>
                          {enrollment.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <a
                          href={enrollment.courseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex whitespace-nowrap rounded-full border border-[#b8d5ce] px-4 py-2 text-xs font-semibold text-[#1b8076] transition-colors hover:bg-[#eaf5f1]"
                        >
                          Open course
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <p className="border-t border-[#e5ebe8] px-5 py-3 text-xs text-[#71807c]">
            Showing {filteredEnrollments.length} of {enrollments.length} enrollments
          </p>
        )}
      </section>
    </div>
  );
}
