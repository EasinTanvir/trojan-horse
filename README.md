# Nirapod Path (Safe Path) — Community Safety & Hazard Reporting Platform

> A web platform empowering citizens of Dhaka to report crime hotspots and infrastructure hazards in real time, route them to the right authority, and track resolution — built for [Hackathon Name] under Problem Statement 2.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Core Features](#core-features)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Report Status Lifecycle](#report-status-lifecycle)
6. [Tech Stack](#tech-stack)
7. [System Architecture](#system-architecture)
8. [Data Flow](#data-flow)
9. [Database Schema](#database-schema)
10. [Realtime Strategy](#realtime-strategy)
11. [Danger Zone Alerts](#danger-zone-alerts)
12. [Project Structure](#project-structure)
13. [Environment Variables](#environment-variables)
14. [Getting Started](#getting-started)
15. [Deliverables Checklist](#deliverables-checklist)

---

## Problem Statement

Citizens across Bangladesh face preventable safety risks daily — robberies, snatching, uncovered manholes, and damaged roads — with no single platform to report these hazards in real time or warn others before they become victims. Reports posted informally on social media rarely reach the responsible authority, leaving dangerous locations unaddressed for long periods.

**The challenge:** design and build a web application that empowers citizens to report crime and infrastructure hazards in real time, helps others avoid danger before it finds them, and gives authorities a structured channel to act on verified reports.

## Solution Overview

Nirapod Path is a three-panel web platform connecting citizens, city management teams, and city corporations in a single accountability chain:

- **Citizens** report crime hotspots and infrastructure hazards on an interactive map, with photo evidence and GPS location.
- **Management panels** (one per City Corporation) review and resolve reports.
- **City Corporation panels** hold final authority — they can move a report to any status, add remarks, and issue the final **verified** stamp, giving the public a trustworthy, government-backed confirmation.

Every report is scoped to the City Corporation the citizen selects, so only the relevant authority sees and acts on it — mirroring how real municipal accountability works.

## Core Features

| #   | Feature                               | Description                                                                                                                        |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Interactive hotspot map**           | Citizens mark robbery/snatching-prone locations on an OpenStreetMap-based map.                                                     |
| 2   | **Danger zone alerts**                | Live geolocation tracking warns users client-side when they approach a reported hotspot.                                           |
| 3   | **Instant hazard reporting**          | Photo upload + auto-captured GPS + description, pinned to the map.                                                                 |
| 4   | **Authority routing**                 | Reports are scoped to a selected City Corporation and appear directly on that authority's dashboard — no manual forwarding needed. |
| 5   | **Status tracking**                   | Every report moves through a clear lifecycle, visible to the reporter at all times.                                                |
| 6   | **Community verification**            | Other users can upvote/confirm existing reports to keep information current and trustworthy.                                       |
| 7   | **Emergency SOS**                     | One-tap button shares live GPS location and instantly alerts the relevant authority dashboard.                                     |
| 8   | **Three-panel accountability system** | User → Management → City Corporation, each with clearly scoped powers.                                                             |

## User Roles & Permissions

| Action                                     | User | Management  | City Corporation |
| ------------------------------------------ | :--: | :---------: | :--------------: |
| Register / log in                          |  ✅  | ✅ (seeded) |   ✅ (seeded)    |
| Create a report (select City Corp)         |  ✅  |     ❌      |        ❌        |
| View own submitted reports                 |  ✅  |      —      |        —         |
| View reports for their City Corp           |  ❌  |     ✅      |        ✅        |
| Set status: `under_review → resolved`      |  ❌  |     ✅      |        ✅        |
| Set status to **any** value, any direction |  ❌  |     ❌      |        ✅        |
| Add / edit status remark                   |  ❌  |     ❌      |        ✅        |
| Upvote / confirm a report                  |  ✅  |      —      |        —         |
| Trigger SOS                                |  ✅  |      —      |        —         |
| Receive SOS alerts                         |  ❌  |     ❌      |        ✅        |

**Key rule:** Management can only push a report forward, from `under_review` to `resolved`. It cannot verify a report or move it backward. City Corporation has unrestricted control over status in both directions and is the only role that can mark a report `verified` or leave a remark.

Management and City Corporation accounts are **seeded in bulk via script**, scoped one Management account per City Corporation — not self-registered.

## Report Status Lifecycle

```
             ┌──────────────┐
   created → │ under_review │ ←───────────────┐
             └──────┬───────┘                 │
                     │ Management or           │ City Corp
                     │ City Corp                │ can revert
                     ▼                          │ any status
             ┌──────────────┐                  │ back here
             │   resolved   │ ─────────────────┘
             └──────┬───────┘
                     │ City Corp only
                     ▼
             ┌──────────────┐
             │   verified   │
             └──────────────┘
```

- New reports are created with status **`under_review`** by default.
- **Management** may only perform `under_review → resolved`.
- **City Corporation** may set the status to any of the three values, from any current value — including sending a `resolved` or `verified` report back to `under_review` (e.g. "poor work, redo") for Management to act on again.
- An optional **status remark** (e.g. _"Good work"_ / _"Poor work, do it again"_) can be attached only by City Corporation, and is overwritten on each update — no history log, kept intentionally simple for the hackathon scope.

## Tech Stack

| Layer              | Choice                                            | Reasoning                                                                                                                                                                  |
| ------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | **Next.js (latest, App Router + Server Actions)** | Single codebase for frontend + backend, fast to build and deploy                                                                                                           |
| Map                | **Leaflet.js + OpenStreetMap**                    | Free, no API key, no billing risk                                                                                                                                          |
| Database           | **Neon (Postgres)**                               | Serverless Postgres, generous free tier                                                                                                                                    |
| ORM                | **Drizzle ORM**                                   | Lightweight, type-safe, fast to iterate under time pressure                                                                                                                |
| File storage       | **EdgeStore**                                     | Purpose-built for Next.js, simple SDK, free tier                                                                                                                           |
| Authentication     | **Custom — Server Actions + httpOnly cookies**    | No third-party auth dependency; passwords hashed (bcrypt/argon2)                                                                                                           |
| Realtime (SOS)     | **Pusher (free tier)**                            | Vercel serverless can't hold long-lived connections (rules out SSE/WebSocket on this deployment target); Pusher offloads the persistent connection to their infrastructure |
| Danger zone alerts | **Browser Geolocation API (client-side only)**    | No server/infra needed — pure client-side distance calculation                                                                                                             |
| Hosting            | **Vercel**                                        | Native Next.js support, zero-config deploys                                                                                                                                |

**No paid APIs are required anywhere in this stack.** All services used (Neon, EdgeStore, Pusher, Vercel) have free tiers sufficient for a hackathon demo.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App (Vercel)                   │
│                                                                 │
│   ┌───────────┐   ┌───────────────┐   ┌───────────────────┐  │
│   │ User Panel │   │ Management     │   │ City Corporation   │  │
│   │            │   │ Panel          │   │ Panel               │  │
│   └─────┬─────┘   └───────┬───────┘   └──────────┬──────────┘  │
│         │                   │                       │            │
│         └───────────────────┼───────────────────────┘            │
│                              │                                    │
│                    Server Actions Layer                          │
│              (auth, report CRUD, status updates)                 │
│                              │                                    │
│           ┌──────────────────┼──────────────────┐                │
│           ▼                  ▼                  ▼                │
│    ┌────────────┐   ┌───────────────┐   ┌────────────────┐      │
│    │   Neon DB   │   │  EdgeStore     │   │  Pusher (SOS)   │      │
│    │  (Drizzle)  │   │ (photo upload) │   │   trigger/sub   │      │
│    └────────────┘   └───────────────┘   └────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

**Hazard / hotspot report submission:**

```
User fills form (photo + auto-GPS + description + selects City Corp)
   → Server Action uploads photo to EdgeStore
   → Server Action writes report row to Neon (status: under_review)
   → Report appears immediately on the map (all users)
   → Report appears on the relevant City Corp's Management + City Corp dashboards
```

**Status update:**

```
Management/City Corp changes status via dashboard
   → Server Action validates role-based permission
   → Updates report row (status, status_comment if City Corp)
   → User's own report list reflects new status on next fetch
```

**SOS emergency:**

```
User taps SOS → browser captures live GPS
   → Server Action writes SOS event to Neon
   → Server Action triggers Pusher event on `city-corp-{id}-alerts` channel
   → City Corp dashboard (subscribed client-side) shows instant alert + location
```

## Database Schema

```
city_corporations
├── id
├── name                    -- e.g. "Dhaka North City Corporation"
└── created_at

users
├── id
├── role                    -- 'user' | 'management' | 'city_corp'
├── city_corporation_id     -- nullable; set for management & city_corp roles
├── email
├── password_hash
└── created_at

reports
├── id
├── user_id                 -- reporter
├── city_corporation_id     -- selected authority scope
├── type                    -- 'hazard' | 'crime_hotspot'
├── status                  -- 'under_review' | 'resolved' | 'verified' (default: under_review)
├── status_comment          -- nullable, City Corp only, overwritten on each edit
├── photo_url
├── lat
├── lng
├── description
├── created_at
└── updated_at

report_votes
├── id
├── report_id
├── user_id                 -- one vote per user per report
└── created_at

sos_alerts
├── id
├── user_id
├── city_corporation_id
├── lat
├── lng
└── created_at
```

## Realtime Strategy

Only **one** feature in this platform genuinely requires server-pushed realtime updates: **SOS alerts to the City Corporation dashboard.** Every other "live" feature is handled without server push:

| Feature                              | Mechanism                                              | Why                                                                                    |
| ------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| SOS → authority dashboard            | **Pusher** (trigger on submit, subscribe on dashboard) | Needs true server → client push; Vercel serverless rules out self-hosted SSE/WebSocket |
| Danger zone proximity alerts         | Client-side `watchPosition()` + distance check         | Pure math against already-fetched hotspot data — no backend involvement needed         |
| Status updates on user's own reports | Refetch on page load/focus                             | Not time-critical for the reporter; avoids extra infra                                 |

## Danger Zone Alerts

Implemented entirely client-side:

1. On consent, `navigator.geolocation.watchPosition()` tracks the user's live position.
2. Hotspot coordinates are fetched once (or refreshed periodically) from the database.
3. On each position update, a Haversine distance calculation checks proximity against every hotspot.
4. If the user falls within a defined radius (e.g. 100m) of a hotspot, an in-app toast/banner warns them — no server round-trip required.

## Project Structure

```
/app
  /(public)
    /login
    /register
  /user
    /report/new
    /reports
    /map
  /management
    /[cityCorpId]/reports
  /city-corp
    /[cityCorpId]/reports
    /[cityCorpId]/alerts
  /api
    /pusher-auth          -- if private channels are used
/actions
  auth.ts
  reports.ts
  status.ts
  sos.ts
/db
  schema.ts               -- Drizzle schema
  index.ts
/lib
  pusher.ts
  edgestore.ts
  geolocation.ts
/components
  Map/
  ReportForm/
  ReportList/
  StatusBadge/
  SOSButton/
```

## Environment Variables

```
DATABASE_URL=              # Neon Postgres connection string
EDGE_STORE_ACCESS_KEY=
EDGE_STORE_SECRET_KEY=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
SESSION_SECRET=            # for signing auth cookies
```

## Getting Started

```bash
# install dependencies
npm install

# push Drizzle schema to Neon
npm run db:push

# seed City Corporations + Management/City Corp accounts
npm run db:seed

# run locally
npm run dev
```

## Deliverables Checklist

- [ ] Working prototype: hotspot map, hazard reporting flow, SOS feature
- [ ] Three functional panels: User, Management, City Corporation
- [ ] Status lifecycle enforced by role (`under_review → resolved → verified`, City Corp full control)
- [ ] Community upvote/confirm on reports
- [ ] Danger zone proximity alerts
- [ ] Technical writeup (architecture, data flow, report routing) — _this document_
- [ ] 3–5 minute demo video / live walkthrough

---

_Built for [Hackathon Name] — Problem Statement 2: Community-Driven Public Safety Platform._

Dhaka North management-dhaka-north@example.com Management#2026
Dhaka South management-dhaka-south@example.com Management#2026
City Corporation panel
City Corporation Email Password
Dhaka North citycorp-dhaka-north@example.com CityCorp#2026
Dhaka South citycorp-dhaka-south@example.com CityCorp#2026
