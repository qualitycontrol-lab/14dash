"use client";

import { useEffect, useState, type ChangeEvent } from "react";

type Employee = {
  name: string;
  email: string;
};

function isEmployee(value: unknown): value is Employee {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string"
  );
}

export default function CheckInContent() {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (selectedEmployee || normalizedQuery.length < 2) {
      setEmployees([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setSearchError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/employees/search?q=${encodeURIComponent(normalizedQuery)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error(`Employee search failed with status ${response.status}`);
        }

        const result: unknown = await response.json();

        if (!Array.isArray(result)) {
          throw new Error("Employee search returned an invalid response.");
        }

        if (!cancelled) {
          setEmployees(result.filter(isEmployee));
        }
      } catch (error) {
        console.error("Employee search request failed:", error);
        if (!cancelled) {
          setSearchError("Employee search is unavailable. Please try again.");
          setEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query, selectedEmployee]);

  function updateQuery(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setSelectedEmployee(null);
    setCheckInError(null);
    setCheckedIn(false);
  }

  async function confirmAttendance() {
    if (!selectedEmployee) {
      return;
    }

    setIsSubmitting(true);
    setCheckInError(null);

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedEmployee),
      });

      if (!response.ok) {
        throw new Error(`Attendance request failed with status ${response.status}`);
      }

      setCheckedIn(true);
    } catch (error) {
      console.error("Attendance confirmation failed:", error);
      setCheckInError("Attendance could not be recorded. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNextCheckIn() {
    setQuery("");
    setEmployees([]);
    setSelectedEmployee(null);
    setCheckedIn(false);
    setCheckInError(null);
    setSearchError(null);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eff3f1] px-4 py-10 text-[#11201d]">
      <section className="w-full max-w-[560px] rounded-[26px] border border-[#d7e1dd] bg-[#f8fbf9] p-6 shadow-[0_20px_60px_rgba(27,59,53,0.08)] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#168f89]">
          BON Training · Public check-in
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-[-0.05em] text-[#172523]">
          Training Check-In
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#536663]">
          Search for your name and confirm your attendance.
        </p>

        <label htmlFor="employee-search" className="mt-8 block text-sm font-semibold text-[#243531]">
          Employee name
        </label>
        <input
          id="employee-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={updateQuery}
          disabled={checkedIn}
          placeholder="Type your first or last name..."
          aria-autocomplete="list"
          aria-controls="employee-results"
          aria-expanded={employees.length > 0}
          className="mt-2 h-12 w-full rounded-[12px] border border-[#cbd8d4] bg-white px-4 text-base outline-none transition focus:border-[#168f89] focus:ring-2 focus:ring-[#168f89]/20 disabled:bg-[#eff3f1]"
        />

        {!selectedEmployee && query.trim().length >= 2 && (
          <div
            id="employee-results"
            role="listbox"
            aria-label="Employee search results"
            className="mt-2 overflow-hidden rounded-[12px] border border-[#d7e1dd] bg-white"
          >
            {isSearching && (
              <p role="status" className="px-4 py-3 text-sm text-[#536663]">
                Searching employees…
              </p>
            )}
            {searchError && (
              <p role="alert" className="px-4 py-3 text-sm text-[#a94856]">
                {searchError}
              </p>
            )}
            {!isSearching && !searchError && employees.length === 0 && (
              <p className="px-4 py-3 text-sm text-[#536663]">No employees found.</p>
            )}
            {employees.map((employee) => (
              <button
                key={employee.email}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setSelectedEmployee(employee);
                  setQuery(employee.name);
                  setEmployees([]);
                  setCheckInError(null);
                }}
                className="block w-full px-4 py-3 text-left transition hover:bg-[#eaf5f1] focus:bg-[#eaf5f1] focus:outline-none"
              >
                <span className="block font-semibold text-[#172523]">{employee.name}</span>
                <span className="mt-0.5 block text-sm text-[#71807c]">{employee.email}</span>
              </button>
            ))}
          </div>
        )}

        {selectedEmployee && !checkedIn && (
          <div className="mt-5 rounded-[14px] border border-[#cbd8d4] bg-white p-4">
            <p className="font-semibold text-[#172523]">
              Check in as {selectedEmployee.name}?
            </p>
            <p className="mt-1 text-sm text-[#71807c]">{selectedEmployee.email}</p>
            <button
              type="button"
              onClick={confirmAttendance}
              disabled={isSubmitting}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#168f89] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#117c77] disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "Recording attendance…" : "Check in"}
            </button>
          </div>
        )}

        {checkInError && (
          <p role="alert" className="mt-4 text-sm text-[#a94856]">
            {checkInError}
          </p>
        )}

        {checkedIn && selectedEmployee && (
          <div role="status" className="mt-5 rounded-[14px] border border-[#b8d9cb] bg-[#eaf5f1] p-4">
            <p className="font-semibold text-[#277657]">
              Check-in Confirmed! Welcome, {selectedEmployee.name}
            </p>
            <button
              type="button"
              onClick={startNextCheckIn}
              className="mt-4 text-sm font-semibold text-[#147e78] underline underline-offset-4"
            >
              Check in another employee
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
