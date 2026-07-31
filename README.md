# Nirapod Path (Safe Path) — Community Safety & Hazard Reporting Platform

> A web platform empowering citizens of Dhaka to report crime hotspots and infrastructure hazards in real time, route them to the right authority, and track resolution — built under Problem Statement 2: Community-Driven Public Safety Platform.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Core Features](#core-features)
4. [Demo Accounts](#demo-accounts)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Report Status Lifecycle](#report-status-lifecycle)
7. [SOS Alert Lifecycle](#sos-alert-lifecycle)
8. [Map Features](#map-features)
9. [Safer Route](#safer-route)
10. [Danger Zone Alerts](#danger-zone-alerts)
11. [Bangla Translation](#bangla-translation)
12. [Tech Stack](#tech-stack)
13. [System Architecture](#system-architecture)
14. [Data Flow](#data-flow)
15. [Database Schema](#database-schema)
16. [Realtime Strategy](#realtime-strategy)
17. [Project Structure](#project-structure)
18. [Environment Variables](#environment-variables)
19. [Getting Started](#getting-started)
20. [Known Limitations](#known-limitations)

---

## Problem Statement

Citizens across Bangladesh face preventable safety risks daily — robberies, snatching, uncovered manholes, and damaged roads — with no single platform to report these hazards in real time or warn others before they become victims. Reports posted informally on social media rarely reach the responsible authority, leaving dangerous locations unaddressed for long periods.

**The challenge:** design and build a web application that empowers citizens to report crime and infrastructure hazards in real time, helps others avoid danger before it finds them, and gives authorities a structured channel to act on verified reports.

## Solution Overview

Nirapod Path is a three-panel web platform connecting citizens, city management teams, and city corporations in a single accountability chain:

- **Citizens** report crime hotspots and infrastructure hazards on an interactive map, with photo evidence and a location constrained to the responsible authority's area.
- **Management panels** (one per City Corporation) work the report queue and resolve reports.
- **City Corporation panels** hold final authority — any status in any direction, remarks, and the **verified** stamp.

Every report is scoped to the City Corporation the citizen selects, so only the relevant authority sees and acts on it.

## Core Features

| #   | Feature                          | Description                                                                                                                             |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Public live map**              | Reported hazards and hotspots on OpenStreetMap, readable **without an account**, on both the home page and the citizen panel.            |
| 2   | **Custom status markers**        | Pin shape carries the report type, colour carries the status. Settled reports recede rather than vanishing.                              |
| 3   | **Auto-framing map**             | The map zooms to fit every marker on load — no manual zooming. Clicking a status in the legend re-frames onto just those markers.        |
| 4   | **Instant hazard reporting**     | Required photo (EdgeStore) + location + description, routed to a chosen City Corporation.                                                |
| 5   | **Constrained location picker**  | GPS fix, tap-the-map, or place search — all validated against the chosen City Corporation's area, shown as a circle on an inline map.    |
| 6   | **Place search**                 | Any location in Bangladesh via OpenStreetMap Nominatim, for reporting something seen earlier or somewhere unsafe to stop.                |
| 7   | **Authority routing**            | Reports appear directly on that authority's dashboard — no manual forwarding.                                                           |
| 8   | **Status tracking**              | Full lifecycle, visible to the reporter, with a City Corporation remark when one is written.                                             |
| 9   | **Community verification**       | Any signed-in citizen can confirm any report, from the list **or straight from the map popup**. One vote per person, enforced by the DB. |
| 10  | **Emergency SOS**                | One tap → live GPS → written to the database, then broadcast to the authority dashboards.                                                |
| 11  | **SOS pending / resolved**       | Both authority roles can mark an alert handled, or reopen it. Pending alerts are red, resolved ones quiet.                               |
| 12  | **Danger zone alerts**           | Client-side geolocation warns before you walk into a reported hotspot — on the home page as well as the panel.                           |
| 13  | **Safer route**                  | Source → destination routing that steers around reported danger zones, drawn on the map.                                                 |
| 14  | **Bangla translation**           | First-visit offer to translate the interface to Bangla.                                                                                  |
| 15  | **Three-panel accountability**   | User → Management → City Corporation, each with scoped powers enforced server-side.                                                     |

## Demo Accounts

Citizen accounts are self-registered at `/register`. Authority accounts are seeded — sign in at `/login` and you land on your own panel automatically.

### Management panel

| City Corporation | Email                                | Password          |
| ---------------- | ------------------------------------ | ----------------- |
| Dhaka North      | `management-dhaka-north@example.com` | `Management#2026` |
| Dhaka South      | `management-dhaka-south@example.com` | `Management#2026` |

### City Corporation panel

| City Corporation | Email                              | Password        |
| ---------------- | ---------------------------------- | --------------- |
| Dhaka North      | `citycorp-dhaka-north@example.com` | `CityCorp#2026` |
| Dhaka South      | `citycorp-dhaka-south@example.com` | `CityCorp#2026` |

> Passwords come from `SEED_MANAGEMENT_PASSWORD` / `SEED_CITYCORP_PASSWORD` in `.env`. **Keep the quotes** around them — they contain `#`, which dotenv treats as a comment marker and would silently truncate. Change them there and re-run `npm run db:seed`; the seed updates existing accounts rather than skipping them.

## User Roles & Permissions

| Action                                     | User | Management  | City Corporation |
| ------------------------------------------ | :--: | :---------: | :--------------: |
| Register / log in                          |  ✅  | ✅ (seeded) |   ✅ (seeded)    |
| View the public map                        |  ✅  |     ✅      |        ✅        |
| Create a report (select City Corp)         |  ✅  |     ❌      |        ❌        |
| View own submitted reports                 |  ✅  |      —      |        —         |
| View reports for their City Corp           |  ❌  |     ✅      |        ✅        |
| Set status: `under_review → resolved`      |  ❌  |     ✅      |        ✅        |
| Set status to **any** value, any direction |  ❌  |     ❌      |        ✅        |
| Add / edit status remark                   |  ❌  |     ❌      |        ✅        |
| Upvote / confirm a report                  |  ✅  |      —      |        —         |
| Trigger SOS                                |  ✅  |      —      |        —         |
| Receive SOS alerts                         |  ❌  |     ✅      |        ✅        |
| Set SOS `pending ⇄ resolved`               |  ❌  |     ✅      |        ✅        |

**Key rule:** Management can only push a report forward, `under_review → resolved`. It cannot verify a report or move it backward. City Corporation has unrestricted control and is the only role that can mark a report `verified` or leave a remark.

All of this lives in **one place** — `src/lib/permissions.js` — and every Server Action calls into it. Hiding a control in the UI is presentation, never the security boundary; the server re-checks regardless of what was rendered.

Route access is enforced by `requireRole` in `src/lib/session.js`, which checks the role **and** that the session's City Corporation matches the `[cityCorpId]` in the URL — a Dhaka North account cannot reach Dhaka South's data by editing the address bar.

## Report Status Lifecycle

```
             ┌──────────────┐
   created → │ under_review │ ←───────────────┐
             └──────┬───────┘                 │
                    │ Management or           │ City Corp
                    │ City Corp               │ can revert
                    ▼                         │ any status
             ┌──────────────┐                 │ back here
             │   resolved   │ ────────────────┘
             └──────┬───────┘
                    │ City Corp only
                    ▼
             ┌──────────────┐
             │   verified   │
             └──────────────┘
```

- New reports are created as **`under_review`**.
- **Management** may only perform `under_review → resolved`.
- **City Corporation** may set any status from any status, including sending work back.
- The optional **status remark** is City Corporation only, and is overwritten on each update — no history log, kept deliberately simple.

Each status has a fixed colour **and** a fixed icon — clock, checkmark, shield — so status survives being skimmed or seen by someone who can't separate the hues. The shield marks City Corporation verification and appears nowhere else in the app.

## SOS Alert Lifecycle

```
created → pending ⇄ resolved
```

Deliberately looser than the report lifecycle: **either** authority role can move an alert in either direction. Whoever reaches the emergency first should be able to mark it handled, and there is no `verified` equivalent to protect. `pending` renders in danger red — an unanswered SOS is an active emergency — while `resolved` reuses the same blue as a resolved report.

## Map Features

- **Marker encoding** — shape = type (warning triangle for hazards, target ring for crime hotspots), colour = status. Assets live in `public/markers/`.
- **Auto-fit** — frames every marker on load; a single report centres at street level rather than over-zooming.
- **Interactive legend** — click a status to re-frame the map onto those markers and lift them; "Show all" resets. It *focuses* rather than filters, so nothing is hidden from view.
- **Popup detail** — photo, description, authority, coordinates, confirmation count, and a confirm button (or a sign-in link when signed out).
- **Danger zones** — drawn as dashed red circles, derived from unresolved crime hotspots.

## Safer Route

Signed-in users get a **Safe route** button on the home page and the citizen panel. It opens a dialog for a source and destination (searchable, with "use my current location" for the start) and draws the result on the map.

**How the avoidance works, and its honest limits:** OSRM has no concept of an area to avoid. So `/api/safe-route` asks for the direct route, tests it against the danger zones derived from live hotspot reports, and — if it passes through one — re-requests via a waypoint pushed clear of that zone, repeating for up to three zones.

This is a **detour heuristic, not true obstacle-aware routing.** The response carries `avoided`, and the map reflects it:

- **Solid green line** — the route clears every reported danger zone.
- **Dashed amber line + explicit warning** — no clear route was found; this one still passes a reported zone.

A compromised route is never drawn as a safe one.

## Danger Zone Alerts

Entirely client-side — no server round trip and no realtime channel:

1. `navigator.geolocation.watchPosition()` tracks position after consent.
2. Hotspot coordinates come from the already-fetched `/api/reports` feed.
3. A Haversine distance check runs against each derived zone on every update.
4. Entering a zone raises a banner. It fires once per entry, not on every position update.

Dismissal is component state only, so **a reload brings the warning back** — the danger hasn't gone away because someone closed a banner. Signed-out visitors get the warning plus a "Log in to learn more" action, without the incident detail.

## Bangla Translation

A dismissible bar on first visit offers to translate the interface to Bangla.

**Why it's built rather than left to the browser:** Chrome and Edge only offer their native "Translate this page?" bar when the page language differs from the *user's own* browser language, and a site cannot trigger it. These pages are `lang="en"`, so a Bangla speaker whose browser is set to English is never offered anything — exactly the person who most needs it on a safety tool.

Translation uses Google's free website translate element (no key, no billing). **The third-party script only loads once someone accepts** — ignore the bar and nothing is sent to Google. Once translated, a strip marks the page as machine translated and offers a way back to English; a mistranslated hazard description is not a harmless error, so the app says what it is.

## Tech Stack

| Layer              | Choice                                          | Reasoning                                                                    |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Framework          | **Next.js 16 (App Router + Server Actions)**    | One codebase for frontend and backend                                        |
| Language           | **JavaScript only**                             | No TypeScript anywhere, by project rule                                      |
| Styling            | **Tailwind CSS v4** (CSS-first `@theme` tokens) | Locked palette, type scale and radii; no ad-hoc hex in components            |
| Map                | **Leaflet + OpenStreetMap**                     | Free, no API key                                                             |
| Geocoding          | **Nominatim** (proxied)                         | Free, no API key                                                             |
| Routing            | **OSRM public demo server**                     | Free, no API key                                                             |
| Database           | **Neon Postgres**                               | Serverless, generous free tier                                               |
| ORM                | **Drizzle**                                     | Lightweight, fast to iterate                                                 |
| File storage       | **EdgeStore**                                   | Purpose-built for Next.js                                                    |
| Forms              | **React Hook Form + Zod**                       | One schema validates on the client and re-validates in the Server Action     |
| Auth               | **Hand-rolled — signed httpOnly cookie (jose)** | No third-party auth library; bcrypt password hashing                         |
| Realtime (SOS)     | **Pusher (free tier)**                          | Vercel serverless can't hold long-lived connections, ruling out self-hosted SSE/WebSocket |
| Notifications      | **react-hot-toast**                             | Every action reports success and failure in plain language                   |
| Hosting            | **Vercel**                                      | Native Next.js support                                                       |

**No paid APIs anywhere.** Every service used has a free tier sufficient for the demo.

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel)                      │
│                                                               │
│   ┌───────────┐   ┌──────────────┐   ┌──────────────────┐   │
│   │  Public + │   │  Management   │   │ City Corporation  │   │
│   │  User     │   │  Panel        │   │ Panel             │   │
│   └─────┬─────┘   └──────┬───────┘   └────────┬─────────┘   │
│         └────────────────┼─────────────────────┘             │
│                          │                                    │
│     Server Actions (writes)   │   Route Handlers + Axios (reads)
│   auth · reports · status ·   │   /api/reports · /api/sos ·   │
│   votes · sos                 │   /api/geocode · /api/safe-route
│                          │                                    │
│        ┌─────────────────┼─────────────────┐                 │
│        ▼                 ▼                 ▼                 │
│  ┌───────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │  Neon DB  │   │  EdgeStore    │   │ Pusher (SOS) │        │
│  │ (Drizzle) │   │ (photos)      │   │              │        │
│  └───────────┘   └──────────────┘   └──────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

**Write/read split:** mutations always go through Server Actions, which return a consistent `{ success, error, data }` shape so callers can toast correctly either way. Filtered and paginated reads go through Route Handlers via one shared Axios instance. The two are never mixed.

## Data Flow

**Report submission:**

```
Citizen picks type, City Corporation, description
  → photo uploads to EdgeStore on selection, URL stored in the form
  → location chosen by GPS / map tap / search, validated against the
    City Corporation's area
  → createReport re-validates with the same Zod schema, re-checks the
    location server-side, inserts with status 'under_review'
  → appears on the public map and the authority's queue
```

**Status update:**

```
Authority changes status
  → updateReportStatus checks role + jurisdiction via permissions.js
  → remark written only when the role is city_corp
  → queue refetches; the reporter sees it on their next load
```

**SOS:**

```
Citizen taps SOS → confirms → live GPS captured
  → triggerSOS writes the sos_alerts row FIRST
  → only then broadcasts on city-corp-{id}-alerts
  → both authority dashboards render it instantly as 'pending'
```

The ordering is deliberate: a dashboard must never show an alert that wasn't persisted. A Pusher failure doesn't fail the action — the row exists and both dashboards pick it up on next load.

## Database Schema

```
city_corporations
├── id, name (unique), created_at

users
├── id
├── role                    -- 'user' | 'management' | 'city_corp'
├── city_corporation_id     -- null for citizens, required for staff
├── name, email (unique), password_hash, created_at

reports
├── id, user_id, city_corporation_id
├── type                    -- 'hazard' | 'crime_hotspot'
├── status                  -- 'under_review' | 'resolved' | 'verified'
├── status_comment          -- nullable, City Corp only
├── photo_url               -- NOT NULL
├── lat, lng, description
└── created_at, updated_at

report_votes
├── id, report_id, user_id, created_at
└── UNIQUE (report_id, user_id)   -- DB-level, survives a double-submit race

sos_alerts
├── id, user_id, city_corporation_id
├── status                  -- 'pending' | 'resolved' (default pending)
├── lat, lng
└── created_at, updated_at
```

Indexes on `reports.city_corporation_id`, `reports.user_id`, `reports.status`, `sos_alerts.city_corporation_id`, `sos_alerts.status`, plus unique indexes on `users.email` and `report_votes(report_id, user_id)`.

## Realtime Strategy

Only **one** feature genuinely needs server-pushed realtime:

| Feature                      | Mechanism                                | Why                                                          |
| ---------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| SOS → authority dashboards   | **Pusher**, channel `city-corp-{id}-alerts` | True server → client push; Vercel rules out self-hosted SSE/WS |
| Danger zone proximity        | Client `watchPosition()` + Haversine     | Pure math on already-fetched data                            |
| Status updates on own report | Refetch on load                          | Not time-critical for the reporter                           |
| New reports on the map       | Refetch / manual refresh                 | Acceptable to lag by seconds                                  |

One channel per City Corporation, so one jurisdiction never sees another's alerts. Both authority panels subscribe to the same channel.

## Project Structure

```
/db
  schema.js                 -- Drizzle schema (plain JS, pgEnum)
  index.js                  -- Neon + Drizzle client
  seed.js                   -- idempotent seed (npm run db:seed)
/public/markers             -- status marker SVGs
/src
  /actions                  -- Server Actions (writes only)
    auth.js  reports.js  status.js  votes.js  sos.js
  /app
    page.js                 -- public home (live map + danger alerts)
    /(public)/login  /register
    /user/map  /user/reports  /user/report/new
    /management/[cityCorpId]/reports  /alerts
    /city-corp/[cityCorpId]/reports   /alerts
    /api/reports  /api/sos  /api/city-corporations
    /api/geocode  /api/safe-route  /api/edgestore/[...edgestore]
  /components
    /ui                     -- Button, Input, Select, Badge, Modal, Card…
    /reports                -- ReportCard, ReportList, ReportForm,
                               StatusBadge, StatusUpdateForm, LocationPicker
    /map                    -- MapView, LeafletMap, HotspotMarker,
                               LiveMapSection, SafeRouteDialog
    /layout                 -- PanelShell, PanelHeader, PanelNav, TranslateBar
    /safety                 -- SosButton, SosAlertFeed, DangerZoneWatcher
  /hooks                    -- useReports
  /lib                      -- session, permissions, axios, toast, geolocation,
                               routing, city-corp-regions, report-meta, pusher…
```

Components are shared across all three panels via a `role` prop — there is no panel-specific copy of any shared UI. The two authority queue pages differ only by the role string they pass down.

## Environment Variables

```dotenv
DATABASE_URL="..."                  # Neon Postgres connection string

EDGE_STORE_ACCESS_KEY="..."
EDGE_STORE_SECRET_KEY="..."

PUSHER_APP_ID="..."                 # server-side only
PUSHER_KEY="..."
PUSHER_SECRET="..."                 # NEVER prefix this NEXT_PUBLIC_

NEXT_PUBLIC_PUSHER_KEY="..."        # safe to expose
NEXT_PUBLIC_PUSHER_CLUSTER="ap2"

SESSION_SECRET="..."                # long random string, signs the auth cookie

SEED_MANAGEMENT_PASSWORD="..."
SEED_CITYCORP_PASSWORD="..."
```

> **Quote every value.** dotenv treats `#` as a comment marker, so an unquoted password containing `#` is silently truncated.
>
> **`PUSHER_SECRET` must never carry the `NEXT_PUBLIC_` prefix.** Anything so prefixed is bundled into client JavaScript and shipped to every visitor — anyone could then publish fake SOS events to the channels. `src/lib/pusher.js` is marked `server-only` so reintroducing that mistake becomes a build error.

`.env.example` lists every variable name with no values.

## Getting Started

```bash
npm install

npm run db:push     # push the Drizzle schema to Neon
npm run db:seed     # seed City Corporations + authority accounts (idempotent)

npm run dev         # http://localhost:3000
```

Then register a citizen at `/register`, or sign in with a [demo account](#demo-accounts).

## Known Limitations

Stated plainly so nothing here is mistaken for more than it is:

- **City Corporation areas are approximate circles**, not real ward boundaries — there's no polygon source for DNCC/DSCC. They reliably block a clearly wrong pin (a Chattogram location filed against Dhaka North) but the two circles **overlap in central Dhaka**, so somewhere like Farmgate validates against both.
- **Safer route is a detour heuristic**, not true obstacle-aware routing. When no clear path is found it says so rather than pretending.
- **Route timings are "by road".** OSRM's public demo only serves the driving profile, so these are not walking estimates.
- **Translation is machine translation** and is labelled as such.
- **SOS jurisdiction is chosen by the citizen** at trigger time, not derived from coordinates — guessing without jurisdiction polygons could route an emergency to the wrong desk.
- **Danger zones are derived from reports**, not curated: any unresolved crime hotspot becomes one, with nearby hotspots merged.
- **Pusher uses public channels.** Channel names are unguessable in practice, but upgrading to private channels means adding a `/api/pusher-auth` handler that validates the session's role and City Corporation.

---

The `contexts/` folder is the authoritative specification for architecture, schema, roles, UI rules and realtime design. Where this README and those files disagree, the context files win.
