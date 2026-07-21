# DESIGN.md — Opexia Design System & Style Guide

**Document Version:** 1.0  
**Classification:** Internal — Source of Truth for UI/UX  
**Last Updated:** 2026-07-17  

> **Agent Directive:** All future UI components, pages, and layouts MUST reference this document for branding, color, spacing, and component conventions. Non-compliant code will be rejected in review.

---

## 1. Color Palette

### 1.1 Global Color Variables

| Token | Name | Hex | RGB | Usage |
|-------|------|-----|-----|-------|
| `--brand` | Primary Brand | `#17A5DC` | `23, 165, 220` | Primary actions, links, active states, CTAs |
| `--dark-accent` | Dark Accent | `#0F4664` | `15, 70, 100` | Sidebar, header, dark surfaces, emphasis |
| `--light-bg` | Light Background | `#F8FBFD` | `248, 251, 253` | Main content area, page backgrounds |
| `--dark-text` | Dark Text | `#1F2937` | `31, 41, 55` | Body text, headings, labels |
| `--highlight` | Highlight | `#D9F2FB` | `217, 242, 251` | Hover states, selected rows, active indicators |
| `--white` | White | `#FFFFFF` | `255, 255, 255` | Cards, modals, input backgrounds, surfaces |

### 1.2 Derived Colors (Extended Palette)

| Token | Hex | Usage |
|-------|-----|-------|
| `--brand-hover` | `#1490C2` | Brand button hover state |
| `--brand-active` | `#117BA8` | Brand button active/pressed state |
| `--brand-light` | `#E8F6FC` | Brand tint for subtle backgrounds |
| `--dark-accent-hover` | `#0D3B54` | Sidebar link hover |
| `--border` | `#E2E8F0` | Default borders on cards, tables, inputs |
| `--border-strong` | `#CBD5E1` | Focused input borders, table header dividers |
| `--muted` | `#6B7280` | Secondary text, placeholders, timestamps |
| `--success` | `#059669` | Approved entries, positive indicators |
| `--warning` | `#D97706` | Pending states, budget warnings |
| `--error` | `#DC2626` | Rejected entries, destructive actions, validation errors |

### 1.3 CSS Custom Properties

```css
:root {
  /* Core Palette */
  --brand: #17A5DC;
  --dark-accent: #0F4664;
  --light-bg: #F8FBFD;
  --dark-text: #1F2937;
  --highlight: #D9F2FB;
  --white: #FFFFFF;

  /* Derived */
  --brand-hover: #1490C2;
  --brand-active: #117BA8;
  --brand-light: #E8F6FC;
  --dark-accent-hover: #0D3B54;
  --border: #E2E8F0;
  --border-strong: #CBD5E1;
  --muted: #6B7280;
  --success: #059669;
  --warning: #D97706;
  --error: #DC2626;

  /* Semantic Aliases */
  --background: var(--light-bg);
  --foreground: var(--dark-text);
  --card: var(--white);
  --card-foreground: var(--dark-text);
  --popover: var(--white);
  --popover-foreground: var(--dark-text);
  --primary: var(--brand);
  --primary-foreground: var(--white);
  --secondary: var(--dark-accent);
  --secondary-foreground: var(--white);
  --muted-foreground: var(--muted);
  --accent: var(--highlight);
  --accent-foreground: var(--dark-text);
  --destructive: var(--error);
  --destructive-foreground: var(--white);
  --border: var(--border);
  --input: var(--border);
  --ring: var(--brand);
  --success: var(--success);
  --warning: var(--warning);
}
```

---

## 2. Tailwind & shadcn/ui Mapping

### 2.1 Tailwind Configuration

