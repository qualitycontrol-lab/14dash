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
`GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` as environment
variables. Set `NEXTAUTH_URL` to the canonical production URL, such as
`https://<your-vercel-domain>`.

Sign-in is limited to Google accounts with an `@bonadmin.com` email address.

## Moodle courses

Set `MOODLE_URL` to the Moodle site URL and `MOODLE_TOKEN` to a Moodle web
service token in `.env.local` and in the Vercel environment. The dashboard and
authenticated courses API currently use sample courses while server networking
is being resolved. Replace the mock data in `lib/moodle.ts` and restore the
Moodle lookup in `app/page.tsx` and `app/api/moodle/courses/route.ts` to resume
showing enrolled courses.
