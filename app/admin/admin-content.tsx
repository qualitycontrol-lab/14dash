"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import SellabilityEnrollments from "./sellability-enrollments";

type TrainingType = "HCA" | "CSG" | "TTT" | "LF" | "OTA" | "WS" | "Misc";
type TrainingStatus = "Upcoming" | "Completed";
type AttendeeType = "Employee" | "Other / Community" | "Associated Company" | "Other";
type Training = {
  id: number;
  title: string;
  type: TrainingType;
  date: string;
  attendees: number;
  bonAttendees?: number;
  attendeeType?: AttendeeType;
  checkIns?: number;
  status: TrainingStatus;
};
type AdminSection =
  | "Overview"
  | "Trainings"
  | "Start training"
  | "People & TIP"
  | "Reporting"
  | "Sellability Courses";

const trainingTypes: { code: TrainingType; name: string; tone: string }[] = [
  { code: "HCA", name: "Hubbard College of Administration", tone: "text-[#c77b3d] bg-[#fbe5d9]" },
  { code: "CSG", name: "Center for Self Governance", tone: "text-[#0f7d75] bg-[#d9f1ea]" },
  { code: "TTT", name: "Train the Trainer", tone: "text-[#b45d76] bg-[#f5d9df]" },
  { code: "LF", name: "Learning Forum", tone: "text-[#6a5ec6] bg-[#e9ddfb]" },
  { code: "OTA", name: "Online Training Academy", tone: "text-[#268a87] bg-[#d8f1ea]" },
  { code: "WS", name: "Workshop", tone: "text-[#c77b3d] bg-[#fbe5d9]" },
  { code: "Misc", name: "Miscellaneous", tone: "text-[#65726e] bg-[#e9eeeb]" },
];

const initialTrainings: Training[] = [
  { id: 1, title: "Administration Basics", type: "HCA", date: "2026-11-08", attendees: 20, bonAttendees: 14, attendeeType: "Employee", checkIns: 1, status: "Upcoming" },
  { id: 2, title: "Self Governance Roundtable", type: "CSG", date: "2026-11-14", attendees: 16, bonAttendees: 16, attendeeType: "Associated Company", checkIns: 0, status: "Upcoming" },
  { id: 3, title: "Warehouse Safety Workshop", type: "WS", date: "2026-10-28", attendees: 15, bonAttendees: 12, attendeeType: "Employee", checkIns: 0, status: "Completed" },
  { id: 4, title: "Learning Forum: Leadership", type: "LF", date: "2026-10-23", attendees: 30, bonAttendees: 18, attendeeType: "Other / Community", checkIns: 2, status: "Completed" },
];