Extend the default Tailwind palette in `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#17A5DC',
          hover: '#1490C2',
          active: '#117BA8',
          light: '#E8F6FC',
        },
        'dark-accent': {
          DEFAULT: '#0F4664',
          hover: '#0D3B54',
        },
        'light-bg': '#F8FBFD',
        'dark-text': '#1F2937',
        highlight: '#D9F2FB',
        border: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#6B7280',
        },
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',   // 6px — shadcn/ui default
        sm: '0.25rem',         // 4px
        md: '0.375rem',        // 6px
        lg: '0.5rem',          // 8px
        xl: '0.75rem',         // 12px
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px
        base: ['0.875rem', { lineHeight: '1.5rem' }],   // 14px — primary body
        lg: ['1rem', { lineHeight: '1.5rem' }],          // 16px
        xl: ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### 2.2 shadcn/ui Semantic Variable Mapping

Map the Opexia palette to shadcn/ui's CSS variable convention:

| shadcn/ui Variable | Opexia Token | Tailwind Class | Description |
|--------------------|-------------|----------------|-------------|
| `--background` | `--light-bg` | `bg-light-bg` | Page background |
| `--foreground` | `--dark-text` | `text-dark-text` | Primary text |
| `--card` | `--white` | `bg-white` | Card/surface background |
| `--card-foreground` | `--dark-text` | `text-dark-text` | Card text |
| `--popover` | `--white` | `bg-white` | Dropdown/popover background |
| `--popover-foreground` | `--dark-text` | `text-dark-text` | Dropdown text |
| `--primary` | `--brand` | `bg-brand text-white` | Primary buttons, links |
| `--primary-foreground` | `--white` | `text-white` | Text on primary |
| `--secondary` | `--dark-accent` | `bg-dark-accent text-white` | Secondary buttons, sidebar |
| `--secondary-foreground` | `--white` | `text-white` | Text on secondary |
| `--muted` | `--light-bg` | `bg-light-bg` | Muted backgrounds |
| `--muted-foreground` | `--muted` | `text-muted-foreground` | Secondary text, labels |
| `--accent` | `--highlight` | `bg-highlight` | Hover/active highlights |
| `--accent-foreground` | `--dark-text` | `text-dark-text` | Text on accent |
| `--destructive` | `--error` | `bg-error text-white` | Destructive actions |
| `--destructive-foreground` | `--white` | `text-white` | Text on destructive |
| `--border` | `--border` | `border-border` | Default borders |
| `--input` | `--border` | `border-border` | Input borders |
| `--ring` | `--brand` | `ring-brand` | Focus rings |
| `--success` | `--success` | `text-success` | Success states |
| `--warning` | `--warning` | `text-warning` | Warning states |

### 2.3 globals.css Integration

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 248 251 253;    /* #F8FBFD */
    --foreground: 31 41 55;       /* #1F2937 */
    --card: 255 255 255;          /* #FFFFFF */
    --card-foreground: 31 41 55;
    --popover: 255 255 255;
    --popover-foreground: 31 41 55;
    --primary: 23 165 220;        /* #17A5DC */
    --primary-foreground: 255 255 255;
    --secondary: 15 70 100;       /* #0F4664 */
    --secondary-foreground: 255 255 255;
    --muted: 248 251 253;
    --muted-foreground: 107 114 128; /* #6B7280 */
    --accent: 217 242 251;        /* #D9F2FB */
    --accent-foreground: 31 41 55;
    --destructive: 220 38 38;     /* #DC2626 */
    --destructive-foreground: 255 255 255;
    --border: 226 232 240;        /* #E2E8F0 */
    --input: 226 232 240;
    --ring: 23 165 220;
    --radius: 0.375rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

---

## 3. Layout Anatomy

### 3.1 Application Shell Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION SHELL                            │
├────────────┬────────────────────────────────────────────────────────┤
│            │  TOP HEADER (h-16, sticky, white)                      │
│            │  ┌──────────────────────────────────────────────────┐  │
│  SIDEBAR   │  │  Logo   │   Global Time Tracker   │  User Menu  │  │
│  (w-64,    │  └──────────────────────────────────────────────────┘  │
│  fixed,    ├────────────────────────────────────────────────────────┤
│  dark-     │                                                        │
│  accent)   │  MAIN CONTENT AREA                                     │
│            │  (scrollable, light-bg, p-6)                           │
│            │                                                        │
│  ┌───────┐ │  ┌──────────────────────────────────────────────────┐  │
│  │ Logo  │ │  │  Page Header                                     │  │
│  ├───────┤ │  ├──────────────────────────────────────────────────┤  │
│  │ Nav   │ │  │  Content (tables, cards, forms)                  │  │
│  │ Items │ │  │                                                  │  │
│  │       │ │  │                                                  │  │
│  │       │ │  └──────────────────────────────────────────────────┘  │
│  │       │ │                                                        │
│  │       │ │                                                        │
│  └───────┘ │                                                        │
├────────────┴────────────────────────────────────────────────────────┤
│  (no footer — high-density layout maximizes content area)           │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Sidebar Specification

| Property | Value | Notes |
|----------|-------|-------|
| **Position** | Fixed, left | `position: fixed; left: 0; top: 0;` |
| **Width** | `w-64` (256px) | Fixed, non-collapsible in v1 |
| **Background** | `bg-dark-accent` (#0F4664) | Full dark accent fill |
| **Height** | `h-screen` | Full viewport height |
| **Z-Index** | `z-30` | Above content, below modals |
| **Padding** | `px-3 py-4` | Compact horizontal, standard vertical |

**Sidebar Content Hierarchy:**

```
┌──────────────────┐
│  OPX Logo        │  h-8, white, font-semibold, mb-8
│  ─────────────── │
│  Dashboard       │  NavItem — icon + label, 36px height
│  Projects        │
│  Team            │
│  Reports         │
│  Tags            │
│  ─────────────── │
│  Settings        │  Bottom-pinned section
│  [User Name]     │  User info with avatar
└──────────────────┘
```

**NavItem States:**

| State | Background | Text | Icon |
|-------|-----------|------|------|
| Default | `transparent` | `text-white/70` | `text-white/50` |
| Hover | `bg-white/10` | `text-white` | `text-white/80` |
| Active | `bg-brand` | `text-white font-medium` | `text-white` |

### 3.3 Top Header Specification

| Property | Value | Notes |
|----------|-------|-------|
| **Position** | Sticky, top-0 | `position: sticky; top: 0;` |
| **Height** | `h-16` (64px) | Fixed height, no expansion |
| **Background** | `bg-white` | Clean white surface |
| **Border** | `border-b border-border` | Subtle bottom separator |
| **Z-Index** | `z-20` | Above content, below sidebar |
| **Padding** | `px-6` | Horizontal content padding |
| **Shadow** | None | No shadow — flat design |

**Header Content Zones:**

```
┌────────────────────────────────────────────────────────────────┐
│  [Breadcrumb]            [TIME TRACKER]          [Avatar][Name]│
│  Left zone              Center zone              Right zone     │
│  flex-1                 flex-shrink-0            flex-shrink-0  │
└────────────────────────────────────────────────────────────────┘
```

### 3.4 Main Content Area Specification

| Property | Value | Notes |
|----------|-------|-------|
| **Position** | Relative | Flows below header, right of sidebar |
| **Margin-left** | `ml-64` | Offset by sidebar width |
| **Background** | `bg-light-bg` (#F8FBFD) | Light background |
| **Padding** | `p-6` (24px) | Consistent content spacing |
| **Min-height** | `min-h-screen` | Full viewport coverage |
| **Overflow** | `overflow-y-auto` | Scrollable vertically |

### 3.5 Content Grid System

Use a **12-column grid** within the main content area for responsive layouts:

| Layout | Grid | Use Case |
|--------|------|----------|
| Full Width | `grid-cols-12` | Data tables, reports |
| Two-Column | `grid-cols-12 gap-6` → `col-span-8` + `col-span-4` | Dashboard (content + sidebar) |
| Three-Column | `grid-cols-12 gap-6` → `col-span-4` × 3 | Metric cards |
| Form Layout | `max-w-2xl mx-auto` | Centered single-column forms |

---

## 4. Component Standards

### 4.1 Data Tables (Primary Component)

Data tables are the **core UI element** of Opexia. All time entries, reports, and lists render as high-density tables.

**Density Configuration:**

| Property | Value | Rationale |
|----------|-------|-----------|
| Row height | `h-9` (36px) | Compact — maximum rows visible |
| Cell padding | `px-3 py-1.5` | Tight horizontal, minimal vertical |
| Font size | `text-sm` (13px) | Slightly smaller than body for density |
| Header height | `h-10` (40px) | Distinct from body rows |
| Header font | `text-xs font-semibold uppercase tracking-wide` | Clear visual hierarchy |
| Header bg | `bg-light-bg` | Distinguished from white body rows |

**Visual Treatment:**

| Element | Styling |
|---------|---------|
| **Table wrapper** | `rounded-lg border border-border bg-white overflow-hidden` |
| **Header row** | `bg-light-bg border-b border-border` |
| **Body row** | `border-b border-border last:border-0` |
| **Row hover** | `hover:bg-highlight transition-colors duration-75` |
| **Row selected** | `bg-highlight` (persistent, not just hover) |
| **Status badge** | `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium` |
| **Empty state** | Centered `py-12 text-muted-foreground` with icon |
| **Sticky header** | `sticky top-0 z-10` (for long scrollable tables) |

**Status Badge Colors:**

| Status | Background | Text | Indicator |
|--------|-----------|------|-----------|
| `running` | `bg-brand-light` | `text-brand` | Pulsing dot |
| `pending` | `bg-amber-50` | `text-amber-700` | `●` |
| `approved` | `bg-emerald-50` | `text-emerald-700` | `✓` |
| `rejected` | `bg-red-50` | `text-red-700` | `✗` |
| `invoiced` | `bg-slate-100` | `text-slate-600` | `$$$` |

**Table Template (React + shadcn/ui):**

```tsx
<div className="rounded-lg border border-border bg-white overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-light-bg border-b border-border">
        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Column
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-border last:border-0 hover:bg-highlight transition-colors duration-75">
        <td className="px-3 py-1.5 text-dark-text">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 4.2 Buttons

