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
`/admin` page checks this allowlist on the server. Admin accounts can choose
**Admin view** from the sign-in page or their training portal header.

The admin screens currently use clearly labeled preview data. Trainings added
from the form are temporary and are not persisted.

## Employee check-in

The public `/check-in` page searches the Google Workspace domain directory and
records confirmed attendance in a Google Sheet. Create or choose a spreadsheet
and add a tab named `Attendance` (or set `GOOGLE_SHEETS_ATTENDANCE_SHEET` to a
different tab name). The sheet should have columns for timestamp, training,
employee name, and email.

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
service token in `.env.local` and in the Vercel environment. The dashboard and
authenticated courses API currently use sample courses while server networking
is being resolved. Replace the mock data in `lib/moodle.ts` and restore the
Moodle lookup in `app/page.tsx` and `app/api/moodle/courses/route.ts` to resume
showing enrolled courses.
