"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

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
type AdminSection = "Overview" | "Trainings" | "Start training" | "People & TIP" | "Reporting";

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

const navigation: AdminSection[] = ["Overview", "Trainings", "Start training", "People & TIP", "Reporting"];

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

type StampStatus = "Confirmed" | "Awaiting confirmation";
type PassportCourse = {
  id: number;
  title: string;
  type: TrainingType;
  date: string;
  status: StampStatus;
};
type PersonRecord = {
  id: number;
  name: string;
  role: string;
  department: string;
  trainer: string;
  started: string;
  goals: string[];
  courses: PassportCourse[];
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

const initialPeople: PersonRecord[] = [
  {
    id: 1, name: "Maria Chen", role: "Field Coordinator", department: "Field Ops", trainer: "Juliana Kim", started: "2026-01-15",
    goals: ["Advanced Governance Practicum", "Trainer Shadowing", "Certification Exam"],
    courses: [
      { id: 1, title: "Foundations in Self Governance", type: "CSG", date: "2026-03-12", status: "Confirmed" },
      { id: 2, title: "Poli-Ticks: Living a Politically Disease-Free Life", type: "CSG", date: "2026-05-02", status: "Confirmed" },
      { id: 3, title: "Governance Case Studies", type: "CSG", date: "2026-08-21", status: "Awaiting confirmation" },
      { id: 4, title: "Administration Basics", type: "HCA", date: "2026-04-04", status: "Confirmed" },
      { id: 5, title: "People Leadership", type: "HCA", date: "2026-06-18", status: "Confirmed" },
      { id: 6, title: "Online Academy: Core Skills", type: "OTA", date: "2026-07-09", status: "Awaiting confirmation" },
      { id: 20, title: "Policy Leadership", type: "HCA", date: "2026-07-30", status: "Confirmed" },
    ],
  },
  { id: 2, name: "James Whitfield", role: "Retail Associate", department: "Retail Ops", trainer: "Morgan Ellis", started: "2026-02-04", goals: ["Operations Foundations"], courses: [
    { id: 7, title: "Foundations in Self Governance", type: "CSG", date: "2026-02-14", status: "Confirmed" },
    { id: 8, title: "Team Leadership", type: "HCA", date: "2026-04-22", status: "Confirmed" },
  ] },
  { id: 3, name: "Priya Natarajan", role: "Training Specialist", department: "Training Corps", trainer: "Juliana Kim", started: "2026-02-20", goals: ["Trainer Certification"], courses: [
    { id: 9, title: "Trainer Foundations", type: "TTT", date: "2026-03-16", status: "Confirmed" },
  ] },
  { id: 4, name: "Devon Marks", role: "Team Lead", department: "Remote Team", trainer: "Morgan Ellis", started: "2026-03-01", goals: ["Remote Facilitation"], courses: [
    { id: 10, title: "Online Academy: Core Skills", type: "OTA", date: "2026-03-19", status: "Confirmed" },
    { id: 11, title: "Remote Team Workshop", type: "WS", date: "2026-04-09", status: "Confirmed" },
  ] },
  { id: 5, name: "Sofía Álvarez", role: "Community Associate", department: "Community Team", trainer: "Juliana Kim", started: "2026-03-15", goals: ["Community Leadership"], courses: [
    { id: 12, title: "Learning Forum: Leadership", type: "LF", date: "2026-04-11", status: "Confirmed" },
  ] },
  { id: 6, name: "Ben Okafor", role: "Warehouse Associate", department: "Warehouse", trainer: "Morgan Ellis", started: "2026-04-03", goals: ["Safety Certification"], courses: [
    { id: 13, title: "Warehouse Safety Workshop", type: "WS", date: "2026-04-20", status: "Confirmed" },
  ] },
  { id: 7, name: "Grace Lindqvist", role: "Program Coordinator", department: "Corporate", trainer: "Juliana Kim", started: "2026-04-12", goals: ["Governance Fundamentals"], courses: [
    { id: 14, title: "Foundations in Self Governance", type: "CSG", date: "2026-05-05", status: "Confirmed" },
  ] },
  { id: 8, name: "Marcus Webb", role: "Retail Associate", department: "Retail Ops", trainer: "Morgan Ellis", started: "2026-05-01", goals: [], courses: [] },
  { id: 9, name: "Alina Torres", role: "Field Coordinator", department: "Field Ops", trainer: "Juliana Kim", started: "2026-05-13", goals: ["Advanced Governance Practicum"], courses: [
    { id: 15, title: "Governance Case Studies", type: "CSG", date: "2026-06-07", status: "Confirmed" },
    { id: 16, title: "People Leadership", type: "HCA", date: "2026-06-28", status: "Confirmed" },
    { id: 17, title: "Learning Forum: Leadership", type: "LF", date: "2026-07-12", status: "Confirmed" },
  ] },
  { id: 10, name: "Taylor Morgan", role: "Operations Coordinator", department: "Operations", trainer: "Morgan Ellis", started: "2026-06-02", goals: ["Operations Foundations"], courses: [
    { id: 18, title: "Team Leadership", type: "HCA", date: "2026-07-05", status: "Confirmed" },
    { id: 19, title: "Online Academy: Core Skills", type: "OTA", date: "2026-07-22", status: "Confirmed" },
  ] },
];

function initialsFor(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function PeopleView() {
  const [people, setPeople] = useState(initialPeople);
  const [selectedId, setSelectedId] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TrainingType | "All">("All");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedPerson = people.find((person) => person.id === selectedId) ?? people[0];
  if (!selectedPerson) return null;

  const filteredPeople = people.filter((person) =>
    `${person.name} ${person.department}`.toLowerCase().includes(search.toLowerCase()),
  );
  const confirmedCount = selectedPerson.courses.filter((course) => course.status === "Confirmed").length;
  const pendingCount = selectedPerson.courses.length - confirmedCount;
  const filteredCourses = selectedPerson.courses.filter((course) => category === "All" || course.type === category);
  const categoryCounts = trainingTypes.map(({ code }) => ({
    code,
    count: selectedPerson.courses.filter((course) => course.type === code).length,
  }));

  function updateSelectedPerson(update: (person: PersonRecord) => PersonRecord) {
    setPeople((current) => current.map((person) => person.id === selectedId ? update(person) : person));
  }

  function addPerson() {
    const newPerson: PersonRecord = {
      id: Date.now(),
      name: "New person",
      role: "Participant",
      department: "Add department",
      trainer: "Unassigned",
      started: new Date().toISOString().slice(0, 10),
      goals: [],
      courses: [],
    };
    setPeople((current) => [...current, newPerson]);
    setSelectedId(newPerson.id);
    setSearch("");
    setCategory("All");
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
    const tip = `${selectedPerson.name}\n${selectedPerson.department}\nStarted ${formatDate(selectedPerson.started)} · Trainer: ${selectedPerson.trainer}\n${confirmedCount} trainings confirmed · ${pendingCount} awaiting confirmation\nTraining goals: ${selectedPerson.goals.join(", ") || "None"}`;
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
          <span className="text-right text-[10px] text-[#71807c]">{people.length} people <span className="ml-1 rounded-full bg-[#eaf5f1] px-1.5 py-0.5 font-semibold text-[#147e78]">Preview</span></span>
        </div>
        <label className="block">
          <span className="sr-only">Search people by name</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name..."
            className="h-10 w-full rounded-[11px] border border-[#cfdad6] bg-white px-3 text-sm outline-none focus:border-[#1ca5a0] focus:ring-2 focus:ring-[#1ca5a0]/15"
          />
        </label>
        <div className="mt-3 max-h-[450px] space-y-1 overflow-y-auto pr-1">
          {filteredPeople.map((person, index) => {
            const confirmed = person.courses.filter((course) => course.status === "Confirmed").length;
            const selected = person.id === selectedId;
            return (
              <button
                key={person.id}
                onClick={() => { setSelectedId(person.id); setCategory("All"); setNotice(""); }}
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
                  <span className="block truncate text-[11px] text-[#7b8985]">{person.department}</span>
                </span>
                <span className="shrink-0 text-[11px] text-[#71807c]">
                  {person.courses.length > 0 && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#1ca5a0]" />}
                  {confirmed}/{person.courses.length}
                </span>
              </button>
            );
          })}
          {filteredPeople.length === 0 && <p className="px-2 py-6 text-center text-sm text-[#71807c]">No people found.</p>}
        </div>
        <button
          onClick={addPerson}
          className="mt-3 h-10 w-full rounded-[11px] bg-[#1aa6a1] text-sm font-semibold text-white transition-colors hover:bg-[#148d88]"
        >
          + Add person
        </button>
      </aside>

      <div className="min-w-0 space-y-4">
        <section className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-5 sm:p-7">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#a8c7bb] bg-[#eaf5f1] text-sm font-semibold text-[#147e78]">
                {initialsFor(selectedPerson.name)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold tracking-[-0.05em] text-[#172523] sm:text-3xl">{selectedPerson.name}</h2>
                <p className="mt-1 text-sm text-[#61726e]">{selectedPerson.role} · {selectedPerson.department} · Center for Self Governance</p>
                <p className="mt-1 font-mono text-[11px] text-[#7b8985]">Started {selectedPerson.started} · Trainer: {selectedPerson.trainer}</p>
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
            All <span className="ml-1 opacity-70">{selectedPerson.courses.length}</span>
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
                          {course.status === "Confirmed" ? "✓" : "?"}
                        </div>
                        <h3 className="mt-2 line-clamp-2 min-h-8 text-[11px] font-medium leading-4 text-[#283a36]">{course.title}</h3>
                        <p className="mt-1 text-[10px] text-[#71807c]">{course.date}</p>
                        <p className="mt-0.5 min-h-7 text-[9px] font-medium uppercase leading-3 tracking-wide text-[#71807c]">
                          {course.status}
                        </p>
                        <div className="mt-1 flex flex-wrap justify-center gap-1">
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
      </div>
    </div>
  );
}

type AttendanceEntry = {
  checkedInAt: string;
  training: string;
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
  const trainingSummary = Array.from(
    filteredEntries.reduce((summary, entry) => {
      const current = summary.get(entry.training) ?? { checkIns: 0, latestCheckIn: entry.checkedInAt };
      summary.set(entry.training, {
        checkIns: current.checkIns + 1,
        latestCheckIn: current.latestCheckIn > entry.checkedInAt ? current.latestCheckIn : entry.checkedInAt,
      });
      return summary;
    }, new Map<string, { checkIns: number; latestCheckIn: string }>()),
    ([training, totals]) => ({ training, ...totals }),
  ).sort((a, b) => b.checkIns - a.checkIns);

  function exportReport() {
    downloadCsv("attendance-report.csv", [
      ["Checked in at", "Training", "Employee name", "Email"],
      ...filteredEntries.map((entry) => [
        entry.checkedInAt,
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
              { label: "Trainings with attendance", value: trainingSummary.length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[16px] border border-[#d7e1dd] bg-[#f8fbf9] p-4">
                <p className="text-xs font-medium text-[#71807c]">{stat.label}</p>
                <p className="mt-2 font-serif text-3xl text-[#172523]">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-[18px] border border-[#d7e1dd] bg-[#f8fbf9]">
            <div className="border-b border-[#dfe7e4] px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-[#243531]">Attendance by training</h2>
            </div>
            {trainingSummary.length ? (
              trainingSummary.map((summary) => (
                <div key={summary.training} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5ebe8] px-4 py-3 last:border-b-0 sm:px-5">
                  <span className="font-medium text-[#243531]">{summary.training}</span>
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
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1.2fr] gap-3 border-b border-[#dfe7e4] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#71807c] sm:px-5">
                <span>Checked in</span><span>Training</span><span>Employee</span><span>Email</span>
              </div>
              {filteredEntries.map((entry, index) => (
                <div key={`${entry.checkedInAt}-${entry.email}-${index}`} className="grid grid-cols-[1.2fr_1.2fr_1fr_1.2fr] gap-3 border-b border-[#e5ebe8] px-4 py-3 text-xs text-[#344743] last:border-b-0 sm:px-5">
                  <span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.checkedInAt))}</span>
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
        {activeSection !== "People & TIP" && activeSection !== "Reporting" && (
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
      </div>
    </main>
  );
}