| Variant | Classes | Usage |
|---------|---------|-------|
| **Primary** | `bg-brand text-white hover:bg-brand-hover active:bg-brand-active px-4 py-2 rounded-md text-sm font-medium` | Main CTAs (Start Timer, Submit, Export) |
| **Secondary** | `bg-dark-accent text-white hover:bg-dark-accent-hover px-4 py-2 rounded-md text-sm font-medium` | Secondary actions |
| **Outline** | `border border-border bg-white text-dark-text hover:bg-highlight px-4 py-2 rounded-md text-sm font-medium` | Tertiary, cancel, neutral actions |
| **Ghost** | `text-muted-foreground hover:bg-highlight hover:text-dark-text px-3 py-2 rounded-md text-sm` | Icon buttons, minimal actions |
| **Destructive** | `bg-error text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium` | Delete, reject, irreversible actions |
| **Icon (sm)** | `inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-highlight text-muted-foreground` | Table action buttons |

**Button Sizes:**

| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | `h-8` (32px) | `px-3` | `text-xs` |
| `md` (default) | `h-9` (36px) | `px-4` | `text-sm` |
| `lg` | `h-10` (40px) | `px-6` | `text-sm` |
| `icon` | `h-9` (36px) | — | — |

### 4.3 Form Elements

