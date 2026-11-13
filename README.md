# 14dash

## Deploying on Vercel

Import the repository into Vercel and use the detected Next.js settings. The
build command is `npm run build`.

## Google sign-in

Create a Google OAuth client ID for a Web application in Google Cloud Console.
Add these authorized redirect URIs to the client:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://<your-vercel-domain>/api/auth/callback/google`

Copy `.env.example` to `.env.local` for local development and fill in the
Google credentials and a generated `NEXTAUTH_SECRET` (for example,
`openssl rand -base64 32`). In Vercel, add `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `ADMIN_EMAILS` as
environment variables. Set `NEXTAUTH_URL` to the canonical production URL,
such as `https://<your-vercel-domain>`.

Sign-in is limited to Google accounts with an `@bonadmin.com` email address.
To grant admin access, set `ADMIN_EMAILS` to a comma-separated list of exact
Google account email addresses (for example,
`admin1@bonadmin.com,admin2@bonadmin.com`) in `.env.local` and in Vercel. The
site only serves the admin interface to accounts on this allowlist. Other
visitors can sign in with their BON Google account and reach the training
portal. Approved administrators see an **Admin view** option in the portal to
open `/admin`; the admin header's **Personal view** option returns to `/`.

The admin Overview and Trainings sections load scheduled sessions from the
configured Google Sheets. Creating a training writes it to the BON Training
Progress Tracker and, for TTT sessions, to the TTT master schedule. People & TIP
loads CSG course records from its tracker and HCA course records from the `HCA`
tab in the configured attendance spreadsheet. Admins can update course
completion dates and assign HCA courses. TTT
attendance can be updated from a training row, including additional attendees,
and those attendance changes update the matching BON weekly TTT tally.
Reporting combines check-ins with recorded TTT attendance. Other People & TIP
data, such as training goals and some profile details, remains local to the
admin browser.

## Employee check-in

The public `/check-in` page searches the Google Workspace domain directory and
records confirmed attendance in a Google Sheet. Create or choose a spreadsheet
and add a tab named `Attendance` (or set `GOOGLE_SHEETS_ATTENDANCE_SHEET` to a
different tab name). The sheet should have columns for timestamp, training,
employee name, email, and training category. New check-ins write the category
to column E, leaving the existing timestamp, training, name, and email columns
unchanged. Check-in categories are Hubbard College of Administration, Center
for Self Governance, Train the Trainer, Learning Forum, and Online Training
Academy.

Set `GOOGLE_REFRESH_TOKEN` and `GOOGLE_SHEETS_SPREADSHEET_ID` in `.env.local`
and in Vercel. Generate the refresh token for the same OAuth client as
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, granting the Google Workspace
directory read-only scope
(`https://www.googleapis.com/auth/directory.readonly`). This OAuth account is
used for employee directory search.

### Admin Google Sheets integration

Enable the Google Sheets API, create a service account, and share each
spreadsheet below with its service-account email as an Editor. Store the
service account JSON key as `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local` and
as a server-side Vercel environment variable; do not commit the key or expose it
to client code. Configure the IDs for the training progress, TTT, and CSG
trackers using the corresponding `GOOGLE_SHEETS_*_ID` variables in
`.env.example`. The `GOOGLE_SHEETS_SPREADSHEET_ID` spreadsheet is used for
attendance check-ins and its `HCA` tab stores the HCA course tracker. Share it
with the service account as an Editor as well.

Each configured file ID must refer to a native Google Sheets document. If a
tracker is an Excel/Office workbook opened in Google Sheets, use **File > Save
as Google Sheets**, update the matching `GOOGLE_SHEETS_*_ID` setting to the new
document ID, and share that new document with the service account as an Editor.
The Sheets API cannot read or edit an Office workbook directly.

