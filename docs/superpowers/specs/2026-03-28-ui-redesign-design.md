# UI Redesign — Design Spec

## Overview

Redesign the Adaptive Learning Platform's frontend with a card-based modular design system. Every page gets a consistent look built on CSS custom properties for future per-user theming. Includes dark mode toggle, client-side topic search, sidebar removal, and responsive card reflow.

## Goals

- Consistent visual language across all pages (student and admin)
- Card-based layout that naturally reflows for responsive/mobile
- Eliminate the layout shift bug on topic pages by removing the sidebar
- Themeable foundation via CSS custom properties (v1: one default theme + dark mode)
- Improve the admin experience to match the rest of the app

## Design System Foundation

### CSS Custom Properties

All visual tokens defined in `globals.css` on `:root` (light) and `.dark` (dark):

| Variable | Light | Dark |
|----------|-------|------|
| `--color-accent` | `#2563eb` (blue-600) | `#3b82f6` (blue-500) |
| `--color-bg` | `#f9fafb` (gray-50) | `#111827` (gray-900) |
| `--color-surface` | `#ffffff` | `#1f2937` (gray-800) |
| `--color-text` | `#111827` (gray-900) | `#f9fafb` (gray-50) |
| `--color-text-secondary` | `#6b7280` (gray-500) | `#9ca3af` (gray-400) |
| `--color-border` | `#e5e7eb` (gray-200) | `#374151` (gray-700) |
| `--radius` | `8px` | `8px` |

The existing `globals.css` `!important` overrides on `html` and `body` (`color-scheme: light !important`, `background-color: #ffffff !important`, `color: #171717 !important`) must be removed and replaced with the CSS custom properties above. These overrides would prevent dark mode from working.

Dark mode properties are defined using `html.dark { ... }` in `globals.css`. This is compatible with the existing `@custom-variant dark (&:is(.dark *))` directive which enables Tailwind's `dark:` utilities on descendants of the `.dark` element.

### Card Component

The fundamental building block. All distinct content sections are cards:

- Background: `var(--color-surface)`
- Border: `1px solid var(--color-border)`
- Border radius: `var(--radius)` (8px)
- Padding: `p-6` base (24px)
- Subtle shadow on hover for interactive cards (`hover:shadow-md`)
- No shadow at rest — clean and flat

### Dark Mode

- Toggle button in the header (sun/moon icon)
- Preference saved to `localStorage`, persists across sessions
- Uses a `.dark` class on `<html>` that swaps CSS custom property values
- Cards: white → dark gray (`#1f2937`)
- Background: light gray → near-black (`#111827`)
- Text: dark → light
- Accent color shifts slightly brighter in dark mode for contrast
- LessonContent prose gets `dark:prose-invert` to handle markdown text color inversion

### Responsive Behavior

- All pages (including header) use the same container: `max-w-5xl mx-auto px-4`
- Card grids use `grid-cols-1 md:grid-cols-2` — single column by default, 2 columns at `md` (768px+)
- No dedicated mobile design, but all layouts are usable on narrow screens
- Chat overlay works on any screen size

## Page Layouts

### Header (`layout.tsx`)

Redesigned to use design tokens:
- Container: `max-w-5xl mx-auto px-4` (matches page content alignment)
- Background: `var(--color-surface)` with bottom border `var(--color-border)`
- Logo and nav links use `var(--color-text)` with accent hover
- ThemeToggle button on the right side of the nav

### Home Page (`/`)

Clean landing page:
- App title
- Search bar that navigates to `/topics?q=<query>` on submit
- "Browse All Topics" link below the search bar
- No data fetching — search navigates to the topics page which handles filtering

### Topics List Page (`/topics`)

Searchable grid of topic cards:
- Search bar at top, filters topics client-side in real-time
- Reads `?q=` query param to pre-fill search (supports navigation from home page)
- Topics displayed as cards: `grid-cols-1 md:grid-cols-2`
- Each card shows: topic name, description, lesson count, subtopic count
- Category grouping deferred to when there are 100+ topics

### Topic Detail Page (`/topics/[id]`)

No sidebar. Full-width card-based layout:
- Breadcrumbs at top
- Header card with topic title + description
- Subtopics as a card grid: `grid-cols-1 md:grid-cols-2`
- Lessons as a card list (single column, each lesson is its own card)
- Quiz panel as a card at the bottom
- Remove the `allTopics` query that currently feeds the sidebar (performance improvement)

### Lesson Page (`/lessons/[id]`)

Full-width lesson content:
- Breadcrumbs at top
- Lesson content rendered in a prose card with `dark:prose-invert` for dark mode
- Remove `mr-[450px]` from `<main>` — lesson takes full width
- Remove `allTopics` query and sidebar
- Floating chat button stays at `fixed bottom-6 right-6` (existing behavior)
- Chat drawer changes: when expanded, it overlays lesson content instead of pushing it. Drawer slides in from the right with a 200ms ease transition. Lesson content stays full width underneath.
- Closing drawer returns to just the floating button

### Admin Page (`/admin/lessons`)

Same card system as student-facing pages:
- Form lives inside a card with `p-6` padding, centered within the `max-w-5xl` container using `max-w-2xl mx-auto` for the card itself (keeps the form narrow and readable)
- Topic selector, lesson title/description, education level organized in clear sections
- Generate button prominent at the bottom
- Loading state: card with spinner and status message
- Success state: card with green left border and lesson link
- Error state: card with red left border and error details with retry

## Component Changes

### Deleted

- **TopicSidebar** — removed from all pages. Topic navigation handled via breadcrumbs and the topics list page. The `allTopics` data fetching in topic detail and lesson pages is also removed.

### Redesigned

- **TopicCard** — proper card with `var(--color-surface)` background, border, `p-6` padding, `hover:shadow-md`. Shows name, description, lesson count, subtopic count.
- **LessonCard** — card with lesson number, title, and a chevron indicating it's clickable. Same card styling.
- **ChatPanel** — floating button stays the same. Expanded drawer becomes an overlay (no `mr-[450px]` space reservation). Drawer uses `fixed right-0 top-0 bottom-0 w-[420px]` with backdrop overlay. Slide-in animation: 200ms ease. All colors use design tokens.
- **QuizPanel** — wrapped in a card. Internal states (idle, taking, results) stay the same, styled consistently with design tokens.
- **LessonContent** — same prose rendering with added `dark:prose-invert`. Wrapped in a card on the lesson page.

### New

- **SearchBar** — text input with search icon. Used on home page (navigates to `/topics?q=`) and topics list page (filters client-side). Styled with design tokens.
- **ThemeToggle** — sun/moon icon button in the header. Toggles `.dark` class on `<html>` and saves preference to `localStorage`.

## What's NOT Changing

- No new backend routes or database changes
- No authentication changes
- No changes to lesson generation logic or content agent
- No changes to Mermaid/SVG rendering inside lessons
- No mobile-specific design beyond responsive reflow

## Search Implementation

Client-side filtering only (v1):
- Topics list page uses a server/client split: a server component fetches all topics, passes them as props to a client component that handles filtering and rendering
- SearchBar filters in real-time against topic `name` and `description`
- Case-insensitive substring match
- Home page search bar navigates to `/topics?q=<query>`, topics page reads the param
- Server-side search deferred until topic count warrants it
