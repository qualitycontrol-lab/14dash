"use client";

import type { ReactNode } from "react";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const icons: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4 10-10" />,
    badge: <path d="M12 2.5 14.8 4l2.2 2.2 2.5 2.2-1.2 2.7 1.2 2.6-2.5 2.3-2.2 2.2L12 21.5l-2.7-1.2-2.2-2.2-2.5-2.3 1.2-2.6L4.3 8.4 6.5 6.2 9 4l3-1.5Z" />,
    spark: (
      <>
        <path d="M12 1.5v6.5" />
        <path d="M9 4.5h6" />
        <path d="m14 9 2.5 2.5" />
        <path d="m10 9-2.5 2.5" />
        <path d="M12 18.5v4" />
        <path d="M9.5 20.5h5" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
        <path d="M4 5.5V21" />
      </>
    ),
    goal: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v4" />
        <path d="M4 12h4" />
        <path d="M16 12h4" />
        <path d="M12 16v4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    download: (
      <>
        <path d="M12 3v10" />
        <path d="m7 18 5 5 5-5" />
        <path d="M4 21h16" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    chevronRight: <path d="m9 18 6-6-6-6" />,
    shield: (
      <>
        <path d="M12 3 5 6v5c0 5 3.4 9.3 7 10 3.6-.7 7-5 7-10V6l-7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.3-3.9" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return <svg {...common}>{icons[name] ?? icons.spark}</svg>;
}

const outlineCard = "rounded-[26px] border border-[#d7e1dd] bg-[#f8fbf9] shadow-[inset_0_0_0_1px_rgba(245,248,247,0.7)]";

