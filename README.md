# 14dash

## Cloudflare Workers deployment

This app uses the OpenNext Cloudflare adapter. Configure the Cloudflare Workers
build settings to use:

- Build command: `npm run cloudflare:build`
- Deploy command: `npx wrangler deploy`

The build command creates the Worker entry point and static assets in
`.open-next/`; the deploy command publishes that output using the project's
locally installed Wrangler. For a local production-runtime preview, run
`npm run preview`. To build and deploy from a terminal, run `npm run deploy`.
