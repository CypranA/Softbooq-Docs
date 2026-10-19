# Softbooq Docs

The help centre for [Softbooq](https://softbooq.com), live at [docs.softbooq.com](https://docs.softbooq.com).

## Where to edit

Edit the docs in the Softbooq monorepo, in `apps/docs`. After a release reaches `main`,
`.github/workflows/docs-mirror.yml` copies this folder to the `CypranA/Softbooq-Docs` repository,
which is what Mintlify deploys. If anything is committed directly in Softbooq-Docs, the next mirror
stops and names it rather than overwriting it, so make the change here.

## What's in here

```
introduction.mdx, quickstart.mdx
erp/           One page per module, plus Settings and Softbooq on your phone
portals/       The public site: landing page, shop, careers page, customer account
integrations/  The tools Softbooq connects to
platform/      Accounts, the Admin Portal, support access, Softbooq AI
billing/       Plans and AI credits
files/         Softbooq Files
images/        Screenshots
mint.json      Mintlify site config and navigation
scripts/       check-docs.mjs
```

## Every page says what the app says

`node scripts/check-docs.mjs` checks that every image a page uses exists, and that every path
written in bold with arrows, such as **Settings → Banking → Bank Feeds**, is made of labels the app
actually shows in English. The gate runs it on every push, as part of
`apps/marketing/scripts/check-landing-claims.mjs`. A path through another product's screens is
skipped when it starts with that product's name: **Wise → Settings → Developer tools**.

Write as `docs/VOICE.md` says: plain, warm, no em dashes, buttons named as they appear.

## Running locally

```bash
npx mintlify dev
```

Opens at `http://localhost:3000`.

## License

MIT