| Element | Styling |
|---------|---------|
| **Input** | `h-9 px-3 rounded-md border border-border bg-white text-sm text-dark-text placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand` |
| **Select** | Same as Input with `appearance-none` + custom chevron |
| **Textarea** | Same border/ring as Input, `min-h-[80px] resize-y` |
| **Label** | `text-sm font-medium text-dark-text` |
| **Helper text** | `text-xs text-muted-foreground mt-1` |
| **Error text** | `text-xs text-error mt-1` |
| **Checkbox** | `h-4 w-4 rounded border-border text-brand focus:ring-brand/20` |

### 4.4 Cards

| Property | Value |
|----------|-------|
| Background | `bg-white` |
| Border | `border border-border` |
| Border radius | `rounded-lg` |
| Padding | `p-4` (default), `p-6` (spacious) |
| Shadow | None (flat design) |
| Hover | `hover:border-border-strong transition-colors` (optional) |

### 4.5 Typography Scale

| Element | Font Size | Weight | Color | Line Height |
|---------|-----------|--------|-------|-------------|
| Page title | `text-xl` (18px) | `font-semibold` | `text-dark-text` | `leading-7` |
| Section header | `text-lg` (16px) | `font-semibold` | `text-dark-text` | `leading-6` |
| Card title | `text-base` (14px) | `font-semibold` | `text-dark-text` | `leading-5` |
| Body text | `text-sm` (13px) | `font-normal` | `text-dark-text` | `leading-5` |
| Small/caption | `text-xs` (12px) | `font-normal` | `text-muted-foreground` | `leading-4` |
| Table header | `text-xs` (12px) | `font-semibold uppercase tracking-wide` | `text-muted-foreground` | `leading-4` |
| Monospace (data) | `font-mono text-sm` | `font-normal` | `text-dark-text` | `leading-5` |

