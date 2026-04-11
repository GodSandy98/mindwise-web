# CLAUDE.md — MindWise Web

## Project Overview

React + TypeScript frontend for the MindWise student psychological assessment system.
Consumes the mindwise-api FastAPI backend.

Teachers log in to view student scores, submit questionnaire answers, and generate LLM-based psychological reports.

## Commands

```bash
# Install dependencies
npm install

# Start dev server (default: http://localhost:5173)
npm run dev

# Type-check
npm run build
```

## Environment

Create `.env.local` in the project root:

```
VITE_API_BASE_URL=http://localhost:8000
```

## Architecture

- **Entry point**: `src/main.tsx` — sets up QueryClient, Router, and renders `<App />`
- **Routing**: `src/App.tsx` — React Router v7 routes with auth guards
- **API layer**: `src/api/` — one file per domain; all calls go through `client.ts` (axios instance with JWT interceptor)
- **Pages**: `src/pages/` — one file per route
- **Components**: `src/components/` — shared UI (Navbar, ScoreBar, LevelBadge, etc.)
- **Auth state**: stored in `localStorage` as `token` + `user` JSON; read by `client.ts` interceptor

## Key Conventions

- **Auth**: JWT Bearer token. On 401, clear localStorage and redirect to `/login`
- **Role-based rendering**: check `user.role` from localStorage (`super_admin` / `admin_teacher` / `class_teacher`)
- **Data fetching**: TanStack Query (`useQuery` / `useMutation`) — avoid raw `useEffect` for API calls
- **Error display**: show error messages inline near the triggering element, not in alerts
- **Tailwind**: utility-first; avoid custom CSS files unless absolutely necessary

## Pages & Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/students` | StudentsPage | All authenticated |
| `/students/:id` | StudentDetailPage | All authenticated |
| `/exams` | ExamsPage | All authenticated |
| `/exams/:id/scores` | ExamScoresPage | admin_teacher+ |
| `/exams/:id/submit` | SubmitAnswersPage | All authenticated |
| `/reports/:studentId` | ReportPage | admin_teacher+ |
| `/admin` | AdminPage | super_admin only |

## API Layer

`src/api/client.ts` exports an axios instance. Every other file in `src/api/` imports it and exports typed async functions. Example:

```ts
// src/api/students.ts
import client from './client'
import { Student } from '../types'

export const getStudents = () =>
  client.get<Student[]>('/api/v1/students/students').then(r => r.data)
```

## Score Level Logic

Standardized scores are bucketed into three levels displayed throughout the UI:

| Level | Range | Color |
|-------|-------|-------|
| H (High) | z ≥ 0.67 | Green |
| M (Medium) | -0.67 < z < 0.67 | Yellow |
| L (Low) | z ≤ -0.67 | Red |

This logic lives in a shared utility — do not duplicate it per component.
