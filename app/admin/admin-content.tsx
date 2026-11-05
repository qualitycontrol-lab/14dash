"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

type TrainingType = "HCA" | "CSG" | "TTT" | "LF" | "OTA" | "WS" | "Misc";
type TrainingStatus = "Upcoming" | "Completed";
type Training = {
  id: number;
  title: string;
  type: TrainingType;
  date: string;
  attendees: number;
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
  { id: 1, title: "Administration Basics", type: "HCA", date: "2026-11-08", attendees: 20, status: "Upcoming" },
  { id: 2, title: "Self Governance Roundtable", type: "CSG", date: "2026-11-14", attendees: 16, status: "Upcoming" },
  { id: 3, title: "Warehouse Safety Workshop", type: "WS", date: "2026-10-28", attendees: 15, status: "Completed" },
  { id: 4, title: "Learning Forum: Leadership", type: "LF", date: "2026-10-23", attendees: 30, status: "Completed" },
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

function PeopleView() {
  const people = [
    { initials: "TM", name: "Taylor Morgan", department: "Operations", confirmed: "3 of 4 trainings" },
    { initials: "JR", name: "Jordan Rivera", department: "Field team", confirmed: "2 of 3 trainings" },
    { initials: "AC", name: "Alex Chen", department: "Administration", confirmed: "4 of 4 trainings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168f89]">People & TIP</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-[#14211f]">People and training goals</h1>
        <p className="mt-3 text-[#5b6d69]">Review participation and keep track of individual training goals.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#172523]">Roster</h2>
            <span className="text-xs text-[#71807c]">{people.length} people</span>
          </div>
          <div className="space-y-2">
            {people.map((person) => (
              <div key={person.name} className="flex items-center gap-3 rounded-[14px] bg-white p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9f1ea] text-xs font-semibold text-[#147e78]">
                  {person.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#233531]">{person.name}</p>
                  <p className="text-xs text-[#71807c]">{person.department}</p>
                </div>
                <span className="text-xs text-[#71807c]">{person.confirmed}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9] p-5">
          <h2 className="text-xl font-semibold text-[#172523]">Training goals</h2>
          <div className="mt-4 space-y-3">
            {["Advanced Governance Practicum", "Trainer Shadowing", "Certification Exam"].map((goal, index) => (
              <div key={goal} className="flex items-center gap-3 rounded-[14px] bg-white p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#9cbdb4] text-xs font-semibold text-[#147e78]">{index + 1}</span>
                <span className="text-sm font-medium text-[#344743]">{goal}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportingView({ trainings }: { trainings: Training[] }) {
  const totals = useMemo(
    () => trainingTypes.map((type) => ({
      ...type,
      count: trainings.filter((training) => training.type === type.code).length,
      attendees: trainings
        .filter((training) => training.type === type.code)
        .reduce((sum, training) => sum + training.attendees, 0),
    })),
    [trainings],
  );
  const maxCount = Math.max(1, ...totals.map((type) => type.count));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168f89]">Reporting</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-[#14211f]">Training activity</h1>
        <p className="mt-3 text-[#5b6d69]">A category summary of the trainings currently shown in this preview.</p>
      </div>
      <section className="overflow-hidden rounded-[22px] border border-[#d7e1dd] bg-[#f8fbf9]">
        <div className="grid grid-cols-[minmax(0,2fr)_0.7fr_0.7fr] gap-3 border-b border-[#dfe7e4] px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#71807c]">
          <span>Training type</span><span>Trainings</span><span>Attendees</span>
        </div>
        {totals.map((type) => (
          <div key={type.code} className="grid grid-cols-[minmax(0,2fr)_0.7fr_0.7fr] items-center gap-3 border-b border-[#e5ebe8] px-5 py-4 last:border-b-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-[#243531]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#1ca5a0]" />
                <span className="truncate">{type.name}</span>
              </div>
              <div className="mt-2 h-1.5 max-w-[300px] overflow-hidden rounded-full bg-[#e1e9e5]">
                <div className="h-full rounded-full bg-[#1ca5a0]" style={{ width: `${(type.count / maxCount) * 100}%` }} />
              </div>
            </div>
            <span className="text-sm text-[#344743]">{type.count}</span>
            <span className="text-sm text-[#344743]">{type.attendees}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AdminContent({ adminName }: { adminName: string }) {
  const [activeSection, setActiveSection] = useState<AdminSection>("Overview");
  const [trainings, setTrainings] = useState(initialTrainings);
  const [search, setSearch] = useState("");

  const filteredTrainings = trainings.filter((training) =>
    `${training.title} ${training.type} ${training.status}`.toLowerCase().includes(search.toLowerCase()),
  );

  function createTraining(training: Omit<Training, "id">) {
    setTrainings((current) => [...current, { ...training, id: Date.now() }]);
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
        <div className="mb-8 flex items-start gap-3 rounded-[16px] border border-[#bddbd4] bg-[#e5f3ed] px-4 py-3 text-sm text-[#3d6258]">
          <span className="mt-0.5 font-bold" aria-hidden="true">i</span>
          <p><strong>Preview data.</strong> Sample records are shown for layout review. Changes made here are temporary and won’t be saved.</p>
        </div>

        {activeSection === "Overview" && <Overview trainings={trainings} onNavigate={setActiveSection} />}
        {activeSection === "Trainings" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#168f89]">Schedule & attendance</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-[#14211f] sm:text-5xl">Trainings</h1>
              </div>
              <button onClick={() => setActiveSection("Start training")} className="h-11 rounded-full bg-[#1aa6a1] px-5 text-sm font-semibold text-white hover:bg-[#148d88]">
                + Start a training
              </button>
            </div>
            <label className="block max-w-[420px]">
              <span className="sr-only">Search trainings</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by training title or type..."
                className="h-12 w-full rounded-[14px] border border-[#cfdad6] bg-[#f8fbf9] px-4 text-sm outline-none focus:border-[#1ca5a0] focus:ring-2 focus:ring-[#1ca5a0]/15"
              />
            </label>
            <TrainingList trainings={filteredTrainings} />
          </section>
        )}
        {activeSection === "Start training" && <TrainingForm onCreate={createTraining} />}
        {activeSection === "People & TIP" && <PeopleView />}
        {activeSection === "Reporting" && <ReportingView trainings={trainings} />}
      </div>
    </main>
  );
}