function Header() {
  return (
    <header className="border-b border-[#dfe4e1] bg-[#f7f7f5]">
      <div className="mx-auto flex max-w-[1240px] items-center gap-6 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1ca5a0] text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.5)]">
            <Icon name="goal" size={17} />
          </div>
          <div className="text-[20px] font-semibold tracking-[-0.03em] text-[#1d2b28]">GrowthPath</div>
        </div>

        <div className="ml-8 flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-[700px] items-center gap-3 rounded-full border border-[#dfe6e2] bg-[#f1f4f2] px-4 py-3 text-[#7f8d8a]">
            <Icon name="search" size={16} />
            <span className="text-[15px]">Search skills, modules, resources...</span>
          </div>
        </div>

        <button className="ml-auto inline-flex h-11 items-center justify-center rounded-full bg-[#1aa6a1] px-6 text-[15px] font-semibold text-white shadow-[0_2px_0_rgba(0,0,0,0.04)] transition-transform hover:scale-[1.01]">
          Sign In
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-12">
      <div className="mx-auto max-w-[720px] text-center">
        <div className="mb-8 inline-flex items-center justify-center rounded-full border border-[#b6d9d2] bg-[#d8f1ea] px-4 py-2 text-[13px] font-semibold text-[#0b7d75]">
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1ca5a0] text-[10px] text-white">
            <Icon name="check" size={10} />
          </span>
          Your Growth Navigator
        </div>

        <h1 className="text-[68px] font-semibold tracking-[-0.07em] text-[#0f1f1d] leading-[0.95]">
          Welcome to Your Center for
          <span className="mt-2 block bg-gradient-to-r from-[#1ba49e] to-[#4db8a5] bg-clip-text text-transparent">Continuous Improvement</span>
        </h1>

        <p className="mx-auto mt-8 max-w-[720px] text-[22px] leading-[1.45] text-[#445954]">
          Whether you&apos;re here to explore, address a challenge, grow your skills, or earn a credential—you&apos;re next step starts here. Focus on Growth. We&apos;ll handle the roadmap.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div className="rounded-[28px] border border-[#d8e1de] bg-[#f8faf9] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1fa4a1] text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.5)]">
            <Icon name="book" size={28} />
          </div>
          <h2 className="text-[36px] font-semibold tracking-[-0.05em] text-[#1a1f1d]">Digital Library</h2>
          <p className="mt-5 text-[20px] leading-[1.5] text-[#4c5e5c]">
            Explore our comprehensive collection of articles, drills, worksheets, and resources. Build your knowledge foundation.
          </p>
          <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8d5bdb] to-[#b05bdd] py-4 text-[18px] font-semibold text-white">
            Browse Library <Icon name="arrow" size={17} />
          </button>
        </div>

        <div className="rounded-[28px] border border-[#d8e1de] bg-[#f8faf9] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1d9ad7] text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,0.5)]">
            <Icon name="goal" size={28} />
          </div>
          <h2 className="text-[36px] font-semibold tracking-[-0.05em] text-[#1a1f1d]">Improvement Program</h2>
          <p className="mt-5 text-[20px] leading-[1.5] text-[#4c5e5c]">
            Work with your coach to address specific areas for growth. A personalized path to clarity and resolution.
          </p>
          <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#0a99ac] to-[#1ea7ab] py-4 text-[18px] font-semibold text-white">
            Start Program <Icon name="arrow" size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

function MasteryCards() {
  const stats = [
    { label: "Skills Mastered", value: "12/20", icon: "badge", percent: 60, color: "bg-[#1ca5a0]", badge: "bg-[#d8f1ea]" },
    { label: "Modules Completed", value: "28/45", icon: "book", percent: 62, color: "bg-[#1ca5a0]", badge: "bg-[#d8f1ea]" },
    { label: "Goals Achieved", value: "5/8", icon: "goal", percent: 63, color: "bg-[#f1a05d]", badge: "bg-[#f8e7d8]" },
  ];

  return (
    <section className="mx-auto mt-20 max-w-[1240px] px-4">
      <div className="mb-8 flex items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d7f0ea] text-[#1c8d8a]">
          <Icon name="spark" size={24} />
        </div>
        <div>
          <h2 className="text-[42px] font-semibold tracking-[-0.06em] text-[#141d1b]">Mastery in Progress</h2>
        </div>
      </div>

      <p className="mb-8 text-[19px] text-[#4b615e]">Every step forward is an investment in your confidence</p>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${outlineCard} p-5`}>
            <div className="mb-5 flex items-center justify-between">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${stat.badge} text-[#1e8f89]`}>
                <Icon name={stat.icon} size={28} />
              </div>
              <span className={`rounded-full px-3 py-1 text-[12px] font-semibold text-[#0f716d] ${stat.badge}`}>
                {stat.percent}%
              </span>
            </div>
            <div className="text-[54px] font-semibold tracking-[-0.07em] text-[#15211f]">{stat.value}</div>
            <div className="mt-2 text-[18px] text-[#4a5d5a]">{stat.label}</div>
            <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-[#e4ece8]">
              <div className={`h-full rounded-full ${stat.color}`} style={{ width: `${stat.percent}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className={`${outlineCard} mt-10 p-4`}>
        <div className="mb-4 flex items-center gap-3 px-2 pt-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8f1ea] text-[#1ca5a0]">
            <Icon name="shield" size={20} />
          </div>
          <h3 className="text-[28px] font-semibold tracking-[-0.04em] text-[#101b19]">Recent Achievements</h3>
        </div>

        <div className="space-y-3">
          {[
            ["Communication Mastery", "2 days ago"],
            ["Conflict Resolution", "1 week ago"],
            ["Time Management", "2 weeks ago"],
          ].map(([title, age]) => (
            <div key={String(title)} className="flex items-center justify-between rounded-[18px] border border-[#d8e1de] bg-[#f6faf9] px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9f3ea] text-[#1ca5a0]">
                  <Icon name="check" size={15} />
                </div>
                <div>
                  <div className="text-[22px] font-medium tracking-[-0.03em] text-[#172422]">{String(title)}</div>
                  <div className="text-[15px] text-[#5d6f6c]">{String(age)}</div>
                </div>
              </div>
              <span className="rounded-full border border-[#8ac9be] bg-[#d9f3ea] px-3 py-1 text-[12px] font-semibold text-[#0f7d74]">Mastered</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Practice() {
  const cards = [
    {
      title: "Effective Communication Strategies",
      description: "Apply proven techniques to enhance workplace communication",
      percent: 100,
      level: "beginner",
      label: "Review",
      action: "bg-[#1ca5a0] text-white",
      icon: "book",
    },
    {
      title: "Practice: Difficult Conversations",
      description: "Simulate challenging scenarios to build confidence",
      percent: 60,
      level: "intermediate",
      label: "Continue",
      action: "bg-[#1ca5a0] text-white",
      icon: "user",
    },
    {
      title: "Conflict Resolution Drill",
      description: "Refine your de-escalation skills through interactive exercises",
      percent: 0,
      level: "intermediate",
      label: "Practice",
      action: "bg-white text-[#20413e] border border-[#d7e1dd]",
      icon: "play",
    },
    {
      title: "Self-Assessment Worksheet",
      description: "Reflect on your communication patterns and identify growth areas",
      percent: 0,
      level: "beginner",
      label: "Complete",
      action: "bg-white text-[#20413e] border border-[#d7e1dd]",
      icon: "download",
    },
  ];

  return (
    <section className="mx-auto mt-20 max-w-[1240px] px-4">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d7f0ea] text-[#1aa6a1]">
            <Icon name="spark" size={24} />
          </div>
          <h2 className="text-[42px] font-semibold tracking-[-0.06em] text-[#121d1c]">Active Learning Tools</h2>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-[#d8e1de] bg-[#f5f8f7] px-5 py-3 text-[18px] font-medium text-[#1c2725]">
          View All Modules <Icon name="arrow" size={18} />
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {cards.slice(0, 2).map((card) => (
          <div key={card.title} className={`${outlineCard} p-5`}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d8f1ea] text-[#1aa6a1]">
                <Icon name={card.icon} size={26} />
              </div>
              <div className="rounded-full border border-[#bcdccf] bg-[#d8f1ea] px-3 py-1 text-[12px] font-semibold text-[#0e7e7b]">
                {card.level}
              </div>
            </div>
            <h3 className="text-[32px] font-semibold tracking-[-0.05em] text-[#14211f]">{card.title}</h3>
            <p className="mt-4 text-[18px] leading-[1.5] text-[#52635f]">{card.description}</p>
            <div className="mt-10 flex items-center justify-between text-[14px] text-[#5e706e]">
              <span>Progress</span>
              <span className="font-semibold text-[#0f1f1d]">{card.percent}%</span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#e6ece9]">
              <div className="h-full rounded-full bg-[#1ca5a0]" style={{ width: `${card.percent}%` }} />
            </div>
            <button className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[18px] font-semibold ${card.action}`}>
              {card.label} <Icon name="arrow" size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {cards.slice(2).map((card) => (
          <div key={card.title} className={`${outlineCard} p-5`}>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3f5f4] text-[#1e3234]">
                <Icon name={card.icon} size={26} />
              </div>
              <div className="rounded-full border border-[#d6dfdb] bg-[#f3f6f5] px-3 py-1 text-[12px] font-semibold text-[#4f615f]">
                {card.level}
              </div>
            </div>
            <h3 className="text-[32px] font-semibold tracking-[-0.05em] text-[#14211f]">{card.title}</h3>
            <p className="mt-4 text-[18px] leading-[1.5] text-[#52635f]">{card.description}</p>
            <button className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[18px] font-semibold ${card.action}`}>
              {card.label} <Icon name="arrow" size={18} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function CalendarSection() {
  return (
    <section className="mx-auto mt-20 max-w-[1240px] px-4">
      <div className="mb-14 flex items-center justify-center gap-7">
        <button className="rounded-full border border-[#d8e1de] bg-[#f5f8f7] px-8 py-4 text-[20px] font-medium text-[#1d302d] shadow-sm">
          Practice <Icon name="arrow" size={16} />
        </button>
        <button className="rounded-full border border-[#d8e1de] bg-[#f5f8f7] px-8 py-4 text-[20px] font-medium text-[#1d302d] shadow-sm">
          Complete <Icon name="arrow" size={16} />
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
        <div className={`${outlineCard} p-8`}>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[52px] font-semibold tracking-[-0.06em] text-[#131f1d]">July 2026</h2>
            <div className="flex items-center gap-3">
              <button className="rounded-full border border-[#dfe7e4] bg-[#f5f8f7] px-3 py-2 text-[14px] font-medium">Week</button>
              <button className="rounded-full bg-[#d9f1ea] px-3 py-2 text-[14px] font-medium text-[#0f7d75]">Month</button>
              <button className="rounded-full border border-[#dfe7e4] bg-[#f5f8f7] px-3 py-2 text-[14px] font-medium">Quarter</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 text-center text-[14px] font-medium text-[#768883]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-3">
            {Array.from({ length: 35 }, (_, index) => {
              const day = index + 1;
              const session = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].includes(day);
              const isSelected = day === 8;
              const isHighlighted = [11, 13, 17, 22, 25, 29].includes(day);

              return (
                <div
                  key={day}
                  className={`flex min-h-[96px] flex-col items-center justify-start rounded-[18px] border p-2 ${
                    isSelected ? "border-[#1ca5a0] bg-[#d8f1ea]" : "border-[#e4ebea] bg-[#f6f9f8]"
                  }`}
                >
                  <div className="text-[18px] font-medium text-[#1f2c29]">{day}</div>
                  {session && (
                    <div className={`mt-2 w-full rounded-full px-2 py-1 text-[10px] font-medium ${isHighlighted ? "bg-[#d8f1ea] text-[#0f7d75]" : "bg-[#f0f3f2] text-[#51615d]"}`}>
                      {day === 8 ? "Workshop" : day === 11 ? "Admin" : day === 22 ? "Training" : "Session"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-[26px] border border-[#d7e1dd] bg-[#0e8d85] p-5 text-white shadow-[0_8px_20px_rgba(16,106,96,0.16)]">
            <div className="mb-4 text-[14px] font-semibold uppercase tracking-[0.15em] text-[#d9f6f1]">Today</div>
            <h3 className="text-[28px] font-semibold tracking-[-0.05em]">Administration Basics</h3>
            <div className="mt-5 space-y-3 text-[16px] text-[#ebfffb]">
              <div className="flex items-center gap-3"><Icon name="calendar" size={16} /> 10:00 AM</div>
              <div className="flex items-center gap-3"><Icon name="user" size={16} /> Room 204</div>
              <div className="flex items-center gap-3"><Icon name="check" size={16} /> 12 expected</div>
            </div>
            <button className="mt-7 flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-3 text-[18px] font-semibold text-white">
              Open check-in <Icon name="arrow" size={18} />
            </button>
          </div>

          <div className="rounded-[24px] border border-[#d7e1dd] bg-[#f7faf9] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[26px] font-semibold tracking-[-0.05em] text-[#131f1d]">Coming up</h3>
              <button className="text-[14px] font-medium text-[#3d5d5a]">All sessions</button>
            </div>
            <div className="space-y-4">
              {[
                { day: 'JUL 14', title: 'Self Governance Roundtable', time: '2:00 PM · 16 expected', color: 'bg-[#d9f1ea] text-[#0a7d74]' },
                { day: 'JUL 16', title: 'Trainer Refresh Series', time: '1:00 PM · 8 expected', color: 'bg-[#f5d9df] text-[#b45d76]' },
                { day: 'JUL 20', title: 'Learning Forum: Leadership', time: '10:30 AM · 30 expected', color: 'bg-[#e9ddfb] text-[#6a5ec6]' },
                { day: 'JUL 22', title: 'Online Academy: New Hire', time: '9:30 AM · 18 expected', color: 'bg-[#fbe5d9] text-[#c77b3d]' },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3 rounded-[14px] bg-white p-2">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[10px] text-[12px] font-semibold ${item.color}`}>{item.day.split(' ')[1]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-medium text-[#171f1d]">{item.title}</div>
                    <div className="text-[13px] text-[#5f706d]">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SkillsList() {
  const skills = [
    'Active Listening',
    'Empathy in Communication',
    'Clear Written Communication',
    'Non-verbal Cues',
  ];

  return (
    <section className="mx-auto mt-20 max-w-[1240px] px-4">
      <div className="mx-auto max-w-[900px] rounded-[28px] border border-[#d9e2df] bg-[#f8fbf9] p-7">
        <div className="mb-7 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d8f1ea] text-[#1ca5a0]">
            <Icon name="spark" size={20} />
          </div>
          <h2 className="text-[42px] font-semibold tracking-[-0.06em] text-[#111a19]">Skills Mastered Today</h2>
        </div>

        <div className="space-y-4">
          {skills.map((skill) => (
            <div key={skill} className="flex items-center justify-between rounded-[18px] border border-[#d8e1de] bg-[#dff3ee] px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ccefe7] text-[#0c7d74]">
                  <Icon name="spark" size={20} />
                </div>
                <span className="text-[24px] tracking-[-0.04em] text-[#1d2927]">{skill}</span>
              </div>
              <span className="rounded-full border border-[#7dcabf] bg-[#cfeee6] px-4 py-1 text-[14px] font-semibold text-[#0e7d74]">Mastered</span>
            </div>
          ))}
        </div>

        <button className="mt-7 flex w-full items-center justify-center gap-3 rounded-[18px] border border-[#d7e1dd] bg-transparent py-4 text-[20px] font-medium text-[#172523]">
          <Icon name="download" size={20} /> Download Summary Sheet
        </button>
      </div>
    </section>
  );
}

function RecommendedPath() {
  const steps = [
    { title: 'Advanced Negotiation', description: 'Build on your communication foundation', icon: 'chevronRight' },
    { title: 'Leadership Essentials', description: 'Ready for the next level', icon: 'chevronRight' },
  ];

  return (
    <section className="mx-auto mt-20 max-w-[1240px] px-4 pb-24">
      <div className="rounded-[28px] border border-[#d7e1dd] bg-[#f8fbf9] p-7">
        <div className="mb-7 flex items-center gap-3">
          <div className="text-[40px] font-semibold text-[#1aa6a1]">›</div>
          <h2 className="text-[42px] font-semibold tracking-[-0.06em] text-[#141f1d]">Next Recommended Path</h2>
        </div>

        <div className="space-y-5">
          {steps.map((item) => (
            <div key={item.title} className="flex items-center justify-between rounded-[22px] border border-[#d9e2df] bg-[#f8fbf9] px-6 py-5 text-[#121d1c]">
              <div>
                <div className="text-[30px] font-medium tracking-[-0.04em]">{item.title}</div>
                <div className="mt-1 text-[18px] text-[#536663]">{item.description}</div>
              </div>
              <div className="text-[28px] text-[#1d2b2a]">
                <Icon name={item.icon} size={20} />
              </div>
            </div>
          ))}
        </div>

        <button className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#1ea5a2] to-[#3ec5ad] py-5 text-[26px] font-semibold text-white">
          Continue Learning Journey <Icon name="arrow" size={22} />
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#eff3f1] text-[#11201d]">
      <Header />
      <div className="pb-16">
        <Hero />
        <MasteryCards />
        <Practice />
        <CalendarSection />
        <SkillsList />
        <RecommendedPath />
      </div>
    </main>
  );
}
