# MOSJID.INFO

**বাংলাদেশের মসজিদ তথ্য ও ডিরেক্টরি** — Bangladesh Mosque Information & Directory

A nationwide mosque directory platform targeting 300,000+ mosques across Bangladesh.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Map**: MapLibre GL JS + OpenFreeMap
- **Fonts**: Hind Siliguri (Bangla) + Inter (Latin)

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- A [Supabase](https://supabase.com) project

### Setup

```bash
# Clone
git clone https://github.com/workmail1803-ai/masjid_info.git
cd masjid_info/mosjid-info

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### Database Setup

Apply the SQL migrations in `supabase/migrations/` to your Supabase project in order:

1. `00001_extensions.sql` — PostgreSQL extensions (pg_trgm, uuid-ossp, unaccent)
2. `00002_geography.sql` — Divisions, Districts, Upazilas
3. `00003_masjids.sql` — Core masjids table with indexes
4. `00004_masjid_related.sql` — Images, contacts, ratings, submissions
5. `00005_content.sql` — Notices, news, topics, resources
6. `00006_auth_admin.sql` — Profiles, audit logs, import batches
7. `00007_search.sql` — Optimized search RPC functions
8. `00008_rls.sql` — Row Level Security policies
9. `00009_stats_rpc.sql` — Dashboard statistics RPC

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin panel
│   ├── api/                # API routes
│   ├── masjid/             # Directory & detail pages
│   ├── division/           # Division pages
│   ├── district/           # District pages
│   ├── upazila/            # Upazila pages
│   ├── notices/            # Notice pages
│   ├── news/               # News pages
│   ├── topics/             # Topic pages
│   ├── resources/          # Resource pages
│   ├── about/              # About page
│   └── contact/            # Contact page
├── components/
│   └── layout/             # Header, Footer, MobileNav
├── config/                 # Site & navigation config
├── features/               # Feature modules
│   ├── admin/              # Admin forms & actions
│   ├── contact/            # Contact form
│   ├── directory/          # Search, filters, results
│   └── submission/         # Public submission form
├── lib/
│   ├── services/           # Data access layer
│   └── supabase/           # Supabase clients
└── types/                  # TypeScript types
```

## License

All rights reserved.