### 4.6 Border Radius Convention

| Level | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Badges, small indicators |
| `rounded-md` / `rounded` | 6px | Buttons, inputs, cards (default) |
| `rounded-lg` | 8px | Modal containers, table wrappers |
| `rounded-xl` | 12px | Large cards, dialog panels |
| `rounded-full` | 9999px | Avatar circles, status dots, pills |

### 4.7 Spacing System

Follow Tailwind's default scale. Key conventions:

| Context | Spacing |
|---------|---------|
| Page padding | `p-6` |
| Card padding | `p-4` or `p-6` |
| Between sections | `space-y-6` |
| Between related items | `space-y-2` or `space-y-3` |
| Table cell horizontal | `px-3` |
| Table cell vertical | `py-1.5` |
| Inline element gap | `gap-2` or `gap-3` |
| Form field spacing | `space-y-4` |

---

## 5. Time Tracker Component (Flagship UI)

The Time Tracker is the most prominent UI element — always visible in the Top Header.

### 5.1 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [▶ Start]  Project: [Select ▾]  Task: [Select ▾]  Tags    │
│  ──── OR ─────────────────────────────────────────────────── │
│  [⏸ Stop]  ● 02:34:17  Acme Corp → Q4 Audit  #billable   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 States

| State | Visual | Timer Display | Actions |
|-------|--------|--------------|---------|
| **Idle** | Muted border | `00:00:00` | Start button (primary), dropdowns enabled |
| **Running** | Pulsing brand dot + `animate-pulse-dot` | Live HH:MM:SS counter | Stop button (destructive), dropdowns locked |
| **Paused** | Amber dot | Frozen counter | Resume (primary), Stop (destructive) |
| **Syncing** | Yellow sync icon | Current value | Read-only during sync |

### 5.3 Styling