The admin training API reads the BON `Training Schedule` tab and the TTT
system's `Schedule` tab. It does not depend on the unused `Upcoming TTT` tab or
the BON `TTT` and `LF` weekly tally tabs. The BON `Training Schedule`
matrix is parsed from its year/category sections, including CSG date ranges and
Learning Forum trainer labels. A structured `Admin Training Schedule` tab is
created in the BON tracker for new dashboard records, preserving titles,
types, exact dates, end dates, trainers, and hidden session UUIDs without
requiring changes to the formatted matrix. Dashboard writes also update the
existing matrix when its matching year/category section is available. The
formatted TTT `Schedule` tab is read and updated in its side-by-side 2025/2026
date-and-title sections; hidden UUID columns keep dashboard writes idempotent
without changing the visible layout. TTT attendance updates continue to
recalculate the BON `TTT` weekly tally. Writes to multiple Google Sheets are not
transactional; if a fan-out write fails, the admin API reports which
destinations succeeded, and retrying the same form submission uses its stable
UUID to avoid duplicate rows.

The employee passport finds CSG and HCA records by normalized full name and
does not modify Sheets during lookup. CSG keeps its visible `M/YY` dates and
stores exact completion dates in hidden metadata; HCA completion dates and
employee emails are stored in hidden columns on the `HCA` tab when a course is
updated. CSG and HCA edits rebuild BON weekly totals from exact dates rather
than incrementing counters, so retries do not double-count. Training goals are
persisted by employee email in a `Training Goals` tab in the BON training
progress spreadsheet.

TTT attendance matching uses the session title/date and roster name; it
updates the weekly TTT count from checked attendance rows. When a TTT training
is started, the admin API clones the latest complete session block in the
matching 2025 or 2026 attendance tab, resets checkboxes and walk-in names, and
tags the new block with the request UUID. This requires at least one complete
session block in that year's tab to use as a template. Writes to multiple
Google Sheets are not transactional, so if any destination fails, the admin
API reports which destinations succeeded; retrying the same submission uses
its stable UUID to avoid duplicate training or attendance records.

The Reporting section reads attendance entries from the configured Google
Sheet, with date-filtered summaries and CSV export.

## Moodle courses

Set `MOODLE_URL` to the Moodle site URL and `MOODLE_TOKEN` to a Moodle web
service token in `.env.local` and in the Vercel environment. The courses API
currently uses sample courses while server networking is being resolved.
Replace the mock data in `lib/moodle.ts` and restore the Moodle lookup in
`app/api/moodle/courses/route.ts` to resume showing enrolled courses.

## Sellability courses API

Set `SELLABILITY_API_KEY` in `.env.local` and in the Vercel environment. The
server-side `GET /api/courses?email=<email>` endpoint uses this key to load
Sellability courses for the signed-in user. Only administrators listed in
`ADMIN_EMAILS` can request courses for another email address. Account-specific
responses are private and not cached; the course catalog is revalidated daily,
and enrollment/student detail data is cached server-side.

Administrators can view all Sellability enrollments from the **Sellability
Courses** tab in `/admin`. The `GET /api/admin/enrollments` endpoint resolves
enrollment student and course IDs and returns pages of 100 using Sellability's
`offset` parameter. Enrollment data is revalidated every 60 seconds; course
details are cached daily and student details hourly. The admin view supports
page navigation, on-page student search, course and status filters, and CSV
export of the filtered results, including enrollment dates and course IDs.
Rows are sorted newest-first by enrollment date, with undated enrollments last.
Enrollment and completion date ranges, like search and other filters, apply to
the currently loaded 100-record page. Course links open the Sellability
management page and require appropriate Sellability access. Summary metrics
are for the current page because the Sellability total-count response is not
available.

The **People & TIP** passport looks up the selected sample roster name as an
exact match in the Google Workspace directory, then loads that employee's
active Sellability enrollments from the latest 100 enrollment records into the
Online Training Academy category. Sellability does not document a student-email
filter for enrollments, so older enrollments may not appear in this profile
view. The admin table's student search is limited to the currently loaded page.
