# WAP

A Next.js application with magic-link authentication and a developer-account
debug tool.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_DEBUG_MODE` | `false` | Set to `true` to show the **Create Developer Account** button on the login page. Must **not** be `true` in production. |

## Features

### Magic-link login
Enter your email address and click **Send magic link** to receive a one-time
sign-in link.

### Developer account (debug / test only)
When `NEXT_PUBLIC_DEBUG_MODE=true` (or `NODE_ENV` is `development` / `test`), a
**Create Developer Account** button appears below the magic-link form.

Clicking it calls `POST /api/auth/developer`, which creates an ephemeral
in-memory account with:

- A unique UUID
- `isDeveloper: true` flag
- Limited permissions: `read:own_profile`, `write:own_profile`,
  `read:debug_info`
- No email address required

> ⚠️ Developer accounts are stored in memory only and are lost when the
> process restarts. They are intended for local debugging and automated tests.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |
