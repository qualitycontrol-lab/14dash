"use client";

import { useEffect } from "react";

export default function CheckInError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Check-in page failed to render:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-[#eff3f1] px-4 py-6 text-[#11201d]">
      <section className="w-full max-w-[560px] rounded-[20px] border border-[#d7e1dd] bg-[#f8fbf9] p-6 text-center shadow-[0_20px_60px_rgba(27,59,53,0.08)] sm:rounded-[26px] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168f89]">
          BON Training · Public check-in
        </p>
        <h1 className="mt-3 font-serif text-3xl tracking-[-0.05em] text-[#172523] sm:text-4xl">
          Check-in is temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#536663]">
          Please try loading this page again. If the problem continues, ask the
          training administrator for help.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 min-h-12 w-full rounded-full bg-[#168f89] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#117c77]"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
