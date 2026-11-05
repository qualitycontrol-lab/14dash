"use client";

import { signIn } from "next-auth/react";

export default function SignInContent() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eff3f1] px-4 py-12 text-[#11201d]">
      <section className="w-full max-w-[560px] rounded-[28px] border border-[#d7e1dd] bg-[#f8fbf9] p-6 shadow-[0_20px_60px_rgba(27,59,53,0.08)] sm:p-10">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1ca5a0] text-sm font-bold text-white">
            G
          </div>
          <div>
            <p className="text-xl font-semibold tracking-[-0.04em] text-[#1d2b28]">GrowthPath</p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#70817d]">Admin access</p>
          </div>
        </div>

        <div className="max-w-[620px]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#178c86]">Welcome</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#14211f] sm:text-5xl">
            Sign in to continue
          </h1>
          <p className="mt-4 text-base leading-7 text-[#536663]">
            Sign in with an approved BON Google account. If your account has not
            been approved, contact your administrator.
          </p>
        </div>

        <div className="mt-9">
          <button
            className="w-full rounded-[22px] border border-[#d7e1dd] bg-white p-6 text-left transition hover:border-[#1ca5a0] hover:shadow-[0_8px_24px_rgba(27,59,53,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#168f89]"
            onClick={() => void signIn("google", { callbackUrl: "/admin" })}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9f1ea] text-[#10857e]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
            </span>
            <span className="mt-5 block text-xl font-semibold tracking-[-0.03em]">Approved administrators</span>
            <span className="mt-2 block text-sm leading-6 text-[#62736f]">
              Manage trainings, people, and reporting.
            </span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#117f79]">
              Admin sign in <span aria-hidden="true">→</span>
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