| Element | Classes |
|---------|---------|
| Container | `h-12 flex items-center gap-3 px-4 bg-white border border-border rounded-lg` |
| Timer display | `font-mono text-lg font-semibold text-dark-text tabular-nums` |
| Pulsing dot | `h-2 w-2 rounded-full bg-brand animate-pulse-dot` |
| Start button | `bg-brand text-white hover:bg-brand-hover px-4 py-1.5 rounded-md text-sm font-medium` |
| Stop button | `bg-error text-white hover:bg-red-700 px-4 py-1.5 rounded-md text-sm font-medium` |
| Select dropdown | `h-8 px-2 border border-border rounded-md text-sm bg-white min-w-[160px]` |
| Tag pills | `inline-flex items-center gap-1 rounded-full bg-brand-light text-brand px-2 py-0.5 text-xs` |

---

## 6. Utility Classes & Patterns

### 6.1 Common Layout Patterns

```tsx
// Page wrapper
<div className="space-y-6">
  {/* Page header */}
  <div className="flex items-center justify-between">
    <h1 className="text-xl font-semibold text-dark-text">Page Title</h1>
    <Button variant="primary">Action</Button>
  </div>

  {/* Content */}
  {/* ... */}
</div>

// Dashboard card grid
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-4">{/* Card 1 */}</div>
  <div className="col-span-4">{/* Card 2 */}</div>
  <div className="col-span-4">{/* Card 3 */}</div>
</div>

// Filter bar
<div className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
  <Input placeholder="Search..." className="flex-1" />
  <Select>...</Select>
  <Button variant="outline" size="sm">Export</Button>
</div>
```

### 6.2 Animation & Transition Rules

| Interaction | Transition | Duration |
|-------------|-----------|----------|
| Hover color change | `transition-colors` | `duration-75` |
| Button press | `active:` state (no transition) | Immediate |
| Dropdown open | `transition-all` | `duration-150` |
| Modal backdrop | `transition-opacity` | `duration-200` |
| Timer pulse | `animate-pulse-dot` | `2s infinite` |

### 6.3 Focus & Accessibility

| Rule | Implementation |
|------|---------------|
| Focus visible | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2` |
| Skip to content | `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` |
| Color contrast | All text meets WCAG AA (4.5:1 ratio). Dark Text on White = 12.6:1. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — disable `animate-pulse-dot` |

---

## 7. File Structure Reference

```
src/
├── app/
│   ├── globals.css          # CSS custom properties + Tailwind directives
│   ├── layout.tsx           # Root layout (sidebar + header + content)
│   └── page.tsx             # Dashboard
├── components/
│   ├── ui/                  # shadcn/ui primitives (Button, Input, Table, etc.)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopHeader.tsx
│   │   └── TimeTracker.tsx
│   ├── tables/
│   │   ├── TimeEntryTable.tsx
│   │   ├── ProjectTable.tsx
│   │   └── ReportTable.tsx
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── PageHeader.tsx
│       └── FilterBar.tsx
├── lib/
│   └── utils.ts             # cn() helper, format utilities
└── tailwind.config.ts       # Extended palette + typography
```

---

## 8. Agent Compliance Notice

> **MANDATORY:** All AI agents and code generation tools contributing to this codebase **MUST** adhere to the following:
>
> 1. **Color Usage:** Use ONLY colors defined in Section 1. Do not introduce arbitrary hex values. If a new color is needed, add it to the Derived Colors table first.
> 2. **Component Conventions:** Follow the sizing, spacing, and border-radius conventions defined in Section 4. Do not deviate from the density model (h-9 rows, text-sm body, p-6 page padding).
> 3. **Layout Structure:** All pages must conform to the Application Shell structure in Section 3. No full-bleed layouts or custom navigation patterns.
> 4. **shadcn/ui Integration:** Use shadcn/ui primitives wherever available. Override via CSS variables per Section 2.3. Do not build custom components when a shadcn/ui equivalent exists.
> 5. **No Comments in Code:** Do not add explanatory comments to component code. The design system itself serves as documentation.
> 6. **Dark Mode:** This design system is **light-mode only**. Do not implement dark mode toggles unless explicitly instructed.
> 7. **This Document is Authoritative:** When this document conflicts with any other source, this DESIGN.md takes precedence.
