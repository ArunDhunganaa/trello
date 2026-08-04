# Trello Clone

[![CI](https://github.com/ArunDhunganaa/trello/actions/workflows/ci.yml/badge.svg)](https://github.com/ArunDhunganaa/trello/actions/workflows/ci.yml)

A full-stack Trello clone built as a portfolio project. Features real-time collaboration, drag-and-drop, and a complete card management system.

## Tech Stack

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript + Tailwind CSS v4 |
| State | Zustand |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) |
| Drag & Drop | @dnd-kit |
| Forms | React Hook Form + Zod |
| Tests | Vitest + React Testing Library |
| Deploy | Vercel |

## Features

- Board management with custom backgrounds (colors + images)
- Lists and cards with drag-and-drop reordering
- Card detail modal — description (Markdown), checklists, due dates, cover images, labels
- Real-time sync across browser tabs via Supabase Realtime
- Comments with edit/delete
- File attachments
- Board member invites with role-based access (owner / admin / member)
- Search palette (⌘K)
- Dark mode

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Apply the database schema (paste into Supabase SQL Editor)
# → supabase/schema.sql

# Start the dev server
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Watch mode tests |
| `npm run test:run` | Single-run tests |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint |

## Project Structure

```
src/
├── components/       # UI components (board, card, list, layout, ui)
├── lib/              # Supabase services + utilities
├── pages/            # Route-level pages
├── store/            # Zustand stores
├── types/            # Shared TypeScript types
└── test/             # Test setup
supabase/
└── schema.sql        # Full database schema + RLS policies
.github/
└── workflows/ci.yml  # GitHub Actions — type-check, lint, test
```

