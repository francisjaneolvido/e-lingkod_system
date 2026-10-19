# E-Lingkod Bayan — Hackathon prototype

**Stack:** Next.js 16 + React + TypeScript + Tailwind CSS + shadcn/ui (Base UI preset). This version is a frontend-only proof of concept.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (homepage), /login, and /register.

## Organized architecture

- `src/app/` — Next.js App Router routes and metadata
- `src/app/(auth)/` — Auth route group (`/login`, `/register`)
- `src/features/landing/` — Home sections, data, and composition
- `src/features/auth/components/` — Auth form and layout components
- `src/components/layout/` — Shared header and footer
- `src/components/shared/` — Brand logo and reusable visual elements
- `src/components/ui/` — shadcn/ui components
- `src/lib/` — Shared configuration
- `public/images/elb-mark.svg` — Generated eLB vector mark

## Notes

- **No active login or registration yet**; forms show an explicit demo-only notice when submitted.
- No MySQL, Prisma, or real service submissions in this version.
- The footer has a static 2026 date so Next.js prerendering does not reject `new Date()` with `cacheComponents: true`.
- Replace that year manually in future versions or implement a stable client-side year display when necessary.
- Responsive layout targets desktops, laptops, tablets and mobile browsers.
- Prototype not affiliated with an official local government unit.
