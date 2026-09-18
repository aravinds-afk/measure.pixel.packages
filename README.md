# Measure Pixel — Modern CRM Platform

Measure Pixel is a full-stack CRM built with Next.js (App Router), TypeScript, Prisma/SQLite and Tailwind CSS. It includes real authentication, role-based access control, and every core CRM module — customers, leads, deals, employees, tasks, follow-ups, calendar, calls, emails, invoices, payments, documents, marketing, reports, activity log, settings, and a dedicated customer portal.

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Actions, Server Components)
- **Database:** SQLite via Prisma ORM (swap `DATABASE_URL` for Postgres/MySQL in production)
- **Auth:** Credentials + bcrypt password hashing + signed JWT session cookie (`jose`), enforced by `src/middleware.ts`
- **UI:** Tailwind CSS v4, Radix UI primitives, Recharts, a small in-house design system (`src/components/ui`)
- **Forms:** react-hook-form + zod validation

## Getting started

```bash
npm install
cp .env.example .env      # adjust JWT_SECRET for production
npx prisma db push        # create the SQLite schema
npm run db:seed           # populate realistic demo data
npm run dev
```

Visit `http://localhost:3000`.

## Demo accounts

All seeded accounts share the password **`Password123!`**:

| Role | Email |
| --- | --- |
| Super Admin | `superadmin@measurepixel.com` |
| Admin | `admin@measurepixel.com` |
| Manager | `manager@measurepixel.com` |
| Sales Executive | `sales1@measurepixel.com` … `sales4@measurepixel.com` |
| Employee | `employee1@measurepixel.com` … `employee4@measurepixel.com` |
| Customer (portal) | `customer@measurepixel.com` |

The login screen also has one-click quick-fill buttons for each role.

## Project structure

```
prisma/schema.prisma       Data model for every entity (users, customers, leads, deals, tasks, invoices, ...)
prisma/seed.ts             Realistic demo data generator
src/middleware.ts          Session verification + role-based route protection
src/lib/rbac.ts            Role → module access map
src/lib/data/              Server-side data-access helpers (role-scoped queries)
src/actions/               Server Actions (create/update/delete per module)
src/components/ui/         Shared design system (Button, Card, Table, Modal, Charts, ...)
src/components/app-shell/  Sidebar, topbar, global search, notifications, quick add
src/app/(auth)/            Login, forgot/reset password
src/app/(setup)/setup      First-time company onboarding
src/app/(app)/             The full CRM (staff-facing), one folder per module
src/app/(portal)/portal    Customer-facing portal
src/app/page.tsx           Public marketing/landing page
```

## Role-based access

Access is enforced in two layers:

1. `src/middleware.ts` — redirects unauthenticated users to `/login`, and routes `CUSTOMER` accounts exclusively to `/portal`.
2. Each page checks `getSession()` server-side and redirects if the role isn't permitted; list queries are additionally scoped (`src/lib/data/scope.ts`) so Sales Executives and Employees only see their own records, Managers see their team's, and Admins/Super Admins see everything.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build and start
- `npm run db:seed` — re-seed demo data (drops and recreates all rows)
- `npx prisma studio` — browse the database visually

## Notes on this demo build

- File uploads (Documents module, email attachments) store metadata only — there is no blob storage wired up.
- Password reset emails aren't sent; the reset link is shown directly in the UI.
- Roles & Permissions and Notification preference toggles in Settings are illustrative controls layered on top of the fixed `ROLE_MODULES` map in `src/lib/rbac.ts`.