const navigation: AdminSection[] = [
  "Overview",
  "Trainings",
  "Start training",
  "People & TIP",
  "Reporting",
  "Sellability Courses",
];

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function TrainingTypeLabel({ type }: { type: TrainingType }) {
  const item = trainingTypes.find((trainingType) => trainingType.code === type);

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item?.tone ?? "bg-[#e9eeeb] text-[#65726e]"}`}>
      {type}
    </span>
  );
}

function TrainingList({ trainings }: { trainings: Training[] }) {
  if (!trainings.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-[#cbd8d4] bg-white/70 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-[#243531]">No trainings found</p>
        <p className="mt-2 text-sm text-[#6b7b77]">Try a different search or create a training.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#d7e1dd] bg-white">
      {trainings.map((training, index) => (
        <article
          key={training.id}
          className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${index ? "border-t border-[#e5ebe8]" : ""}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[14px] bg-[#eaf5f1] text-[#147e78]">
              <span className="text-[10px] font-semibold uppercase">{formatDate(training.date).split(" ")[0]}</span>
              <span className="text-lg font-semibold leading-5">{new Date(`${training.date}T00:00:00Z`).getUTCDate()}</span>
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-[#172523]">{training.title}</h3>
              <p className="mt-1 text-sm text-[#71807c]">
                {formatDate(training.date)} <span aria-hidden="true">·</span> {training.attendees} attendees
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:justify-end">
            <TrainingTypeLabel type={training.type} />
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${training.status === "Upcoming" ? "bg-[#e5f3ed] text-[#277657]" : "bg-[#eff2f0] text-[#66736f]"}`}>
              {training.status}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function TrainingLog({
  trainings,
  onStart,
}: {
  trainings: Training[];
  onStart: () => void;
}) {
  const [selectedTypes, setSelectedTypes] = useState<TrainingType[]>([]);
  const filtered = selectedTypes.length
    ? trainings.filter((training) => selectedTypes.includes(training.type))
    : trainings;
  const upcoming = filtered.filter((training) => training.status === "Upcoming");
  const completed = filtered.filter((training) => training.status === "Completed");

  function toggleType(type: TrainingType) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function exportTraining(training: Training) {
    downloadCsv(`${training.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`, [
      ["Training", "Type", "Date", "Attendees", "Check-ins", "Status"],
      [training.title, training.type, training.date, String(training.attendees), String(training.checkIns ?? 0), training.status],
    ]);
  }

  function group(title: string, subtitle: string, items: Training[]) {
    return (
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="font-serif text-2xl tracking-[-0.04em] text-[#172523]">{title}</h2>
            <span className="text-xs text-[#87938f]">{subtitle}</span>
          </div>
          <span className="text-xs font-medium text-[#71807c]">{items.length} trainings</span>
        </div>
        {items.length ? (
          <div className="overflow-hidden rounded-[16px] border border-[#d7e1dd] bg-[#f8fbf9]">
            {items.map((training, index) => {
              const style = categoryStyles[training.type];
              return (
                <article key={training.id} className={`flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5 ${index ? "border-t border-[#e5ebe8]" : ""}`}>
                  <div className="w-10 shrink-0 text-center">
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-[#168f89]">
                      {new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(new Date(`${training.date}T00:00:00Z`))}
                    </span>
                    <span className="font-serif text-2xl leading-6 text-[#172523]">
                      {new Date(`${training.date}T00:00:00Z`).getUTCDate()}
                    </span>
                  </div>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border ${style.border} ${style.tone} text-[9px] font-semibold`}>
                    {training.type}
                  </span>
                  <div className="min-w-[180px] flex-1">
                    <h3 className="text-sm font-semibold text-[#172523]">{training.title}</h3>
                    <p className="mt-0.5 text-xs text-[#71807c]">
                      {formatDate(training.date)} <span aria-hidden="true">·</span> {style.label} <span aria-hidden="true">·</span> {training.attendees} attendees <span aria-hidden="true">·</span> {training.checkIns ?? 0} check-ins
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${training.status === "Upcoming" ? "bg-[#e5f3ed] text-[#277657]" : "bg-[#eff2f0] text-[#66736f]"}`}>
                    {training.status}
                  </span>
                  <button onClick={() => exportTraining(training)} className="px-2 py-1 text-xs font-medium text-[#147e78] hover:underline">Export</button>
                  <button onClick={() => window.print()} className="px-2 py-1 text-xs font-medium text-[#147e78] hover:underline">Print</button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#cbd8d4] bg-[#f8fbf9] px-5 py-8 text-center text-sm text-[#71807c]">
            No {title.toLowerCase()} trainings in this view.
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168f89]">Schedule & attendance</p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.05em] text-[#14211f] sm:text-5xl">Trainings</h1>
        </div>
        <button onClick={onStart} className="h-10 rounded-[11px] bg-[#1aa6a1] px-5 text-sm font-semibold text-white hover:bg-[#148d88]">
          + Start a training
        </button>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filter by training type">
        {trainingTypes.map(({ code }) => {
          const style = categoryStyles[code];
          const selected = selectedTypes.includes(code);
          return (
            <button
              key={code}
              aria-pressed={selected}
              onClick={() => toggleType(code)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                selected ? "border-[#1a7771] bg-[#1a7771] text-white" : `border-[#b8c8c2] bg-white ${style.tone.split(" ")[1]} hover:bg-[#eaf5f1]`
              }`}
            >
              {code}
            </button>
          );
        })}
      </div>

      {group("Upcoming", "next 7 days", upcoming)}
      {group("Completed", "past 7 days", completed)}
    </div>
  );
}

function Overview({ trainings, onNavigate }: { trainings: Training[]; onNavigate: (section: AdminSection) => void }) {
  const upcoming = trainings.filter((training) => training.status === "Upcoming");
  const attendees = trainings.reduce((total, training) => total + training.attendees, 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168f89]">Overview</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-[#14211f] sm:text-5xl">
              Training overview
            </h1>
          </div>
          <button
            onClick={() => onNavigate("Start training")}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#1aa6a1] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#148d88]"
          >
            + Start a training
          </button>
        </div>
        <p className="mt-3 text-[#5b6d69]">A quick look at training activity and what’s coming up.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total trainings", value: trainings.length, note: "Across all categories" },
          { label: "Upcoming", value: upcoming.length, note: "Scheduled trainings" },
          { label: "Attendees", value: attendees, note: "Across listed trainings" },
          { label: "Training types", value: new Set(trainings.map((training) => training.type)).size, note: "Currently represented" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-5">
            <p className="text-sm font-medium text-[#687975]">{stat.label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#15221f]">{stat.value}</p>
            <p className="mt-2 text-xs text-[#7b8985]">{stat.note}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#172523]">Upcoming trainings</h2>
            <p className="mt-1 text-sm text-[#71807c]">The next scheduled trainings at a glance.</p>
          </div>
          <button className="text-sm font-semibold text-[#147e78]" onClick={() => onNavigate("Trainings")}>
            View all trainings
          </button>
        </div>
        <TrainingList trainings={upcoming} />
      </section>
    </div>
  );
}

function TrainingForm({ onCreate }: { onCreate: (training: Omit<Training, "id">) => void }) {
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [type, setType] = useState<TrainingType>("CSG");
  const [date, setDate] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(true);
      return;
    }

    onCreate({ title: trimmedTitle, type, date, attendees: 0, status: "Upcoming" });
    setTitle("");
    setTitleError(false);
    setDate("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-[24px] border border-[#d7e1dd] bg-[#f8fbf9] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168f89]">New training</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-[#14211f]">Start a training</h1>
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#344743]">Training title</span>
            <input
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setTitleError(false);
              }}
              placeholder="e.g. Administration Basics"
              aria-invalid={titleError}
              aria-describedby={titleError ? "training-title-error" : undefined}
              className="h-12 w-full rounded-[12px] border border-[#cfdad6] bg-white px-4 text-sm outline-none transition focus:border-[#1ca5a0] focus:ring-2 focus:ring-[#1ca5a0]/15"
            />
            {titleError && <span id="training-title-error" className="mt-2 block text-sm text-[#a94856]">Enter a training title.</span>}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#344743]">Training type</span>
            <select
              value={type}
              onChange={(event) => {
                const selectedType = trainingTypes.find((trainingType) => trainingType.code === event.target.value);
                if (selectedType) {
                  setType(selectedType.code);
                }
              }}
              className="h-12 w-full rounded-[12px] border border-[#cfdad6] bg-white px-4 text-sm outline-none transition focus:border-[#1ca5a0] focus:ring-2 focus:ring-[#1ca5a0]/15"
            >
              {trainingTypes.map((trainingType) => (
                <option key={trainingType.code} value={trainingType.code}>{trainingType.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#344743]">Date</span>
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-12 w-full rounded-[12px] border border-[#cfdad6] bg-white px-4 text-sm outline-none transition focus:border-[#1ca5a0] focus:ring-2 focus:ring-[#1ca5a0]/15 sm:max-w-[260px]"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#1aa6a1] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#148d88]"
          >
            Add training to preview
          </button>
        </form>
      </section>

      <aside className="flex flex-col justify-between rounded-[24px] bg-[#0e8d85] p-6 text-white shadow-[0_8px_20px_rgba(16,106,96,0.16)] sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d9f6f1]">Training summary</p>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">{title || "Name your training"}</h2>
          <p className="mt-2 text-sm text-[#ebfffb]">
            {trainingTypes.find((trainingType) => trainingType.code === type)?.name ?? "Choose a training type"}
          </p>
        </div>
        <div className="mt-8 border-t border-white/20 pt-5 text-sm text-[#ebfffb]">
          {date ? formatDate(date) : "Choose a date"}
          <p className="mt-5 rounded-[14px] border border-white/20 bg-white/10 p-4 text-xs leading-5">
            Preview only. Trainings added here are not saved after you leave this page.
          </p>
        </div>
      </aside>
    </div>
  );
}

type StampStatus = "Confirmed" | "Awaiting confirmation" | "In Progress" | "Not Started";
type PassportCourse = {
  id: number | string;
  title: string;
  type: TrainingType;
  date: string;
  status: StampStatus;
  progress?: number;
  courseUrl?: string;
  source?: "sellability";
};
type PersonRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  trainer: string;
  started: string;
  goals: string[];
  courses: PassportCourse[];
};
type RecentPerson = Pick<PersonRecord, "id" | "name" | "email" | "role" | "department">;
type SellabilityCourseResponse = {
  id: string | number;
  title: string;
  status: "Completed" | "In Progress" | "Not Started";
  progress: number;
  startedAt?: string | null;
  completedAt?: string | null;
  url?: string;
};
type DirectoryEmployee = {
  name: string;
  email: string;
  role?: string;
  department?: string;
};

const categoryStyles: Record<TrainingType, { label: string; tone: string; border: string }> = {
  HCA: { label: "Hubbard College of Administration", tone: "bg-[#fbe5d9] text-[#b56833]", border: "border-[#d99568]" },
  CSG: { label: "Center for Self Governance", tone: "bg-[#d9f1ea] text-[#147e78]", border: "border-[#78b3a5]" },
  TTT: { label: "Train the Trainer", tone: "bg-[#f5d9df] text-[#a94856]", border: "border-[#d58a97]" },
  LF: { label: "Learning Forum", tone: "bg-[#e9ddfb] text-[#6a5ec6]", border: "border-[#aa96d8]" },
  OTA: { label: "Online Training Academy", tone: "bg-[#d8f1ea] text-[#268a87]", border: "border-[#79b9b3]" },
  WS: { label: "Workshop", tone: "bg-[#fbe5d9] text-[#b56833]", border: "border-[#d99568]" },
  Misc: { label: "Miscellaneous", tone: "bg-[#e9eeeb] text-[#65726e]", border: "border-[#aab5b0]" },
};

const RECENT_PEOPLE_STORAGE_KEY = "14dash.people-tip.recent-employees";
const MAX_RECENT_PEOPLE = 10;

function initialsFor(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDirectoryEmployee(value: unknown): value is DirectoryEmployee {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.email === "string"
  );
}

function isRecentPerson(value: unknown): value is RecentPerson {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.role === "string" &&
    typeof value.department === "string"
  );
}

function isSellabilityCourse(value: unknown): value is SellabilityCourseResponse {
  if (!isRecord(value)) return false;
  return (
    (typeof value.id === "string" || typeof value.id === "number") &&
    typeof value.title === "string" &&
    (value.status === "Completed" ||
      value.status === "In Progress" ||
      value.status === "Not Started") &&
    typeof value.progress === "number" &&
    (value.startedAt === undefined ||
      value.startedAt === null ||
      typeof value.startedAt === "string") &&
    (value.completedAt === undefined ||
      value.completedAt === null ||
      typeof value.completedAt === "string") &&
    (value.url === undefined || typeof value.url === "string")
  );
}

function PeopleView() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [recentPeople, setRecentPeople] = useState<PersonRecord[]>([]);
  const [recentPeopleLoaded, setRecentPeopleLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [category, setCategory] = useState<TrainingType | "All">("All");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [notice, setNotice] = useState("");
  const [sellabilityCourses, setSellabilityCourses] = useState<PassportCourse[]>([]);
  const [sellabilityPersonId, setSellabilityPersonId] = useState("");
  const [sellabilityLoading, setSellabilityLoading] = useState(true);
  const [sellabilityError, setSellabilityError] = useState<string | null>(null);

  const selectedPerson = [...recentPeople, ...people].find(
    (person) => person.id === selectedId,
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_PEOPLE_STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const restored = parsed.filter(isRecentPerson).slice(0, MAX_RECENT_PEOPLE);
          setRecentPeople(restored.map((person) => ({
            ...person,
            trainer: "Unassigned",
            started: "",
            goals: [],
            courses: [],
          })));
        }
      }
    } catch (error) {
      console.error("Unable to load recently viewed employees:", error);
    } finally {
      setRecentPeopleLoaded(true);
    }
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setPeople([]);
      setDirectoryError(null);
      setDirectoryLoading(false);
      return;
    }

    const controller = new AbortController();
    setDirectoryLoading(true);
    setDirectoryError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        setPeople([]);
        const response = await fetch(
          `/api/employees/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data: unknown = await response.json();

        if (!response.ok) {
          throw new Error(
            isRecord(data) && typeof data.error === "string"
              ? data.error
              : "Unable to search the employee directory.",
          );
        }
        if (!Array.isArray(data) || !data.every(isDirectoryEmployee)) {
          throw new Error("The employee directory returned invalid data.");
        }

        const employees = data.filter((employee) =>
          employee.email.trim().toLowerCase().endsWith("@bonadmin.com"),
        );
        setPeople((current) =>
          employees.map((employee) => {
            const email = employee.email.trim().toLowerCase();
            const existing = current.find((person) => person.id === email);
            return existing ?? {
              id: email,
              name: employee.name.trim(),
              email,
              role: employee.role?.trim() || "Team Member",
              department: employee.department?.trim() || "Team Member",
              trainer: "Unassigned",
              started: "",
              goals: [],
              courses: [],
            };
          }),
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("People & TIP employee search failed:", error);
        setPeople([]);
        setDirectoryError(
          error instanceof Error ? error.message : "Unable to search the employee directory.",
        );
      } finally {
        if (!controller.signal.aborted) setDirectoryLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    if (!selectedPerson) {
      setSellabilityCourses([]);
      setSellabilityError(null);
      setSellabilityLoading(false);
      return;
    }

    const person = selectedPerson;
    const controller = new AbortController();

    async function loadSellabilityCourses() {
      setSellabilityLoading(true);
      setSellabilityError(null);
      setSellabilityCourses([]);
      setSellabilityPersonId(person.id);

      try {
        const coursesResponse = await fetch(
          `/api/courses?email=${encodeURIComponent(person.email)}`,
          { signal: controller.signal },
        );
        const coursesData: unknown = await coursesResponse.json();
        if (!coursesResponse.ok) {
          throw new Error(
            isRecord(coursesData) && typeof coursesData.error === "string"
              ? coursesData.error
              : "Unable to load this employee's Sellability courses.",
          );
        }
        if (
          !isRecord(coursesData) ||
          !Array.isArray(coursesData.courses) ||
          !coursesData.courses.every(isSellabilityCourse)
        ) {
          throw new Error("Sellability returned an invalid course list.");
        }

        const validCourses = coursesData.courses.filter(isSellabilityCourse);
        setSellabilityCourses(
          validCourses.map((course) => {
            const completedAt =
              typeof course.completedAt === "string" ? course.completedAt : null;
            const startedAt =
              typeof course.startedAt === "string" ? course.startedAt : null;
            const status: StampStatus =
              course.status === "Completed"
                ? "Confirmed"
                : course.status === "In Progress"
                  ? "In Progress"
                  : "Not Started";

            return {
              id: course.id,
              title: course.title,
              type: "OTA",
              date: (completedAt ?? startedAt ?? "").slice(0, 10),
              status,
              progress: course.progress,
              courseUrl: course.url,
              source: "sellability",
            };
          }),
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Failed to load employee Sellability courses:", error);
        setSellabilityError(
          error instanceof Error
            ? error.message
            : "Unable to load this employee's Sellability courses.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSellabilityLoading(false);
        }
      }
    }

    void loadSellabilityCourses();
    return () => controller.abort();
  }, [selectedPerson?.id, selectedPerson?.email]);

  const selectedCourses = selectedPerson
    ? [
        ...selectedPerson.courses.filter((course) => course.type !== "OTA"),
        ...(sellabilityPersonId === selectedPerson.id ? sellabilityCourses : []),
      ]
    : [];
  const filteredPeople = search.trim().length >= 2 ? people : recentPeople;
  const confirmedCount = selectedCourses.filter((course) => course.status === "Confirmed").length;
  const pendingCount = selectedCourses.filter((course) => course.status === "Awaiting confirmation").length;
  const filteredCourses = selectedCourses.filter((course) => category === "All" || course.type === category);
  const categoryCounts = trainingTypes.map(({ code }) => ({
    code,
    count: selectedCourses.filter((course) => course.type === code).length,
  }));

  function updateSelectedPerson(update: (person: PersonRecord) => PersonRecord) {
    if (!selectedPerson) return;
    const updatedPerson = update(selectedPerson);
    setPeople((current) =>
      current.map((person) => person.id === selectedId ? updatedPerson : person),
    );
    setRecentPeople((current) => {
      const next = current.map((person) =>
        person.id === selectedId ? updatedPerson : person,
      );
      try {
        window.localStorage.setItem(
          RECENT_PEOPLE_STORAGE_KEY,
          JSON.stringify(next.map(({ id, name, email, role, department }) => ({
            id, name, email, role, department,
          }))),
        );
      } catch (error) {
        console.error("Unable to save recently viewed employees:", error);
      }
      return next;
    });
  }

  function selectEmployee(person: PersonRecord) {
    const employee = recentPeople.find((recent) => recent.id === person.id) ?? person;
    setSelectedId(employee.id);
    setCategory("All");
    setNotice("");
    setRecentPeople((current) => {
      const next = [
        employee,
        ...current.filter((recent) => recent.id !== employee.id),
      ].slice(0, MAX_RECENT_PEOPLE);
      try {
        window.localStorage.setItem(
          RECENT_PEOPLE_STORAGE_KEY,
          JSON.stringify(next.map(({ id, name, email, role, department }) => ({
            id, name, email, role, department,
          }))),
        );
      } catch (error) {
        console.error("Unable to save recently viewed employees:", error);
      }
      return next;
    });
  }

  function addCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newCourseTitle.trim();
    if (!title) return;
    updateSelectedPerson((person) => ({
      ...person,
      courses: [...person.courses, {
        id: Date.now(),
        title,
        type: "CSG",
        date: new Date().toISOString().slice(0, 10),
        status: "Awaiting confirmation",
      }],
    }));
    setNewCourseTitle("");
    setAddingCourse(false);
  }

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) return;
    updateSelectedPerson((person) => ({ ...person, goals: [...person.goals, title] }));
    setNewGoalTitle("");
    setAddingGoal(false);
  }

  async function copyTip() {
    if (!selectedPerson) return;
    const tip = `${selectedPerson.name}\n${selectedPerson.email}\n${selectedPerson.role} · ${selectedPerson.department}\n${confirmedCount} trainings confirmed · ${pendingCount} awaiting confirmation\nTraining goals: ${selectedPerson.goals.join(", ") || "None"}`;
    try {
      await navigator.clipboard.writeText(tip);
      setNotice("TIP summary copied to clipboard.");
    } catch (error) {
      console.error("Unable to copy TIP summary:", error);
      setNotice("Could not copy the TIP summary. Check clipboard permissions and try again.");
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[282px_minmax(0,1fr)]">
      <aside className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-[-0.04em] text-[#172523]">Roster</h1>
          <span className="text-right text-[10px] text-[#71807c]">
            {search.trim().length >= 2
              ? `${people.length} ${people.length === 1 ? "match" : "matches"}`
              : `${recentPeople.length} recent`}
          </span>
        </div>
        <label className="block">
          <span className="sr-only">Search people by name</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPeople([]);
              setCategory("All");
              setNotice("");
            }}
            placeholder="Search by name..."
            className="h-10 w-full rounded-[11px] border border-[#cfdad6] bg-white px-3 text-sm outline-none focus:border-[#1ca5a0] focus:ring-2 focus:ring-[#1ca5a0]/15"
          />
        </label>
        <div className="mt-3 max-h-[450px] space-y-1 overflow-y-auto pr-1">
          {directoryLoading && (
            <p role="status" className="px-2 py-6 text-center text-sm text-[#71807c]">
              Searching the Google Workspace directory...
            </p>
          )}
          {directoryError && (
            <p role="alert" className="px-2 py-6 text-center text-sm text-[#a94856]">
              {directoryError}
            </p>
          )}
          {!directoryLoading && !directoryError && search.trim().length < 2 && recentPeopleLoaded && recentPeople.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-[#71807c]">
              Search for an employee. Selected employees will appear here as recent.
            </p>
          )}
          {filteredPeople.map((person, index) => {
            const selected = person.id === selectedId;
            return (
              <button
                key={person.id}
                onClick={() => selectEmployee(person)}
                aria-pressed={selected}
                className={`flex w-full items-center gap-2 rounded-[12px] border px-2.5 py-2 text-left transition ${
                  selected ? "border-[#8cb7aa] bg-white shadow-sm" : "border-transparent hover:bg-white"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  index % 3 === 0 ? "border-[#a8c7bb] bg-[#eaf5f1] text-[#147e78]" :
                  index % 3 === 1 ? "border-[#e0b28f] bg-[#fbf0e7] text-[#b56833]" :
                  "border-[#c9b9de] bg-[#f1ecf8] text-[#6a5ec6]"
                }`}>
                  {initialsFor(person.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[#263733]">{person.name}</span>
                  <span className="block truncate text-[11px] text-[#7b8985]">{person.email}</span>
                </span>
              </button>
            );
          })}
          {!directoryLoading && !directoryError && search.trim().length >= 2 && filteredPeople.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-[#71807c]">No employees found.</p>
          )}
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        {selectedPerson ? (
          <>
        <section className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-5 sm:p-7">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#a8c7bb] bg-[#eaf5f1] text-sm font-semibold text-[#147e78]">
                {initialsFor(selectedPerson.name)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold tracking-[-0.05em] text-[#172523] sm:text-3xl">{selectedPerson.name}</h2>
                <p className="mt-1 text-sm text-[#61726e]">{selectedPerson.role} · {selectedPerson.department}</p>
                <p className="mt-1 font-mono text-[11px] text-[#7b8985]">{selectedPerson.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.print()} className="h-9 rounded-[10px] border border-[#cfdad6] bg-white px-3 text-xs font-semibold text-[#344743] hover:bg-[#eaf5f1]">Print</button>
              <button onClick={() => window.print()} className="h-9 rounded-[10px] border border-[#cfdad6] bg-white px-3 text-xs font-semibold text-[#344743] hover:bg-[#eaf5f1]">Save as PDF</button>
              <button onClick={() => void copyTip()} className="h-9 rounded-[10px] bg-[#1aa6a1] px-3 text-xs font-semibold text-white hover:bg-[#148d88]">Email TIP copy</button>
            </div>
          </div>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            {[
              { value: confirmedCount, label: "Confirmed", color: "text-[#147e78]" },
              { value: pendingCount, label: "Pending", color: "text-[#b56833]" },
              { value: selectedPerson.goals.length, label: "Training goals", color: "text-[#6a5ec6]" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[12px] border border-[#e1e9e5] bg-[#eff4f1] px-3 py-2.5">
                <p className={`font-serif text-3xl italic leading-8 ${stat.color}`}>{stat.value}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#60716d]">{stat.label}</p>
              </div>
            ))}
          </div>

          {pendingCount > 0 && (
            <div className="mt-3 rounded-[11px] border border-[#c5dfd7] bg-[#eaf5f1] px-3.5 py-3 text-xs leading-5 text-[#344743]">
              <strong>{pendingCount} training check-in{pendingCount === 1 ? "" : "s"} awaiting your confirmation.</strong>{" "}
              Confirm below once you’ve verified the course was completed.
            </div>
          )}
          {notice && <p role="status" className="mt-3 text-xs text-[#147e78]">{notice}</p>}
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory("All")}
            aria-pressed={category === "All"}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${category === "All" ? "border-[#1a7771] bg-[#1a7771] text-white" : "border-[#b8c8c2] bg-white text-[#52635f]"}`}
          >
            All <span className="ml-1 opacity-70">{selectedCourses.length}</span>
          </button>
          {categoryCounts.map(({ code, count }) => (
            <button
              key={code}
              onClick={() => setCategory(code)}
              aria-pressed={category === code}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                category === code
                  ? "border-[#1a7771] bg-[#1a7771] text-white"
                  : `${categoryStyles[code].border} bg-white ${categoryStyles[code].tone.split(" ")[1]}`
              }`}
            >
              {categoryStyles[code].label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          ))}
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl tracking-[-0.04em] text-[#172523]">Passport stamps</h2>
              <button
                onClick={() => { setAddingCourse((current) => !current); setNewCourseTitle(""); }}
                className="shrink-0 rounded-[10px] border border-[#cfdad6] bg-white px-3 py-2 text-xs font-semibold text-[#344743] hover:bg-[#eaf5f1]"
              >
                + Add course
              </button>
            </div>
            {addingCourse && (
              <form onSubmit={addCourse} className="mb-4 flex gap-2">
                <input
                  autoFocus
                  required
                  value={newCourseTitle}
                  onChange={(event) => setNewCourseTitle(event.target.value)}
                  aria-label="Course title"
                  placeholder="Course title"
                  className="h-9 min-w-0 flex-1 rounded-[9px] border border-[#cfdad6] bg-white px-3 text-xs outline-none focus:border-[#1ca5a0]"
                />
                <button className="rounded-[9px] bg-[#1aa6a1] px-3 text-xs font-semibold text-white">Add</button>
              </form>
            )}
            {(category === "All" || category === "OTA") &&
              sellabilityPersonId === selectedPerson.id &&
              sellabilityLoading && (
              <p role="status" className="mb-3 rounded-[12px] bg-white px-4 py-3 text-xs text-[#61726e]">
                Loading Online Training Academy enrollments...
              </p>
            )}
            {(category === "All" || category === "OTA") &&
              sellabilityPersonId === selectedPerson.id &&
              sellabilityError && (
              <p role="alert" className="mb-3 rounded-[12px] border border-[#edc9c9] bg-[#fff4f3] px-4 py-3 text-xs text-[#a94856]">
                {sellabilityError}
              </p>
            )}
            {(category === "OTA") &&
              sellabilityPersonId === selectedPerson.id &&
              !sellabilityLoading &&
              !sellabilityError &&
              sellabilityCourses.length === 0 && (
                <p className="mb-3 rounded-[12px] bg-white px-4 py-3 text-xs text-[#61726e]">
                  No Online Training Academy enrollments found for this employee.
                </p>
              )}
            {trainingTypes.filter(({ code }) => category === "All" || category === code).map(({ code }) => {
              const courses = filteredCourses.filter((course) => course.type === code);
              if (!courses.length) return null;
              const style = categoryStyles[code];
              return (
                <div key={code} className={`mb-3 last:mb-0 rounded-[15px] border border-[#d7e1dd] border-l-[3px] ${style.border.replace("border-", "border-l-")} bg-white p-3`}>
                  <p className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] ${style.tone.split(" ")[1]}`}>{style.label}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {courses.map((course) => (
                      <article key={course.id} className="flex min-w-0 flex-col items-center text-center">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${course.status === "Confirmed" ? style.border : `border-dashed ${style.border}`} ${style.tone} text-xl`}>
                          {course.status === "Confirmed"
                            ? "✓"
                            : course.status === "In Progress"
                            ? `${course.progress ?? 50}%`
                            : "·"}
                        </div>
                        <h3 className="mt-2 line-clamp-2 min-h-8 text-[11px] font-medium leading-4 text-[#283a36]">{course.title}</h3>
                        <p className="mt-1 text-[10px] text-[#71807c]">
                          {course.date ? formatDate(course.date) : "—"}
                        </p>
                        <p className="mt-0.5 min-h-7 text-[9px] font-medium uppercase leading-3 tracking-wide text-[#71807c]">
                          {course.status === "Confirmed" ? "Confirmed" : course.status}
                        </p>
                        <div className="mt-1 flex flex-wrap justify-center gap-1">
                          {course.source === "sellability" ? (
                            course.courseUrl && (
                            <a
                              href={course.courseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-[7px] border border-[#d8e1de] bg-white px-2 py-1 text-[9px] text-[#147e78] hover:bg-[#eff4f1]"
                            >
                              Open course
                            </a>
                            )
                          ) : (
                            <>
                            <button
                              onClick={() => updateSelectedPerson((person) => ({
                                ...person,
                                courses: person.courses.filter((item) => item.id !== course.id),
                              }))}
                              className="rounded-[7px] border border-[#d8e1de] bg-white px-2 py-1 text-[9px] text-[#61726e] hover:bg-[#eff4f1]"
                            >
                              Revoke
                            </button>
                            {course.status === "Awaiting confirmation" && (
                              <button
                                onClick={() => updateSelectedPerson((person) => ({
                                  ...person,
                                  courses: person.courses.map((item) => item.id === course.id ? { ...item, status: "Confirmed" } : item),
                                }))}
                                className="rounded-[7px] bg-[#1a7771] px-2 py-1 text-[9px] font-semibold text-white hover:bg-[#12635e]"
                              >
                                Confirm
                              </button>
                            )}
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredCourses.length === 0 && (
              <p className="rounded-[12px] bg-white px-4 py-8 text-center text-sm text-[#71807c]">
                No passport stamps in this category yet.
              </p>
            )}
          </section>

          <section className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl tracking-[-0.04em] text-[#172523]">Training goals</h2>
              <button
                onClick={() => { setAddingGoal((current) => !current); setNewGoalTitle(""); }}
                className="shrink-0 rounded-[10px] bg-[#1a7771] px-3 py-2 text-xs font-semibold text-white hover:bg-[#12635e]"
              >
                + Add goal
              </button>
            </div>
            {addingGoal && (
              <form onSubmit={addGoal} className="mb-4 flex gap-2">
                <input
                  autoFocus
                  required
                  value={newGoalTitle}
                  onChange={(event) => setNewGoalTitle(event.target.value)}
                  aria-label="Training goal"
                  placeholder="Goal title"
                  className="h-9 min-w-0 flex-1 rounded-[9px] border border-[#cfdad6] bg-white px-3 text-xs outline-none focus:border-[#1ca5a0]"
                />
                <button className="rounded-[9px] bg-[#1aa6a1] px-3 text-xs font-semibold text-white">Add</button>
              </form>
            )}
            <div className="space-y-3">
              {selectedPerson.goals.map((goal, index) => (
                <div key={`${goal}-${index}`} className="flex items-center gap-3 rounded-[12px] bg-[#eff4f1] px-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#8cb7aa] bg-white text-xs font-semibold text-[#147e78]">{index + 1}</span>
                  <span className="min-w-0 flex-1 text-xs font-medium text-[#344743]">{goal}</span>
                  <button
                    aria-label={`Remove ${goal}`}
                    onClick={() => updateSelectedPerson((person) => ({
                      ...person,
                      goals: person.goals.filter((_, goalIndex) => goalIndex !== index),
                    }))}
                    className="rounded p-1 text-xs text-[#a94856] hover:bg-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {selectedPerson.goals.length === 0 && <p className="py-6 text-center text-sm text-[#71807c]">No training goals added yet.</p>}
            </div>
          </section>
        </div>
          </>
        ) : (
          <section className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-[#172523]">Select an employee</h2>
            <p className="mt-2 text-sm text-[#71807c]">
              Search the Google Workspace directory and select an employee to view their passport.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

type AttendanceEntry = {
  checkedInAt: string;
  training: string;
  category: string;
  name: string;
  email: string;
};

function isAttendanceEntry(value: unknown): value is AttendanceEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "checkedInAt" in value &&
    typeof value.checkedInAt === "string" &&
    "training" in value &&
    typeof value.training === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string"
  );
}

function ReportingView() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/attendance", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Attendance report request failed with status ${response.status}`);
        }

        const result: unknown = await response.json();
        if (!Array.isArray(result) || !result.every(isAttendanceEntry)) {
          throw new Error("Attendance report returned an invalid response.");
        }

        if (!cancelled) {
          setEntries(result);
        }
      } catch (loadError) {
        console.error("Attendance report request failed:", loadError);
        if (!cancelled) {
          setError("Could not load attendance from the Google Sheet. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filteredEntries = entries
    .filter((entry) => {
      const date = entry.checkedInAt.slice(0, 10);
      return date >= fromDate && date <= toDate;
    })
    .sort((a, b) => b.checkedInAt.localeCompare(a.checkedInAt));

  const uniqueEmployees = new Set(filteredEntries.map((entry) => entry.email.toLowerCase())).size;
  const categorySummary = Array.from(
    filteredEntries.reduce((summary, entry) => {
      const category = entry.category || "Uncategorized";
      const current = summary.get(category) ?? { checkIns: 0, latestCheckIn: entry.checkedInAt };
      summary.set(category, {
        checkIns: current.checkIns + 1,
        latestCheckIn: current.latestCheckIn > entry.checkedInAt ? current.latestCheckIn : entry.checkedInAt,
      });
      return summary;
    }, new Map<string, { checkIns: number; latestCheckIn: string }>()),
    ([category, totals]) => ({ category, ...totals }),
  ).sort((a, b) => b.checkIns - a.checkIns);

  function exportReport() {
    downloadCsv("attendance-report.csv", [
      ["Checked in at", "Training category", "Training", "Employee name", "Email"],
      ...filteredEntries.map((entry) => [
        entry.checkedInAt,
        entry.category,
        entry.training,
        entry.name,
        entry.email,
      ]),
    ]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168f89]">Live Google Sheet data</p>
          <h1 className="mt-2 font-serif text-4xl tracking-[-0.05em] text-[#14211f] sm:text-5xl">Reporting</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={isLoading}
            className="h-10 rounded-[10px] border border-[#cfdad6] bg-white px-4 text-sm font-medium text-[#344743] hover:bg-[#eaf5f1] disabled:opacity-60"
          >
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={exportReport}
            disabled={!filteredEntries.length}
            className="h-10 rounded-[10px] bg-[#1aa6a1] px-4 text-sm font-semibold text-white hover:bg-[#148d88] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV ↓
          </button>
        </div>
      </div>

      <section className="flex flex-wrap items-end gap-3 rounded-[18px] border border-[#d7e1dd] bg-[#f8fbf9] p-4 sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#647570]">From</span>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="h-10 rounded-[10px] border border-[#cfdad6] bg-white px-3 text-sm text-[#344743] outline-none focus:border-[#1ca5a0]"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#647570]">To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(event) => setToDate(event.target.value)}
            className="h-10 rounded-[10px] border border-[#cfdad6] bg-white px-3 text-sm text-[#344743] outline-none focus:border-[#1ca5a1]"
          />
        </label>
        <p className="ml-auto text-xs text-[#647570]">
          {isLoading ? "Loading attendance…" : `${filteredEntries.length} check-ins in selected date range`}
        </p>
      </section>

      {error && (
        <div role="alert" className="rounded-[14px] border border-[#edc9c9] bg-[#fff4f3] px-4 py-3 text-sm text-[#a94856]">
          {error}
        </div>
      )}

      {!error && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Employee check-ins", value: filteredEntries.length },
              { label: "Unique employees", value: uniqueEmployees },
              { label: "Categories with attendance", value: categorySummary.length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[16px] border border-[#d7e1dd] bg-[#f8fbf9] p-4">
                <p className="text-xs font-medium text-[#71807c]">{stat.label}</p>
                <p className="mt-2 font-serif text-3xl text-[#172523]">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-[18px] border border-[#d7e1dd] bg-[#f8fbf9]">
            <div className="border-b border-[#dfe7e4] px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-[#243531]">Attendance by category</h2>
            </div>
            {categorySummary.length ? (
              categorySummary.map((summary) => (
                <div key={summary.category} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5ebe8] px-4 py-3 last:border-b-0 sm:px-5">
                  <span className="font-medium text-[#243531]">{summary.category}</span>
                  <span className="text-sm text-[#536663]">
                    {summary.checkIns} check-ins <span aria-hidden="true">·</span> Latest{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(summary.latestCheckIn))}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-[#71807c]">
                {isLoading ? "Loading records…" : "No attendance records for this date range."}
              </p>
            )}
          </section>

          <section className="overflow-x-auto rounded-[18px] border border-[#d7e1dd] bg-[#f8fbf9]">
            <div className="border-b border-[#dfe7e4] px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-[#243531]">Recent check-ins</h2>
            </div>
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[1.2fr_1.4fr_1.2fr_1fr_1.2fr] gap-3 border-b border-[#dfe7e4] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#71807c] sm:px-5">
                <span>Checked in</span><span>Category</span><span>Training</span><span>Employee</span><span>Email</span>
              </div>
              {filteredEntries.map((entry, index) => (
                <div key={`${entry.checkedInAt}-${entry.email}-${index}`} className="grid grid-cols-[1.2fr_1.4fr_1.2fr_1fr_1.2fr] gap-3 border-b border-[#e5ebe8] px-4 py-3 text-xs text-[#344743] last:border-b-0 sm:px-5">
                  <span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.checkedInAt))}</span>
                  <span>{entry.category || "—"}</span>
                  <span>{entry.training}</span>
                  <span>{entry.name}</span>
                  <span>{entry.email}</span>
                </div>
              ))}
              {!isLoading && filteredEntries.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-[#71807c]">No check-ins to display.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function AdminContent({ adminName }: { adminName: string }) {
  const [activeSection, setActiveSection] = useState<AdminSection>("Overview");
  const [trainings, setTrainings] = useState(initialTrainings);

  function createTraining(training: Omit<Training, "id">) {
    setTrainings((current) => [...current, {
      ...training,
      id: Date.now(),
      bonAttendees: 0,
      attendeeType: "Employee",
      checkIns: 0,
    }]);
    setActiveSection("Trainings");
  }

  return (
    <main className="min-h-screen bg-[#eff3f1] text-[#11201d]">
      <header className="sticky top-0 z-10 border-b border-[#dfe4e1] bg-[#f7f7f5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1ca5a0] text-sm font-bold text-white">G</span>
            <div>
              <p className="text-lg font-semibold tracking-[-0.04em] text-[#1d2b28]">GrowthPath</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71807c]">Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#5b6d69] sm:inline">Hi, {adminName}</span>
            <Link href="/" className="rounded-full border border-[#d7e1dd] px-4 py-2 text-sm font-semibold text-[#147e78] hover:bg-[#eaf5f1]">
              Personal view
            </Link>
          </div>
        </div>
        <nav aria-label="Admin navigation" className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-4 pb-3">
          {navigation.map((section) => (
            <button
              key={section}
              aria-current={activeSection === section ? "page" : undefined}
              onClick={() => setActiveSection(section)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === section ? "bg-[#1ca5a0] text-white" : "text-[#4d625d] hover:bg-[#e3ece8]"
              }`}
            >
              {section}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:py-10">
        {activeSection !== "People & TIP" &&
          activeSection !== "Reporting" &&
          activeSection !== "Sellability Courses" && (
          <div className="mb-8 flex items-start gap-3 rounded-[16px] border border-[#bddbd4] bg-[#e5f3ed] px-4 py-3 text-sm text-[#3d6258]">
            <span className="mt-0.5 font-bold" aria-hidden="true">i</span>
            <p><strong>Preview data.</strong> Sample records are shown for layout review. Changes made here are temporary and won’t be saved.</p>
          </div>
        )}

        {activeSection === "Overview" && <Overview trainings={trainings} onNavigate={setActiveSection} />}
        {activeSection === "Trainings" && (
          <TrainingLog trainings={trainings} onStart={() => setActiveSection("Start training")} />
        )}
        {activeSection === "Start training" && <TrainingForm onCreate={createTraining} />}
        {activeSection === "People & TIP" && <PeopleView />}
        {activeSection === "Reporting" && <ReportingView />}
        {activeSection === "Sellability Courses" && <SellabilityEnrollments />}
      </div>
    </main>
  );
}
