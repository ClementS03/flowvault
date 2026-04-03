# FlowVault

**Store, share, and copy Webflow components in one click.**

FlowVault is a community marketplace for Webflow components. Copy any element from the Webflow Designer, paste it into FlowVault to save and share it, and let others copy it straight back into their own projects — no export, no JSON wrangling.

---

## Features

- **Upload in one paste** — Copy any element from the Webflow Designer (Ctrl+C), paste it on FlowVault (Ctrl+V). The component JSON is stored securely.
- **Instant sharing** — Every component gets a unique public link (`/c/[slug]`). Anyone can copy it into Webflow with a single click.
- **Personal library** — Manage all your components from your dashboard. Toggle public/private, edit metadata, copy or delete.
- **Browse & discover** — A public marketplace of components shared by the community, filterable by category.
- **Custom profile** — Public profile page with your components, stats, bio, and avatar. Private profile option available.
- **Free plan** — Store up to 10 components for free. Pro plan for unlimited storage (coming soon).

---

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Auth** | Supabase Auth (Google OAuth + Magic Link) |
| **Database** | Supabase PostgreSQL |
| **Storage** | Supabase Storage |
| **Styles** | Tailwind CSS |
| **Hosting** | Vercel |
| **Email** | Resend |

---

## Getting Started (local dev)

### Prerequisites

- Node.js 18+
- A Supabase project
- A Vercel account (for deployment)

### 1. Clone and install

```bash
git clone https://github.com/ClementS03/flowvault
cd flowvault
npm install
```

### 2. Set environment variables

Create `.env.local` at the repo root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=your_resend_key
```

### 3. Set up Supabase

Run the SQL from `CLAUDE.md` (DB Changes section) in your Supabase SQL editor to create the `components`, `copies`, and `profiles` tables.

Create three Storage buckets:
- `components-json` — **private**
- `component-previews` — **public**
- `avatars` — **public**

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Roadmap

| Phase | Status | Description |
|---|---|---|
| **Phase 1 — MVP** | ✅ Done | Auth, upload, storage, share links, copy to Webflow, dashboard |
| **Phase 1b — Profile UX** | ✅ Done | Two-column profile, avatar upload, private profile toggle |
| **Phase 2 — Marketplace** | Planned | Browse, search, filters, trending |
| **Phase 2b — Social Graph** | Planned | Follow/unfollow, saved components, follower counts |
| **Phase 3 — Pro plan** | Planned | Stripe billing, unlimited storage, upgrade flow |
| **Phase 4 — Polish** | Planned | Component previews, collections, creator analytics |

---

## Project Structure

```
app/
  actions/          Server Actions (create, delete, update, togglePublic…)
  browse/           Public marketplace
  c/[slug]/         Public component page
  dashboard/        Authenticated library
  settings/         Profile + avatar + privacy settings
  u/[username]/     Public profile page
  upload/           Paste + form
components/         Shared UI components
libs/               Utilities (copyToWebflow, supabase, slugify…)
docs/
  superpowers/
    specs/          Design specs
    plans/          Implementation plans
```

---

## License

Private repository. All rights reserved.
