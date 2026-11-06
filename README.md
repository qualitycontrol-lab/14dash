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

Most admin sections currently use clearly labeled preview data. Trainings
added from the form are temporary and are not persisted. The Reporting section
loads actual attendance entries from the configured Google Sheet, with
date-filtered summaries and CSV export.

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
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, granting both the Google
Workspace directory read-only scope
(`https://www.googleapis.com/auth/directory.readonly`) and the Sheets scope
(`https://www.googleapis.com/auth/spreadsheets`). The OAuth account needs
permission to search the domain directory and edit the selected spreadsheet.
Keep the refresh token and spreadsheet ID server-side; never expose them in
client code.

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
Course links open the Sellability management page and require appropriate
Sellability access. Summary metrics are for the current page because the
Sellability total-count response is not available.

The **People & TIP** passport looks up the selected sample roster name as an
exact match in the Google Workspace directory, then loads that employee's
active Sellability enrollments from the latest 100 enrollment records into the
Online Training Academy category. Sellability does not document a student-email
filter for enrollments, so older enrollments may not appear in this profile
view. The admin table's student search is limited to the currently loaded page.
