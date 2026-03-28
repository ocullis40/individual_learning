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

All visual tokens defined as CSS custom properties on `:root` (light) and `.dark` (dark):

- `--color-accent` — primary blue for buttons, links, highlights
- `--color-bg` — page background (light gray / near-black)
- `--color-surface` — card background (white / dark gray)
- `--color-text` — primary text color
- `--color-text-secondary` — muted text
- `--color-border` — card and divider borders
- `--radius` — border radius (8px default)
- `--spacing-density` — multiplier for padding/margins (1.0 default)

v1 ships light and dark themes. Per-user theming (accent color, font, density) is a future addition that swaps these variables.

### Card Component

The fundamental building block. All distinct content sections are cards:

- White (light) or dark gray (dark) background
- 1px border using `--color-border`
- Border radius using `--radius`
- Subtle shadow on hover for interactive cards
- Consistent internal padding

### Dark Mode

- Toggle button in the header (sun/moon icon)
- Preference saved to `localStorage`, persists across sessions
- Uses a `.dark` class on `<html>` that swaps CSS custom property values
- Cards: white → dark gray
- Background: light gray → near-black
- Text: dark → light
- Accent color (blue) works in both modes

### Responsive Behavior

- All pages use the same container: `max-w-5xl mx-auto` with consistent padding
- Card grids (2-column) collapse to single column on small screens via Tailwind `md:` breakpoints
- No dedicated mobile design, but all layouts are usable on narrow screens
- Chat overlay works on any screen size

## Page Layouts

### Home Page (`/`)

Clean landing page:
- App title
- Search bar (searches topics by name and description)
- "Browse All Topics" link below the search bar
- Minimal — gets you into the app fast

### Topics List Page (`/topics`)

Searchable grid of topic cards:
- Search bar at top, filters topics client-side in real-time
- Topics displayed as cards in a 2-column grid (1 column on mobile)
- Each card shows: topic name, description, lesson count, subtopic count
- Category grouping deferred to when there are 100+ topics

### Topic Detail Page (`/topics/[id]`)

No sidebar. Full-width card-based layout:
- Breadcrumbs at top
- Header card with topic title + description
- Subtopics as a card grid (2 columns, 1 on mobile)
- Lessons as a card list (single column, each lesson is its own card)
- Quiz panel as a card at the bottom

### Lesson Page (`/lessons/[id]`)

Full-width lesson content:
- Breadcrumbs at top
- Lesson content rendered in a prose card (full width, no reserved chat space)
- Floating chat button (bottom-right corner)
- Chat opens as an overlay drawer from the right — covers lesson content, does not push it
- Closing chat returns to full-width lesson view

### Admin Page (`/admin/lessons`)

Same card system as student-facing pages:
- Form lives inside a card
- Topic selector, lesson title/description, education level organized in clear sections
- Generate button prominent at the bottom
- Loading state: card with spinner and status message
- Success state: green-bordered card with lesson link
- Error state: red-bordered card with error details and retry

## Component Changes

### Deleted

- **TopicSidebar** — removed from all pages. Topic navigation handled via breadcrumbs and the topics list page.

### Redesigned

- **TopicCard** — proper card with border, padding, hover shadow. Shows name, description, lesson count, subtopic count.
- **LessonCard** — card with lesson number, title, and a chevron indicating it's clickable.
- **ChatPanel** — reworked from fixed-position with reserved `mr-[450px]` to an overlay drawer. Floating button bottom-right, slide-in panel overlays content when open.
- **QuizPanel** — wrapped in a card. Internal states (idle, taking, results) stay the same, styled consistently with the design system.
- **LessonContent** — same prose rendering, wrapped in a card on the lesson page.

### New

- **SearchBar** — text input with filter icon. Used on home page and topics list page. Client-side filtering against topic name and description.
- **ThemeToggle** — sun/moon icon button in the header. Toggles `.dark` class on `<html>` and saves preference to `localStorage`.

## What's NOT Changing

- No new backend routes or database changes
- No authentication changes
- No changes to lesson generation logic or content agent
- No changes to Mermaid/SVG rendering inside lessons
- No mobile-specific design beyond responsive reflow

## Search Implementation

Client-side filtering only (v1):
- All topics loaded on the page
- Text input filters in real-time against topic `name` and `description`
- Case-insensitive substring match
- Server-side search deferred until topic count warrants it
