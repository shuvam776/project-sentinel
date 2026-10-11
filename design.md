# Sentinel — Design System & UI Specification

**Version:** 1.2 (MVP) — adds a Home page (§8E) and app refinements aligned with it; earlier revision: revised to a light work surface with dark navigation and dark player zone, modeled on the structure of Roboflow's Annotate screen (no purple anywhere)
**Audience:** AI coding agent implementing the frontend (Next.js, TypeScript, Tailwind CSS, React)
**Status:** Authoritative. Where this document specifies a value, use it exactly. Do not substitute your own colors, radii, spacing, copy patterns, or components. If something is not specified, choose the option that is most restrained and most consistent with an existing pattern here, and do not add new visual vocabulary.

---

## 0. How to read this document

- Sections 1–6 define the identity and tokens.
- Sections 7–9 define the shell, the screens, and the components.
- Sections 10–12 define behavior, responsiveness, accessibility, and data honesty.
- Sections 13–15 define architecture, prohibitions, and the final checklist.

**Backend assumptions.** The UI must not invent capabilities. The spec depends on a small set of capabilities that the API may or may not expose. Wherever this document says "if available", gate the UI on a capability flag (`capabilities.*`) delivered from the API or a config endpoint. Flags used:

| Flag | Meaning | If false |
|---|---|---|
| `capabilities.partialSearch` | Search can run against a video that is still indexing | Videos in `indexing` are excluded from search and the UI says so |
| `capabilities.detections` | Object detections with boxes are stored per sampled frame | Hide all detection UI; show only semantic matches |
| `capabilities.thumbnailSprites` | Timeline hover preview sprites exist | No hover thumbnails; timestamp tooltip only |
| `capabilities.storageStats` | API returns storage used | Hide storage row in Settings |
| `capabilities.processingOptions` | API accepts processing preferences (e.g. sampling rate) | Hide the Processing section in Settings |
| `capabilities.rename` | Videos can be renamed | Hide Rename |

Supported object classes (initially `person`, `vehicle`, `bag`) must be read from the API, never hard-coded in components.

---

## 1. Product design philosophy

Sentinel is an **instrument**, not a dashboard. Its job is to move a user from a question ("when did the white van arrive?") to the exact second of footage that answers it, and to let them verify that answer with their own eyes.

Five commitments follow from that:

1. **Footage is the hero.** Video frames are the only visually rich content in the product. Chrome is quiet so that frames, boxes, and timeline markers carry the color and attention.
2. **Evidence, not assertion.** The system never says "found". It says "matches", ranked, with the evidence shown (a detection, a similarity score) and the footage one click away. The UI is built to make verification fast, not to produce confidence.
3. **Two kinds of evidence, always distinguishable.** *Detections* (a model drew a box around a class of object in a sampled frame) and *semantic matches* (a frame's embedding is near the query's embedding) are different claims. They differ in shape, icon, label, and wording everywhere they appear, never in color alone.
4. **Density with order.** Rows by default; bordered cards only for items that move through states (the Library board) and for side panels. A fixed 4px grid, a narrow type scale, thin borders, monospaced numerics. Whitespace is used to group, never to fill.
5. **Never block the user.** Uploads and indexing are long-running. Every long operation is represented inline, in place, with a state that can be left and returned to.

**Tone of copy:** terse, literal, technical-adjacent but plain. Sentence case everywhere. No exclamation marks. No marketing language. No "Oops". Example: `Indexing failed at 00:41:12. Retry`, not `Something went wrong!`.

---

## 2. Design references and how they influence Sentinel

| Reference | Take | Do **not** take |
|---|---|---|
| **Roboflow** | The overall app structure: near-black left navigation, white work surface, light-gray column wells holding white bordered cards, underline tabs, outlined secondary buttons, count chips, thumbnail strips on cards, `Annotate →`-style text actions; detection boxes with class + confidence labels; model output treated as inspectable data | Its purple accent, workspace/project hierarchy, upsell buttons and lock badges, dataset-management metaphors |
| **TensorFlow Playground** | One focused interaction with immediate visible feedback; almost no chrome around the thing being manipulated (here: the query field and the player) | Playful palette, skeuomorphic controls |
| **Linear** | Compact rows, small type, strong hierarchy through weight and tone rather than size, keyboard-first behavior, quiet hover states | Its purple accent, command palette, issue-tracker vocabulary |
| **Vercel** | Precision: hairline borders, consistent radii, monospaced data, near-black surfaces, no decoration | Pure black/white contrast extremes, gradient hero treatments |

**Sentinel's own identity** comes from three decisions:
1. A **white work surface framed by near-black chrome** (navigation rail and the video player zone), with a single **teal-cyan** accent (never purple, violet, or indigo) used only for "this is the thing the model is pointing at / this is the current action" (primary buttons, active nav, detection boxes, the playhead-adjacent selection, focus rings).
2. A **shape language for evidence**: *square* = detection, *diamond* = semantic match. This appears in icons, timeline markers, and legend text.
3. **Monospaced instrument readouts** (timestamps, scores, durations) set in Geist Mono with tabular numerals, giving the product a measured, scientific feel without resorting to "hacker" tropes.

---

## 3. Brand and visual identity

- **Name treatment:** wordmark `Sentinel` in Geist Sans, 15px, weight 600, letter-spacing `-0.01em`, `text-primary`. Preceded by a 16×16 mark: an outline square 16×16, stroke `#46B5C9`, 1.5px, radius 2px, with a 6×6 solid `#46B5C9` square (radius 1px) centered. It reads as "a detection box with a subject inside it". No other logo graphics anywhere.
- **Surface model (light work surface, dark frame):**
  1. **Dark zones** — the left navigation rail and the player column on the Inspection page (stage, controls, timeline). They use the *dark token set* (§4.2) via a `data-zone="dark"` attribute that re-declares the same semantic CSS variables.
  2. **Work plane** — the page background (`bg-app`, white) holding toolbars, lists, and result rows. The header bar is also white.
  3. **Wells and cards** — `bg-well` (light gray) groups content (board columns, table headers, frame strips, panel sub-headers); `bg-surface` (white) cards with a 1px border sit on wells or on the work plane. Separation is by border and tone, not shadow.
- **Video stage** is pure `#000000`. It is the only pure black in the product and must stay visually distinct from every UI surface.
- **Elevation:** achieved with border color and tone (white card on gray well). Shadows are permitted only on floating layers (menus, popovers, toasts, dialogs) — one shadow token (`shadow-float`).
- **Gradients:** none, except a single functional gradient on the timeline hover scrim and the video bottom control scrim (a linear `transparent → rgba(0,0,0,0.65)` over the video itself, so controls remain legible over any frame).
- **Imagery:** the product shows only user video frames. No stock imagery, no illustrations, no decorative icons larger than 16px outside empty states (empty states use a 24px Lucide icon in `text-tertiary`).

### Theme decision

**Light work surface with dark navigation and dark player zone; no global theme toggle in the MVP.**
Rationale: (1) dense lists, metadata, and settings read best on a white surface with gray wells and thin borders (the pattern in the Annotate reference); (2) video inspection is a low-luminance task, so the player column is a dark zone that reduces glare and keeps bounding boxes and markers legible; (3) the dark rail frames the application and separates navigation from work. Every color is a semantic CSS variable, declared once for the light default and once for `[data-zone="dark"]`. **Do not build a theme toggle. Set `color-scheme: light` on `<html>` and `color-scheme: dark` on dark zones.** Portaled layers (menus, tooltips, dialogs, toasts) render with the light tokens even when opened from a dark zone.

---

## 4. Exact color tokens

All colors are CSS custom properties. The **light set** is declared on `:root`; the **dark set** is declared on `[data-zone="dark"]` using the *same names*, so a component never knows which zone it is in. Tailwind maps semantic names; components never use raw HEX. **No purple, violet, indigo, or magenta anywhere** (accent, selection, focus, links, charts, empty states).

### 4.1 Light set (default: work plane, header, panels, menus, dialogs)

**Neutrals (cool, very slightly blue)**

| Token | HEX | Use |
|---|---|---|
| `--bg-app` | `#FFFFFF` | Page / work-plane background, header bar |
| `--bg-well` | `#F6F7F9` | Board column wells, table header row, frame-strip wells, panel sub-headers, dropzone |
| `--bg-surface` | `#FFFFFF` | Cards, panels, table body, inputs, side panel |
| `--bg-surface-inset` | `#F6F7F9` | Thumbnail placeholders, ID/code wells, skeleton base, Kbd |
| `--bg-surface-raised` | `#F1F3F5` | Count chips, skeleton blocks, selected segmented option |
| `--bg-hover` | `#F1F3F5` | Hover for rows, ghost buttons, menu items |
| `--bg-pressed` | `#E8EBEE` | Pressed state of the above |
| `--bg-float` | `#FFFFFF` | Menus, popovers, tooltips, dialogs, toasts (with `shadow-float`) |
| `--bg-chrome` | `#0D1117` | Navigation rail (in the dark set it is the rail itself) |
| `--bg-video-stage` | `#000000` | Player stage only |
| `--border-subtle` | `#E8EBEE` | Row dividers, panel inner dividers |
| `--border-default` | `#D9DEE3` | Card, input, button, and panel outlines |
| `--border-strong` | `#BAC2CB` | Hover borders, dashed dropzone, drag target |
| `--text-primary` | `#12161B` | Titles, body, values |
| `--text-secondary` | `#4B5662` | Descriptions, metadata, labels |
| `--text-tertiary` | `#66717D` | Placeholders, captions, units, "3 months ago" |
| `--text-disabled` | `#A3ACB5` | Disabled controls (exempt from contrast) |

**Accent (Scan teal)**

| Token | HEX | Use |
|---|---|---|
| `--accent` | `#0B7285` | Primary button bg, active tab underline, selected-row bar, focus ring, detection ticks on the timeline |
| `--accent-hover` | `#0A6273` | Primary hover |
| `--accent-active` | `#095564` | Primary pressed |
| `--accent-subtle` | `#E6F3F6` | Selected row / selected toggle background |
| `--accent-border` | `#A9D4DD` | Border on accent-subtle surfaces |
| `--accent-fg` | `#FFFFFF` | Text/icons on solid accent |
| `--accent-text` | `#0A6273` | Accent-colored text, active tab label, links |

**Semantic**

| Role | Solid (dots, icons) | Subtle bg | Border | Text |
|---|---|---|---|---|
| Success (`ready`) | `#1F8A4C` | `#E7F5EC` | `#B3DEC2` | `#17693A` |
| Warning (`partial`, stale) | `#B7791F` | `#FBF3DF` | `#EBCF8E` | `#8A5A0B` |
| Danger (`failed`, destructive) | `#D14336` | `#FCEBE9` | `#F0B4AE` | `#B02E22` |
| Processing (`queued`, `indexing`, `uploading`) | `#2F6FB5` | `#E8F0FA` | `#B4CDE8` | `#245A94` |

Danger button extras: `--danger-fg #FFFFFF`, `--danger-hover #BC382C`, `--danger-active #A52F24`, `--danger-pressed-bg #F9D9D5` (outline variant pressed).

Semantic colors are used **only** for status (dot, small icon, inline alert). Never for decoration, metric cards, or charts.

### 4.2 Dark set (`[data-zone="dark"]`: navigation rail and the Inspection player column)

| Token | HEX | Token | HEX |
|---|---|---|---|
| `--bg-app` | `#0E1114` | `--border-subtle` | `#1F252B` |
| `--bg-chrome` / rail bg | `#0D1117` | `--border-default` | `#2A3138` |
| `--bg-surface` | `#14181C` | `--border-strong` | `#3A434C` |
| `--bg-well` | `#0B0E10` | `--text-primary` | `#ECEFF2` |
| `--bg-surface-inset` | `#0B0E10` | `--text-secondary` | `#A3ACB5` |
| `--bg-surface-raised` | `#1A1F24` | `--text-tertiary` | `#7F8A94` |
| `--bg-hover` | `#1A1F24` | `--text-disabled` | `#566069` |
| `--bg-pressed` | `#20262C` | `--bg-float` | `#1A1F24` |
| `--accent` | `#46B5C9` | `--accent-hover` | `#5CC6D9` |
| `--accent-active` | `#34A0B4` | `--accent-subtle` | `#10272C` |
| `--accent-border` | `#2A6672` | `--accent-fg` | `#05181C` |
| `--accent-text` | `#6FCADB` | | |

Semantic on dark: success `#6FBF73` (subtle `#13241A`, border `#2C5A32`, text `#8BD18F`); warning `#E5B54A` (`#2A2210`, `#6B5518`, `#EDC76B`); danger `#EF6B5E` (`#2C1614`, `#7A2F28`, `#F58A80`; `--danger-fg #2A0A07`, `--danger-hover #F4857A`, `--danger-active #E0594C`); processing `#7DAFE0` (`#12202D`, `#2D4F6E`, `#9CC3EA`).

### 4.3 Video overlay colors (identical in both sets; drawn over footage)

| Token | Value | Use |
|---|---|---|
| `--overlay-scrim` | `rgba(13,17,23,0.50)` | Dialog backdrop |
| `--overlay-chip` | `rgba(0,0,0,0.78)` | Timestamp chips and labels placed over frames/thumbnails |
| `--overlay-ctrl-scrim` | `linear-gradient(to top, rgba(0,0,0,0.65), transparent)` | Player control scrim |
| `--box-stroke` | `#46B5C9` | Detection boxes and box labels (always the on-dark teal because they sit on footage) |
| `--box-stroke-dim` | `rgba(70,181,201,0.70)` | Unselected boxes |
| `--box-fill-selected` | `rgba(70,181,201,0.12)` | Selected box fill |
| `--match-marker` | `var(--text-primary)` | Semantic match markers on the timeline (neutral, deliberately not accent) |
| `--shadow-float` | Light: `0 8px 24px rgba(13,17,23,0.14), 0 0 0 1px #D9DEE3` · Dark zone: `0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px #2A3138` | Floating layers |

Wherever this document says a box or box label uses `accent`, it means `--box-stroke`, not the zone's `--accent`.

### 4.4 Contrast verification (must hold)

| Pair | Ratio (approx.) |
|---|---|
| `text-primary` on `bg-app` / `bg-surface` (light) | > 17:1 |
| `text-secondary` on white | ≈ 7.5:1 |
| `text-tertiary` on white / on `bg-well` | ≈ 5.0:1 / ≈ 4.6:1 (the floor for meaningful text) |
| `accent-fg` on `accent` (light) | ≈ 5.6:1 |
| `accent-text` on white | ≈ 7:1 |
| Semantic `*-text` on `*-subtle` (light) | ≥ 5:1 |
| White text on solid danger | ≈ 4.6:1 |
| Dark set: `text-primary` / `text-secondary` / `text-tertiary` on `bg-surface` | > 15:1 / > 7:1 / ≈ 5:1 |
| Focus ring, input outline on focus, and `border-strong` hover vs adjacent surface | ≥ 3:1 |

Resting input/button outlines use `border-default` (decorative-adjacent because labels and fills identify the control); on hover `border-strong`; on focus `accent`.

### 4.5 State color rules (applied uniformly)

| State | Treatment |
|---|---|
| Hover (rows, ghost controls, menu items) | Background → `bg-hover` |
| Pressed | Background → `bg-pressed`; primary → `accent-active` |
| Selected | `accent-subtle` bg + 2px `accent` left bar (rows) or `accent-border` outline (toggles) |
| Focus-visible | `outline: 2px solid var(--accent); outline-offset: 2px` on everything focusable. Never remove. |
| Disabled | Text `text-disabled`, bg `bg-well` (or unchanged), `cursor: not-allowed`, no hover change |

---

## 5. Typography tokens

**Families** (load via `next/font/google`, `display: swap`):
- **Sans:** `Geist` → fallback stack: `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Mono:** `Geist Mono` → fallback stack: `"Geist Mono", ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`

Global: `font-feature-settings: "cv11", "ss01"` is **not** to be used. Use `-webkit-font-smoothing: antialiased`. Base font size is **14px** (compact but readable, matching the reference's density). `html { font-size: 16px }` is retained so `rem` works for accessibility scaling; express type tokens in `px` converted to `rem` (14px = 0.875rem).

### Type scale

| Token | Size / Line | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|
| `display` | 24 / 32 | 600 | -0.02em | Sans | Empty-state headline only (max one per page) |
| `page-title` | 20 / 28 | 600 | -0.01em | Sans | Header bar title (h1) |
| `section-title` | 14 / 20 | 600 | 0 | Sans | Panel headers, settings sections |
| `body` | 14 / 20 | 400 | 0 | Sans | Default text |
| `body-strong` | 14 / 20 | 500 | 0 | Sans | Row primary text (video name, result title) |
| `body-lg` | 15 / 22 | 400 | 0 | Sans | Descriptions at top of pages, dialogs |
| `caption` | 12 / 16 | 400 | 0 | Sans | Secondary metadata, helper text, errors |
| `label` | 11 / 16 | 500 | 0.04em, uppercase | Sans | Table column headers, panel micro-headers (use sparingly) |
| `query` | 18 / 28 | 400 | 0 | Sans | Search field text |
| `mono-data` | 12 / 16 | 400 | 0 | Mono, tabular | Timestamps, scores, durations, sizes, IDs |
| `mono-data-strong` | 12 / 16 | 500 | 0 | Mono, tabular | Selected/active timestamps |
| `mono-player` | 14 / 16 | 400 | 0 | Mono, tabular | Player current time / duration |
| `mono-chip` | 11 / 14 | 500 | 0 | Mono, tabular | Chips over video frames and bounding-box labels |

### Marketing-only type (Home page `/` only; never inside the app)

| Token | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| `hero` | 56 / 60 (≤ 640px: 36 / 40) | 600 | -0.03em | Home h1 only |
| `h2-marketing` | 36 / 42 (≤ 640px: 28 / 34) | 600 | -0.02em | Home section headings |
| `lede` | 18 / 28 | 400 | 0 | Sub-headline and section intros, max 620px wide |
| `step-index` | 12 / 16 Mono | 500 | 0.04em | `01`, `02`, `03` step markers |

Everything else on the Home page uses the app tokens above.

### Numeric typography rules
- **All** timestamps, durations, scores, confidences, counts-in-data-columns, file sizes use Mono with `font-variant-numeric: tabular-nums`.
- Numbers are right-aligned in columns; timestamps left-aligned in lists where they begin a line.
- Units (`MB`, `fps`, `s`) are `text-tertiary`, separated by a thin space (`U+2009`) from the value. The value stays `text-primary` or `text-secondary`.
- Never display more than 2 decimals for scores, 1 decimal for sub-second timestamps.

Hierarchy comes from **weight, color tone (primary vs secondary vs tertiary), and position** — never from large type. The largest type in the app (24px) appears only in empty states; page titles are 20px.

---

## 6. Spacing, sizing, and layout tokens

### 6.1 Spacing scale (base 4px)

`0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64` px.
Tailwind mapping: extend `spacing` with `0.5=2px, 1=4px, 1.5=6px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px, 10=40px, 12=48px, 16=64px`. Do not use values outside this scale.

### 6.2 Layout constants

| Token | Value |
|---|---|
| Sidebar width (expanded) | 216px |
| Sidebar width (collapsed rail) | 52px |
| Header height | 48px |
| Mobile bottom nav height | 56px (+ safe-area inset) |
| Page padding (≥ 768px) | 24px horizontal, 24px top, 32px bottom |
| Page padding (< 768px) | 16px horizontal, 16px top |
| Library max content width | 1280px |
| Search max content width | 960px (centered in work plane) |
| Inspection | Fluid, no max width |
| Settings max content width | 720px |
| Panel header height | 40px |
| Panel padding | 16px (12px in dense side panel) |
| Component gap (inline) | 8px |
| Component gap (stacked groups) | 16px; between sections 32px |
| Row height — library | 64px |
| Row height — result | auto, min 115px (12px vertical padding) |
| Row height — side-panel list item | 56px |
| Inspection side panel width | 360px default; 320px at 1024–1279px; user-resizable 320–480px at ≥ 1280px |

### 6.3 Control sizes

| Size | Height | Horizontal padding | Font | Icon |
|---|---|---|---|---|
| `sm` | 28px | 10px | 12px | 14px |
| `md` (default) | 32px | 12px | 14px | 16px |
| `lg` | 40px | 16px | 14px | 16px |
| Search field | 56px | 20px | 18px (`query`) | 20px |

On `(pointer: coarse)` every interactive control has a minimum **44×44px** hit area (use padding/pseudo-element expansion; the visible size may stay smaller). Desktop minimum hit area: 28×28px (exceeds WCAG 2.2 AA 24px).

### 6.4 Border radii (exactly three, plus full)

| Token | Value | Applies to |
|---|---|---|
| `radius-xs` | 2px | Detection boxes, timeline markers, chips over video, kbd keys, progress bars |
| `radius-sm` | 6px | Buttons, inputs, thumbnails, class filter toggles, count chips, list-row selection highlights |
| `radius-md` | 8px | Cards, board columns, panels, dropdown menus, popovers, dialogs, toasts, dropzone |
| `radius-full` | 9999px | Status dots, toggle switch track/thumb, radio. **Nothing else.** |

No other radii. Tables/list containers use `radius-md` on the outer container only; inner rows are square.

### 6.5 Borders and dividers
- All borders are **1px**. 
- Panel outline: `border-default`. Row dividers: `border-subtle`. Header/sidebar edges: 1px `border-subtle`.
- No double borders: when a bordered container is adjacent to another, use the shared edge once.
- Section dividers within a page: a 1px `border-subtle` line with 24px margin above and below, only when grouping is not clear from spacing.

### 6.6 Elevation
- `shadow-float` (§4.3) — menus, popovers, toasts, dialogs only. Cards, columns, and panels have **no** shadow.
- Nothing else has a shadow.

### 6.7 Z-index scale
`base 0 · sticky 10 · overlay-on-video 20 · menu/popover 40 · dialog 50 · toast 60`.

### 6.8 Motion tokens
| Token | Value |
|---|---|
| `duration-fast` | 80ms (hover color) |
| `duration-base` | 120ms (menus, tab underline, focus) |
| `duration-slow` | 200ms (toast enter, panel resize snap, row collapse) |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |

### 6.9 Breakpoints
`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536` (Tailwind defaults). Layout shifts occur at `md`, `lg`, `xl` only.

---

## 7. Global application shell

### 7.1 Structure

```
┌──────────┬──────────────────────────────────────────────┐
│ Sidebar  │ Header (48px): h1 / breadcrumb      [actions] │
│ 216px    ├──────────────────────────────────────────────┤
│ chrome   │ Main (work plane)                             │
│          │   page content (scrolls independently)        │
│          │                                               │
└──────────┴──────────────────────────────────────────────┘
```

- The shell is a CSS grid: `grid-template-columns: var(--sidebar-w) 1fr; grid-template-rows: 48px 1fr; height: 100dvh`.
- Only `<main>` scrolls (`overflow-y: auto`). Sidebar and header are fixed in place. On the Inspection page the main area does **not** scroll at ≥ `lg`; panels scroll internally.

### 7.2 Sidebar

- `data-zone="dark"`, background `bg-chrome` (`#0D1117`), right border 1px `border-subtle`. Mirrors the Annotate reference's dark left rail.
- Top (height 48px, aligned with header): mark + wordmark, left padding 16px. 
- Nav list (padding 8px, gap 2px), items: **Library**, **Search**. Pinned to the bottom (above bottom padding 8px): **Settings**. No other nav items. No user avatar, no account menu, no "upgrade", no help widget in the MVP.
- Nav item: height 36px, padding 0 10px, radius 6px, icon 16px + 8px gap + label (14px / 500). Icons (Lucide): Library → `Film`, Search → `Search`, Settings → `Settings2`.
- States:
  - Default: icon and label `text-secondary`.
  - Hover: bg `bg-hover`, text `text-primary`.
  - **Active (current route):** **outlined** item as in the reference: bg `accent-subtle`, 1px `accent-border` outline, text `text-primary`, icon `accent` (on-dark teal). No left bar. Active is determined by route prefix (`/videos/*` activates **Library**, because inspection is reached from and returns to the library or search; the breadcrumb clarifies which).
  - Focus-visible: standard 2px focus ring.
- Library item shows a count badge **only** when videos are being processed: a 6px `processing` dot with `aria-label="N videos processing"` (no number text). Nothing else is badged.

### 7.3 Header (48px)

- Background `bg-app` (white), bottom border 1px `border-subtle`, padding 0 24px (16px at < md).
- **Left:** on top-level routes, a 20px Lucide page icon in `text-secondary` (Library `Film`, Search `Search`, Settings `Settings2`), 12px gap, then the page title (`page-title`, 20px). On detail routes, a breadcrumb replaces the title: items 14px `text-secondary`, current item `text-primary` 500, separator `ChevronRight` 12px `text-tertiary`, gap 6px. Long segments truncate with ellipsis at `max-w 280px`, full text in `title`/tooltip. The breadcrumb is `<nav aria-label="Breadcrumb"><ol>…`, the last item has `aria-current="page"`, and the page's `<h1>` is the last item (visually styled as breadcrumb).
- **Right:** page-level actions (see per-screen). Maximum **one** primary button in the header.

Breadcrumb rules by route:
| Route | Header content |
|---|---|
| `/` | No app shell: the Home page uses the marketing layout (§8E) |
| `/library` | Title `Library` · actions: **Upload video** (primary) |
| `/search` | Title `Search` · no actions |
| `/videos/[id]` (from library or direct) | `Library / {video name}` · actions: overflow menu (`…`) |
| `/videos/[id]?q=…` (from search) | `Search / “{query}” / {video name}` — `Search` and `“{query}”` link back to `/search?q=…` preserving filters |
| `/settings` | Title `Settings` |

The origin is carried in the URL (`?q=` present ⇒ came from search). Do not use client-only history state.

### 7.4 Main content container
- `padding` per §6.2, `max-width` per route, `margin-inline: auto` for Library/Search/Settings (left-aligned content block within max width on very wide screens: use `margin-inline: auto` only for Search; Library and Settings align left to the page padding for scan consistency). Inspection is edge-to-edge within the main area with 0 padding on the player column and 0 padding on the panel.
- A page may start with a one-line description (`body-lg`, `text-secondary`, max-width 640px) directly under the header with 16px bottom margin. Descriptions are optional and exist only on Library and Settings.

### 7.5 Responsive shell behavior
| Width | Sidebar | Header |
|---|---|---|
| ≥ 1024 | Expanded 216px | Standard |
| 768–1023 | Collapsed rail 52px: icons only, labels as tooltips (right side, 400ms delay), wordmark hidden (mark only) | Standard |
| < 768 | Hidden. **Bottom nav** (56px) with the three items, icon above 11px label; active item uses accent icon + `text-primary` label, no background | Title/breadcrumb truncates; actions collapse into icon buttons |

No hamburger drawers. No sidebar toggle in the MVP (the rail/expanded split is breakpoint-driven only).

---

## 8. Screen-by-screen specifications

### A. Video Library (`/library`)

**Purpose:** upload videos, see processing state, manage assets.

**Layout recommendation: a dense list (table-like rows), not a card grid.**
Rationale: the primary tasks are scanning names, comparing statuses, and acting on specific assets. Rows align name, state, duration, and date in scannable columns, make sorting meaningful, and accommodate a progress state without disrupting layout. Thumbnails stay present (96×54) for visual recognition. A grid is explicitly out of scope for the MVP.

#### Page structure (top to bottom)
1. Header: title `Library`, action **Upload video** (primary, `md`, icon `Upload`).
2. Description (one line): `Upload recorded footage. Videos become searchable once indexed.`
3. Toolbar (height 32px, margin-bottom 12px):
   - Filter-by-name input (`Search` icon, placeholder `Filter videos`, width 280px, client-side substring filter, `/` is **not** bound here — `/` belongs to Search page).
   - Status dropdown: `All statuses` | `Ready` | `Indexing` | `Failed` (single-select menu).
   - Right-aligned: Sort dropdown rendered as the reference's white outlined button `Sort by  Newest` (`Sort by` in `text-secondary`, value in `text-primary` 500, `ChevronDown`) — options `Newest`, `Oldest`, `Name A–Z`, `Duration (longest)`, `Status`.
   - Result count on far right, `caption`, `text-tertiary`: `12 videos`.
4. Video list container (`radius-md`, 1px `border-default`, bg `bg-surface`).
5. “Load more” row if > 50 videos (see Pagination).

#### Views: `Grid` (default), `List`, and `Board`

Directly under the header (above the description/toolbar) sits an underline tab strip, as in the Annotate reference: `Grid` (icon `LayoutGrid`), `List` (icon `List`), `Board` (icon `Columns3`). The choice persists in prefs (Settings → Display). All three read the same data. **Grid** is the default because footage is recognized by its picture: it is a thumbnail-forward media library, like the video grids in video-search products. **List** is the scan/sort view (columns below). **Board** shows the processing pipeline. There is no `Insights` tab.

**Grid view (default)**
- CSS grid `repeat(auto-fill, minmax(264px, 1fr))`, gap 16px.
- `VideoCard` (variant `grid`): bg `bg-surface`, 1px `border-default`, `radius-md`, `overflow: hidden`, no shadow. Hover: border `border-strong`. Focus-visible: standard ring. The whole card links to `/videos/[id]` (inert while uploading/queued).
- Thumbnail: full card width, 16:9, `object-fit: cover`, placeholder `bg-surface-inset` + `Film` icon. Bottom-right chip: duration (`mono-chip` on `overlay-chip`). Indexing videos get a 3px `processing` progress line along the thumbnail's bottom edge. Top-right on hover/focus (always visible on touch): a 28×28 `radius-sm` `overlay-chip` icon button `Search` (tooltip `Search this video`), only for searchable videos.
- Text block (padding 12px, gap 4px): line 1 `body-strong` name (truncate) with the overflow `…` icon button right-aligned; line 2 `StatusIndicator` + its sub-line; line 3 `caption` `text-tertiary` upload date.
- Inline delete confirmation replaces the text block (thumbnail dims to 60% opacity); same copy and focus rules as list rows.
- Uploading rows appear first in the grid as cards with a `bg-surface-inset` thumbnail slot, filename, `Uploading 42%`, and a 3px progress line.

**List view** uses the column table described under *Column structure* below.

**Board view**
- Four columns in a CSS grid (`repeat(4, minmax(260px, 1fr))`, gap 16px; horizontal scroll inside the board container below 1100px). Columns: **Uploading** (uploading + queued), **Indexing** (indexing), **Ready** (ready), **Needs attention** (failed + partial).
- Column = well: bg `bg-well`, `radius-md`, padding 12px, no border. Header row (36px): column name (`section-title`), a count chip (`mono-chip`, bg `bg-surface-raised`, `radius-sm`, padding 1px 6px, `text-secondary`), and at the far right a help icon (`CircleHelp` 16px, `text-tertiary`) whose tooltip states exactly what the column holds (e.g. `Videos still being indexed. Search may be incomplete.`). Per-column icon actions are not added.
- Cards (`VideoCard`): bg `bg-surface`, 1px `border-default`, `radius-md`, padding 12px, gap 8px between cards. Hover: border `border-strong`. Focus-visible: standard ring. Entire card is a link to `/videos/[id]` (inert while uploading/queued).
  - Row 1: video name (`body-strong`, truncate) left; right: duration chip (`mono-chip` in a `bg-surface-raised` `radius-sm` chip with a 12px `Film` icon, e.g. `1:02:14`), mirroring the image-count chip in the reference.
  - Row 2: one 96×54 thumbnail (not a strip; Sentinel has one thumbnail per video) plus `StatusIndicator` and its sub-line (stage, indexed range).
  - Indexing cards show a 4px progress bar (`radius-xs`) across the card between rows 1 and 2, track `border-subtle`, fill `processing`. Ready cards show none.
  - Footer row: `caption` `text-tertiary` relative upload time (`3 months ago`, full date in `title`) left; right-aligned text action `Search →` (`body`, `text-primary` 500, `ArrowRight` 14px; visible only for searchable videos) — equivalent of `Annotate →`. Failed cards show `Retry` instead.
- Empty column: centered in the well, 24px Lucide icon (`Upload`/`Loader`/`CircleCheck`/`TriangleAlert`) (bare, no disc or circle) in in `text-tertiary`, then one `body` `text-tertiary` line, centered: Uploading `Nothing uploading.`; Indexing `No videos are being indexed.`; Ready `Videos appear here once indexed.`; Needs attention `No failed videos.`
- Columns scroll with the page (no inner scroll), each card list unpaginated up to 25 then `Show more` ghost button.
- Toolbar on Board: only the `Sort by` control (white secondary button reading `Sort by` in `text-secondary` followed by the value in `text-primary` 500, e.g. `Sort by  Newest`) and the name filter. The status filter is hidden (columns already encode status).
- Delete and row actions: card overflow `…` appears top-right on hover/focus (replaces the duration chip position while open); inline delete confirmation transforms the card in place (same copy and focus rules as list rows).
- Responsive: < 768px, columns stack vertically as collapsible sections (header toggles, `aria-expanded`); each card uses the two-line mobile layout.

#### Column structure (≥ 1024px)
| Column | Width | Content |
|---|---|---|
| Thumbnail | 96px (+ 16px gutter) | 96×54 (16:9), `radius-sm`, 1px `border-subtle`; `object-fit: cover`. Fallback: `bg-surface-inset` with `Film` icon 16px `text-tertiary` |
| Name | flex (min 240) | Line 1: `body-strong` name (truncate). Line 2: `caption` `text-tertiary` original filename if different from name, otherwise resolution + fps (`1920×1080 · 25 fps`) in mono-data |
| Status | 200px | `StatusIndicator` (dot + text) and, when indexing, a sub-line (see §9.4) |
| Duration | 88px, right-aligned | `mono-data` `1:02:14` |
| Size | 80px, right-aligned, hidden < xl | `mono-data` `1.24 GB` |
| Uploaded | 120px, right-aligned | `caption` relative if < 7 days (`2 h ago`, `Yesterday`) else `12 Mar 2026`; full ISO in `title` |
| Actions | 72px, right | Icon button `Search` (visible only for searchable videos; tooltip `Search this video`) + overflow `…` |

Header row of the list: `label` style, 32px high, `text-tertiary`, bg `bg-surface`, bottom border `border-default`. Sortable headers are not needed — the Sort dropdown handles it. Column headers are non-interactive.

At < 1024: Size and Uploaded hide; at < 768: layout becomes two-line rows (thumbnail 72×40, name, then status + duration on line 2, overflow menu on the right).

#### Row behavior
- The entire row is a link to `/videos/[id]` (except while `uploading`/`queued`, where it is inert). The row has `role="row"` semantic if implemented as a table; prefer a real `<table>` for the desktop list for correct semantics, with the name cell holding the primary `<a>`.
- Hover: bg `bg-surface-raised`. Focus-visible: row outline 2px accent inset (`outline-offset: -2px`).
- Pressing `Enter` on a focused row opens it. `Delete` key does **not** delete (too risky); deletion is menu-only.
- Row actions (overflow menu, in this order): `Open`, `Search this video` (if searchable), `Rename` (if `capabilities.rename`), divider, `Retry indexing` (failed only), `Cancel` (uploading/queued only), `Delete…` (danger text).

#### Upload

- **Entry points:** header **Upload video** button (opens file picker, `multiple`), the empty-state dropzone, and **dropping files anywhere on the Library page**.
- **Accepted types:** read from API config (default `video/mp4, video/quicktime, video/webm, video/x-matroska`). Show accepted extensions and max size in the empty-state dropzone helper text, sourced from config, never hard-coded.
- **Drag-and-drop behavior:** when a file drag enters the window over the Library page, the list container (or empty-state dropzone) gets a `border-strong` **dashed** 1px outline (`border-style: dashed`), bg `accent-subtle`, and a centered `body-strong` label `Drop to upload`. No full-screen overlay, no blur. On drop: rows appear instantly. Invalid files (wrong type or too large) produce one **inline row** in a failed state (`Not a supported video type`/`Exceeds 2 GB limit`), not a toast, and are dismissible with an `X`.
- **Upload row (pinned to the top of the list while active):**
  - Thumbnail slot: `bg-surface-inset` with `Upload` icon (processing color).
  - Name = filename. Sub-line: `Uploading · 118 MB of 280 MB` (mono for numbers).
  - Status: `Uploading 42%` (processing dot).
  - A 2px progress line along the row's bottom edge (full row width, `processing` color on `border-subtle` track), updating width only.
  - Actions: `X` icon button `Cancel upload`.
  - Concurrency: 2 uploads at a time; the rest show `Waiting to upload`.
  - Leaving the page during upload: a `beforeunload` native prompt. Navigating inside the app keeps uploads running (uploads are held in global client state, not page-local state).
- **After upload completes:** the row transitions in place from `Uploading` → `Queued` → `Indexing` (same row, same position; the server record replaces the optimistic one by id). No page reload.

#### States of a video record
(Full definitions in §12.) In Library, each state renders:

| State | Status cell | Sub-line | Row actions |
|---|---|---|---|
| `uploading` | `● Uploading 42%` (processing) | bytes uploaded / total | Cancel |
| `queued` | `● Queued` (processing) | `Waiting for indexer` | Cancel, Delete |
| `indexing` | `● Indexing 38%` (processing, dot pulses) | Stage name: `Extracting frames`, `Detecting objects`, `Computing embeddings` + `00:24:10 of 01:02:14` in mono | Open, Search (if `partialSearch`), Delete |
| `ready` | `● Ready` (success) | — (or `Indexed 3,402 frames` in `text-tertiary` mono, if provided) | All |
| `partial` | `● Partially indexed` (warning) | `Indexed to 00:41:12. Frames after this are not searchable.` + inline `Retry` link | All + Retry |
| `failed` | `● Failed` (danger) | Short reason (`Unsupported codec`, `Indexer error`) + inline `Retry` link; technical detail in tooltip/expandable | Open (if playable), Retry, Delete |

Indexing rows also show a **2px progress line** on the row's bottom edge (`processing` color). Ready rows have none.

#### Empty state (no videos)
Replaces the list; the toolbar is hidden. A single dropzone-shaped panel (full content width, min-height 280px, `radius-md`, 1px dashed `border-strong`, bg `bg-well`):
- 24px `Upload` icon, `text-tertiary`
- `display` headline: `Upload your first video`
- `body-lg` `text-secondary`: `Sentinel indexes footage so you can search it in plain language.`
- Primary button `Choose files` (the only primary in view; the header Upload button is hidden in this state to avoid two competing primaries)
- `caption` `text-tertiary`: `or drag files here · MP4, MOV, WebM, MKV · up to 2 GB` (values from config)
- Nothing else. No sample videos, no illustration, no feature tour.

#### Filtered empty state
`No videos match “{filter}”` with a `Clear filter` ghost button. Inline in the list container, height 120px, centered, `body` `text-secondary`.

#### Delete confirmation (inline, no modal)
Triggered from `Delete…` in the row menu. The row **transforms in place** (height unchanged):
- Left: warning icon (`Trash2`, danger), text `Delete “{name}”?` (`body-strong`), sub-line `caption`: `Removes the video, its thumbnails, and all indexed search data. This can't be undone.`
- Right: `Cancel` (secondary, `sm`; focus moves to `Cancel` on open so Enter never deletes by accident) and `Delete` (destructive solid: bg `danger`, text `danger-fg`, `sm`).
- Row bg `danger-subtle`, 2px `danger` left bar.
- `Esc` cancels. Clicking elsewhere does not dismiss (explicit choice required) but starting another row's delete cancels this one.
- On confirm: the button shows a spinner and `Deleting…`; the row collapses (height → 0, 200ms) on success; a toast `Deleted “{name}”` appears (no undo, since deletion is permanent). On failure: row returns to normal with an inline danger caption `Couldn't delete. Retry` and a toast is **not** used.
- Deleting a video that is `indexing` additionally says `Indexing will stop.`

#### Pagination
Load 50 records per request. If more exist, a full-width ghost button row `Load 50 more` (centered, 40px) appears at the list's bottom with `caption` `Showing 50 of 214`. No infinite scroll (it breaks keyboard flow and footer reachability). Sorting and filtering are server-side when the total exceeds the loaded set; otherwise client-side.

#### Polling
While any video is `uploading/queued/indexing`, refresh the list every 2s (back off to 5s after 2 minutes). Use conditional updates so rows don't flicker. Pause polling when the tab is hidden.

---

### B. Video Search (`/search`) — the core screen

**Goal:** query → relevant footage in the fewest interactions. A typical successful path is: type → `Enter` → press `↓` → `Enter` (opens footage at the match). No required filters, no panels, no extra clicks.

#### Page structure
All content in a single 960px column, left padding aligned to the query field. There is **no hero**. The query field sits 24px below the header at all times (before and after searching) so the page does not jump when results arrive.

```
Header: Search
─────────────────────────────────────────────
[ 🔍  white van near the entrance          ⏎ Search ]   ← 56px field
 Scope: All ready videos (3) ▾    Class:  [□ Person] [□ Vehicle] [□ Bag]
─────────────────────────────────────────────
 [partial-indexing notice, if applicable]
 12 matches · ranked by visual similarity            Sorted: Best match ▾
─────────────────────────────────────────────
 #1  [frame 208×117]  Lobby-cam-03   00:12:41 – 00:12:48
                      ▢ Detected  vehicle ×1   conf 0.91             0.31
                      ◇ Frame match                                 similarity
 #2  …
```

#### Query field
- 56px high, `radius-sm`, bg `bg-surface` (white), 1px `border-default`, `query` type.
- Left: `Search` icon 18px `text-tertiary`. Right inside the field: a **primary** `Search` button (`sm`, 28px) with `Kbd` `⏎` inside the button's right side (hidden when the field is empty, and the button is disabled when the query has < 2 non-space chars).
- Placeholder: `Describe what to find, e.g. “person carrying a backpack”`.
- Multi-line is **not** supported; `Enter` always submits. `Shift+Enter` does nothing.
- Hover: border `border-strong`. Focus: border `accent`, the border becomes `accent` and the global 2px accent outline (offset 2px) is applied. Both are visible and non-conflicting.
- Clear button (`X`, 16px, ghost) appears at the right when text exists, before the Search button; `aria-label="Clear query"`.
- Search is **submit-based**, not as-you-type (each search runs model inference). No debounce.
- `/` focuses the field from anywhere on the page (unless typing in another input). `Esc` while focused: clears if non-empty; second `Esc` blurs.
- `↓` while the field is focused and results exist moves focus to the first result.
- Submitted query is written to the URL (`/search?q=…&videos=…&classes=…`) with `router.replace` for refinements (keeps back-button sane) and `router.push` for the first query from an empty state. Landing on a URL with `q` runs the search.

#### Scope and class filters (single compact row, 32px, 12px below the field)
- **Scope**: dropdown button `Scope: All ready videos (3) ▾`. Menu: checkable list of videos (name + status dot), `All ready videos` at top. Videos that are `indexing` are listed with `Indexing` in `text-tertiary`; if `capabilities.partialSearch` is false they are disabled with the reason `Not searchable until indexing completes`. Failed videos are not listed.
- **Class filters**: toggle buttons (`sm`, 28px, `radius-sm`) rendered from API classes. Icon (Lucide `User`, `Car`, `Briefcase`/`Backpack`) 14px + label. Default: outlined `border-default`, `text-secondary`. Hover: `bg-surface-raised`. **Pressed/selected:** bg `accent-subtle`, border `accent-border`, text `accent-text`, icon `accent`. Disabled (no results possible for this class in scope, optional): `text-disabled`. Hidden entirely if `capabilities.detections` is false.
- Class filters mean: **restrict results to frames in which the detector found this class** (OR across selected classes). Include a tooltip: `Only frames where a detector found a {class}. Combined with your query.` Selecting/deselecting a class re-runs the search immediately (if a query exists) because it's a cheap re-rank/filter; the results area shows the loading state.
- A trailing text button `Clear filters` (ghost, `caption`) appears only when any filter differs from default.

No other filters (no date range, no confidence slider, no resolution) in the MVP.

#### Idle state (no query yet)
Below the filters, 24px margin, a compact two-part block — **not** a hero:
1. `label` `Try`, then up to three clickable example queries stacked as single-line ghost rows (32px each, `body`, `text-secondary`, hover `bg-surface`), each prefixed by `ArrowUpRight` 14px. Clicking an example fills the field **and submits**. Examples are static configured strings: `person carrying a bag`, `white van`, `red car near a building`.
2. If recent queries exist (stored locally, max 5, most recent first): `label` `Recent`, rows with `History` icon, each clickable, with a ghost `X` revealing on hover to remove one. Clearing all is in Settings.

If the Library has **no ready or indexing videos**, replace this block with an inline empty state: `Upload a video to start searching.` + secondary button `Go to Library`. The field remains but is disabled with placeholder `Search is available once a video is uploaded`.

#### Loading state
- On submit: field stays enabled (you can edit and resubmit; a new submit cancels the in-flight request). The Search button shows a 14px spinner and label `Searching`.
- Below filters: a status line `Searching 3 videos…` (`caption`, `text-secondary`) and **5 skeleton result rows** matching the real row geometry (thumbnail block 208×117, 3 text lines of widths 40% / 60% / 30%, right score block). Skeletons pulse opacity 0.5↔1 over 1.6s (static under reduced motion).
- If results take > 8s, append to the status line: `Still working. Large videos take longer.` No fake progress.
- Previous results are removed immediately on a new query (not left stale under the skeleton), except when only sort order changes.

#### Partial indexing notice
If any in-scope video is `indexing` (and `partialSearch`), show an inline alert **above the result header**:
- `InlineAlert` variant `processing`: icon `Loader` (static if reduced motion), text: `1 of 3 videos is still indexing (Lobby-cam-03, 42%). Results may be incomplete.` with a link `View in Library`.
- If a video is `partial`: variant `warning`: `Lobby-cam-02 is only indexed to 00:41:12. Matches after that point can't appear.`
- The alert is persistent while the condition holds (not dismissible), and updates as polling reports progress. When all in-scope videos become `ready` while the user is viewing results, the alert changes to `Indexing finished since this search. Re-run to include all footage` with a `Re-run` button (this is the **stale** condition; see §12).

#### Results header
`body` strong count + `caption` explanation, one line:
`12 matches in 3 videos` · `Ranked by similarity to your query. Review the footage to confirm.` (the second sentence in `text-tertiary`).
Right: `Sort: Best match ▾` with options `Best match`, `Time in video`, `Newest video`. Default `Best match`.

If the search was capped (server returns top N, e.g. 50): `Showing top 50 matches`.

#### Result row (the central component — `ResultRow`)
Each row represents an **event**: temporally adjacent matching frames from the same video merged by the server into one group (server-provided `eventId`, `startSec`, `endSec`, `bestFrameSec`, `frameCount`). The row is a link to `/videos/{id}?t={bestFrameSec}&q={query}&event={eventId}`.

Layout (≥ 768px): CSS grid, columns `28px 208px 1fr 88px`, gap 16px, padding 12px 16px, bottom border 1px `border-subtle`.

| Column | Content |
|---|---|
| Rank | `mono-data` `text-tertiary` `1`, `2`, … top-aligned with thumbnail's top (no `#`) |
| Thumbnail | 208×117 (16:9), `radius-sm`, 1px `border-subtle`, bg `bg-surface-inset`. The **best frame** for the event. If the event has detection(s), draw the highest-confidence box(es) as 1px `box-stroke` rectangles scaled to the thumbnail (no labels at this size). Bottom-right chip: `mono-chip` timestamp of `bestFrameSec` on `overlay-chip`, radius 2px, padding 2px 4px. Hover: a centered 32×32 square (`radius-sm`, `overlay-chip` bg) with a `Play` icon 16px appears |
| Body | See below |
| Score | Right-aligned, top-aligned: `mono-data` value `0.31` in `text-primary`, below it `caption` `text-tertiary` `similarity`. With `Info` affordance (tooltip on the whole block, see below). Absent if the row has no semantic score (pure detection filter result) |

**Body content (3 lines max):**
1. `body-strong` video name (truncate) · `mono-data` `text-secondary` time range `00:12:41 – 00:12:48` (en dash; a single timestamp if start = end). 
2. **Evidence lines**, one per evidence type present. Each has a 14px icon, a `label`-like word in `text-secondary`, and values:
   - **Detection evidence** — icon `Square` (outline, `accent`), word `Detected`, then classes with counts in `body` `text-primary` (`vehicle ×1, person ×2`), then `mono-data` `text-tertiary` `conf 0.91` meaning the **maximum** detector confidence in the event. Tooltip on `conf`: `Detector confidence for the most confident detection. Not a measured accuracy.`
   - **Semantic evidence** — icon `Diamond` (outline, `text-primary`), word `Frame match`, then `text-tertiary` caption `Similar to your query`. The score appears in the right Score column, not repeated here.
   Both lines can appear together (frame is both semantically close and contains a detection).
3. `caption` `text-tertiary`: `{frameCount} frames` as a ghost-style button that **expands the row inline** (no modal) to show a horizontal strip of up to 8 frame thumbnails (96×54, each with `mono-chip` timestamp; clicking one opens footage at that frame). Strip appears in a 8px-padded inset well (`bg-surface-inset`). Collapse by clicking again. The expansion animates height in 200ms (instant under reduced motion). Only shown if `frameCount > 1`.

**Row states:**
- Hover: bg `bg-surface-raised`; Play affordance appears on thumbnail.
- Focus-visible: 2px accent outline inset (`outline-offset: -2px`).
- Active (pressed): bg `bg-pressed`.
- Visited/already opened in this session: there is no visited-state marker; rows stay static. When returning from inspection, the previously opened row is scrolled into view and focused with a one-time subtle `accent-subtle` background that fades to default over 1.2s (so users re-find their place). Under reduced motion: static `accent-subtle` that clears on next interaction.
- Disabled: n/a.
- Loading: skeleton variant.

**Score tooltip text (exact):**
> **Similarity 0.31.** How close this frame is to your query in the model's embedding space. It orders results within this search. It is not a probability that the described event happened, and it can't be compared across different queries.

Tooltip trigger: hover or keyboard focus on the score block (the block is focusable, `tabindex=0`, `aria-describedby` the tooltip).

#### How uncertainty is communicated without overwhelming
1. **Language**: "matches" and "ranked by similarity", never "found", "detected X% likely", or "confidence" for semantic results.
2. **Order is the primary signal.** Rank numbers are shown; scores are secondary readouts.
3. **Different labels for different evidence**: `conf` (detector) vs `similarity` (retrieval). Never use the same label, color, or unit for both.
4. **One persistent sentence** in the results header (`Review the footage to confirm.`) — not a modal, not a banner.
5. **No traffic-light coloring of scores, no bars, no percentages, no "High/Medium/Low" tiers** for similarity. (Tiers would be invented calibration.)
6. **Verification is one click away**; the thumbnail and the playable footage are the real evidence.
7. Detection boxes are shown on thumbnails so the user can see *what* the model pointed at.

#### Pagination of results
Show the first 20 rows; a `Show 20 more` ghost button row follows until the server's cap. Keep prior rows mounted. Keyboard focus moves to the first newly added row after loading.

#### Empty results
Inline block (no illustration), 24px below filters, left-aligned in the column:
- `body-strong`: `No matches for “white van” in 3 videos.`
- `body` `text-secondary`, list of up to three suggestions as plain text lines (no bullets icons): `Try describing the scene differently.` · `Remove class filters.` (only if active, with a `Remove filters` button) · `1 video is still indexing. Results may appear once it finishes.` (only if applicable)
- Never claim the object isn't in the footage.

#### Search failure
`InlineAlert` variant `danger` replacing the results region: title `Search failed`, `caption` message from API (`The search service didn't respond.`), mono error code if provided, buttons `Retry` (secondary) — the query and filters remain. Network offline: `You're offline. Reconnect and retry.`

---

### C. Video Inspection and Playback (`/videos/[videoId]`)

**Goal:** verify a match or explore detections with the video as the visual center.

Query params: `t` (seconds, float), `q` (query, optional), `event` (event id, optional), `class` (comma list, optional).

#### Layout (≥ 1280px)

```
┌───────────────────────────────────────────────┬──────────────────┐
│ Video stage (black), 16:9 fit, centered        │ Side panel 360px  │
│  ┌──────────────────────────────────────────┐ │ ┌──────────────┐ │
│  │  video + SVG overlay (boxes, match chip)  │ │ │ Tabs          │ │
│  └──────────────────────────────────────────┘ │ │ Matches|Detect│ │
│ Controls bar (40px)                            │ │ |Info          │ │
│ Timeline (matches row + detections row)        │ │ list…         │ │
└───────────────────────────────────────────────┴──────────────────┘
```

- Player column: `flex: 1`, `data-zone="dark"`, background `bg-app` (dark set). The player column — stage, controls bar, and timeline — is the only dark zone besides the rail; the side panel is a light surface. Stage: `bg-video-stage`, height `min(calc(100dvh - 48px - 40px - 88px - 0px), 56.25vw of column)`—practically: the video is fitted (`object-fit: contain`) into the stage whose height is `calc(100dvh − header 48 − controls 40 − timeline 88)` capped at the width-derived 16:9 height. The player **always occupies ≥ 65% of the viewport width at ≥ xl** (360px panel, so ≈ 72% on 1440).
- Below the stage: **Controls bar** (40px, bg `bg-surface`, top border `border-subtle`) then **Timeline** (88px, bg `bg-surface`, top border `border-subtle`).
- Side panel: width 360px (resizable 320–480 via a 4px drag handle on its left edge; handle is a `separator` with `aria-orientation="vertical"`, keyboard-resizable with ←/→ in 16px steps; width persisted in local storage), bg `bg-surface`, left border 1px `border-default`.
- 1024–1279: panel 320px fixed. 768–1023: panel moves **below** the timeline as full width with its own scroll (page scrolls). < 768: same stacked layout; the stage is sticky at the top under the header (`position: sticky; top: 48px`) so scrolling the panel list keeps video visible.

#### Video stage
- `<video>` native element with custom controls (`controls` attribute off). Source supports HTTP range requests.
- Click on video toggles play/pause (single click). Double-click toggles fullscreen.
- An SVG overlay (`position: absolute`, same box as the **rendered video content rect**, not the element box — compute from `videoWidth/videoHeight` and letterboxing) draws detections in normalized coordinates `[0..1]`, so boxes remain aligned on resize and fullscreen.
- Top-left of stage: a `mono-chip` readout of the current frame position is **not** shown (clutter). Only the match chip described below.
- Loading: spinner 20px centered (`Loader`, 1.2s rotation, static icon `Loader` under reduced motion) after 300ms of buffering. Error: centered `body` `Couldn't load this video.` + `Retry` secondary button on the black stage.
- Videos that are not yet playable (`queued`): stage shows `body` `text-secondary` `This video is still being processed.` over `bg-video-stage`.

#### Controls bar (40px, left → right)
`Play/Pause` (icon button 32px) · `mono-player` `00:12:41.4 / 01:02:14` · [flex spacer] · `Previous match` (`[`) · `Next match` (`]`) · divider · Overlay toggles group (see below) · Speed menu (`1×` ▾: 0.5, 1, 1.5, 2) · Volume (icon button + 80px slider appears on hover/focus) · Fullscreen.

- Previous/next match buttons navigate between **search matches** (if `q` present) else between **detection events** (filtered by class). Disabled with tooltip `No more matches` at ends.
- **Overlay toggles** (icon toggle buttons, 28px, `aria-pressed`):
  - `Boxes` (icon `Square` with corner ticks → Lucide `Scan`), key `B`, default **on**.
  - `Labels` (icon `Tag`), key `L`, default **on**; disabled when Boxes is off.
  - Toggle pressed state: bg `accent-subtle`, icon `accent`. Unpressed: ghost.
  - Tooltip format: `Detection boxes (B)`.
- When `capabilities.detections` is false, the overlay group is hidden.

#### Timeline (88px)
Structure (top to bottom inside the 88px region, padding 8px 16px):
1. **Ruler** (16px): tick marks every nice interval (auto: 10s, 30s, 1m, 5m, 10m, 30m depending on width and duration), labels `mono-data` `text-tertiary` at major ticks. Format per §12.
2. **Matches track** (24px): row label `Matches` (`label`, left gutter 72px, `text-tertiary`). Shows **semantic matches** only. Marker = **diamond** 8×8 (rotated square, radius 1px), fill `match-marker`. If an event has a range, a 3px-tall bar in `rgba(236,239,242,0.35)` spans the range with a diamond at `bestFrameSec`. The selected event's diamond is 10×10, fill `text-primary` with a 2px `bg-surface` outer outline to separate it from neighbors.
3. **Detections track** (24px): row label `Detections`. Shows **detections** only: 2px-wide, 14px-tall **square-ended ticks** (`radius-xs`), color `accent`, one per sampled frame containing a detection (class-filtered). Adjacent ticks closer than 3px merge into a continuous 14px-tall band at `accent` 60% opacity. The selected detection event's range is highlighted with `accent-subtle` background plus a 1px `accent` outline bracket.
4. **Scrub bar** (16px, overlaps the lower edge): a 4px-tall track (`border-default`), buffered range (`border-strong`), played range (`text-secondary`); height expands to 6px on hover/focus. The **playhead** is a 1px full-height line (`text-primary`) crossing all tracks with a 10×10 `radius-xs` handle at the top. The playhead is **not** accent-colored (accent is reserved for detections/active state; the playhead must remain visible against accent ticks).

Interactions:
- Click/drag anywhere on tracks or scrub bar seeks (pointer capture while dragging; video pauses scrubbing preview only if seeking is slow—keep playing state restored on release).
- Hover: ghost line (`text-tertiary` 1px) follows pointer with a tooltip above: `mono-chip` timestamp (and a 160×90 sprite thumbnail if `capabilities.thumbnailSprites`).
- Hovering a marker shows a tooltip: `Frame match · similarity 0.31 · 00:12:41` or `Detected vehicle ×1 · conf 0.91 · 00:12:41`.
- Clicking a marker seeks to it **and selects the event** in the side panel.
- Keyboard: timeline is `role="slider"` with `aria-valuetext="00:12:41 of 01:02:14"`; ←/→ ±5s, Shift ±1s, Home/End. Markers are reachable via `[`/`]` rather than Tab (avoids hundreds of tab stops).
- If there are no matches/detections, the corresponding track shows a single line of `caption` `text-tertiary` centered: `No matches in this video` / `No detections` (only when the track would otherwise be empty).
- Legend: right end of the ruler row shows `◇ Match` and `▢ Detection` as `caption` items with the actual shapes, so the encoding is self-explanatory.

#### Bounding boxes (detections only)
- Rectangle, **1.5px** stroke `box-stroke-dim` (unselected), `radius-xs` 2px, **no fill**. Stroke uses `vector-effect: non-scaling-stroke` so thickness is constant across scales.
- **Label tag** (when Labels on): attached to the box's top-left, outside the box when space allows (else inside), `mono-chip`, bg `accent`, text `accent-fg`, padding 1px 4px, radius `2px 2px 0 0`. Text format: `vehicle 0.91` (class, then detector confidence to 2 decimals). No `%`.
- **Hover** a box (or its list item): stroke `accent` 2px.
- **Selected** box: stroke `accent` 2px, fill `box-fill-selected`, label always shown; all **other** boxes drop to stroke `rgba(70,181,201,0.45)` and hide labels (to focus attention). A 1px dark underlay stroke (`rgba(0,0,0,0.6)`, 4px wide, beneath) makes boxes readable on bright frames — an outline, not a glow.
- **Timing honesty:** detections exist only for sampled frames. A box is displayed while the playhead is within `±sampleInterval/2` of the sampled frame's timestamp, and hidden otherwise (no interpolation, no tracking). While playing, boxes therefore step rather than glide; this is intentional. The Info tab states the sampling interval.
- Boxes are non-interactive over the video except for **click-to-select** (pointer-events on the rectangles only; elsewhere clicks pass through to play/pause). Selecting a box highlights the corresponding row in the Detections tab.
- Boxes display for **all** detections in the sampled frame filtered by the active class filter; the panel's class filter applies to boxes consistently.

#### Semantic match indication on the stage
Semantic matches are frame-level; there is no box. When the playhead is inside a semantic match event range (or the user selected one), show a **chip** at the stage's top-right: `overlay-chip` bg, 1px `border-strong`, `mono-chip`, icon `Diamond` 12px + `Frame match · similarity 0.31`. Chip disappears outside the range. This is the only overlay for semantic matches.

#### Side panel
Header: tabs (`Matches`, `Detections`, `Info`), height 40px, with `Matches` shown only when `q` is present (otherwise tabs are `Detections`, `Info`; if `capabilities.detections` false: `Matches` or none + `Info`). Default tab: `Matches` if `q`, else `Detections`.

**Matches tab**
- Sub-header (40px): `caption`: `8 matches for “white van”` and a sort toggle `Time | Rank` (segmented control, `sm`).
- List items (56px, padding 8px 12px, divider `border-subtle`): 64×36 thumbnail (`radius-sm`) · block: line 1 `mono-data` time range (`text-primary` 500 when selected), line 2 `caption` evidence summary (`◇ Frame match` and/or `▢ vehicle ×1`) · right: `mono-data` `0.31` (`text-secondary`).
- Selected item: bg `accent-subtle`, 2px accent left bar. "Now playing" (playhead within range): a 6px `text-primary` dot before the time. 
- Click: **seek** to `bestFrameSec`, pause, select. `↑/↓` move selection within the list when it has focus (roving tabindex; `Enter` seeks).
- Matches from other videos are not listed (this panel is scoped to the current video). A footer link `Back to all results` (ghost) is at the list's bottom and in the breadcrumb.

**Detections tab**
- Sub-header: class filter toggles (same component as Search, `sm`), plus a segmented `Current frame | All`.
- `Current frame` (default while playing/paused): live list of detections visible at the playhead (class, `conf`, box size?? no — class + conf only). Updates on seek/pause; while playing, updates at most 4×/s to avoid flicker.
- `All`: list of **detection events** (server-grouped runs of the same class), item: icon `Square` · `vehicle` · `mono-data` `00:12:41 – 00:12:48` · `conf 0.91 max` · `×7 frames`. Click seeks to the event's best frame and selects its box.
- Keep strictly to model outputs (class, confidence, time, box). No track IDs unless the backend provides them; if it does, show `ID 14` in `mono-data` and never imply identity re-identification.

**Info tab** (definition-list rows, `caption` labels left, `mono-data`/`body` values right):
`Name` · `Duration` · `Resolution` · `Frame rate` · `Size` · `Uploaded` · `Status` · `Indexed range` (e.g. `00:00:00 – 01:02:14`) · `Frames indexed` · `Detection sampling` (`1 frame / second`, only if provided) · `Frames not analyzed` (only if > 0, `warning` text, with count). Missing values use `—`. At the bottom: ghost buttons `Search this video` and `Delete…` (danger text).

#### Selecting an event → player behavior
1. Seek to the event's `bestFrameSec` (exact), **paused**.
2. Boxes for that frame render with the selected box highlighted (if detection).
3. The timeline playhead moves; the timeline auto-scrolls if zoomed (zoom is not in the MVP; the full duration is always visible).
4. The side-panel row scrolls into view (`block: nearest`).
5. Focus stays where the user acted (do not steal focus into the video).
6. `Space` plays from there.

#### Returning to search
- Breadcrumb `Search / “query”` and browser Back both return to `/search?q=…` with scroll and expansion state restored (client cache keyed by URL, `staleTime` 5 min).
- The result row last opened receives the re-find highlight (see §8B).
- `Alt+←` is native browser behavior; additionally `Esc` when focus is not inside the video controls or a menu navigates back to the search if `q` is present (not otherwise).

#### Header actions on this page
Overflow `…` menu: `Search this video`, `Rename` (if available), divider, `Delete…`. Delete here opens a **confirmation dialog** (see §9.12), since there is no row to transform.

---

### D. Settings (`/settings`)

Deliberately small. Single column, 720px max width. Sections separated by 32px and a `border-subtle` divider. Changes **apply immediately** (no Save button); each change shows a subtle inline `Saved` caption (`success-text`, 120ms fade) next to the control for 1.5s. Preferences are stored in `localStorage` under `sentinel.prefs.v1`, except those backed by the API.

**Section 1 — Display** (`section-title`)
| Setting | Control | Default |
|---|---|---|
| Timestamp format | Segmented: `00:12:41` / `Seconds (761.4 s)` | `00:12:41` |
| Default Library view | Segmented: `Grid` / `List` / `Board` | `Grid` |
| Show detection boxes by default | Switch | On |
| Show box labels by default | Switch | On |

**Section 2 — Search**
| Setting | Control | Default |
|---|---|---|
| Remember recent searches | Switch | On |
| Recent searches | `Clear recent searches` secondary `sm` button (disabled when none; toast-free: inline `Cleared`) | — |
| Default scope | Dropdown: `All ready videos` / `Remember last selection` | `All ready videos` |

**Section 3 — Processing** (rendered only if `capabilities.processingOptions`)
Controls exactly as exposed by the API (e.g. `Frame sampling interval` numeric/select with the API-provided options). Show helper text: `Applies to videos uploaded after changing this. Existing videos keep their current index.` Never include model selection, thresholds, or training controls unless the API provides them.

**Section 4 — Data** (rendered only if `capabilities.storageStats`)
Read-only definition list: `Videos` count, `Storage used` (`mono-data`, e.g. `18.4 GB`), `Index data` size. No charts. No bulk-delete in the MVP.

**Section 5 — About** (always)
`Version` (`mono-data`), `API` base URL host (`mono-data`, read-only), `Detector` and `Embedding model` names **only if the API reports them** (read-only, `mono-data`). This supports transparency about pretrained models.

If everything optional is hidden, the page still has Display, Search, and About. Do not add placeholder sections.


### E. Home page (`/`)

**Purpose:** show, in one screen, what Sentinel does (type a question, land on the exact moment in the footage), then send the visitor to `/library`. It is a public marketing page with its own layout; it is the only place in the product where large type and wide spacing are allowed.

**Reference note.** This page follows the *structure* of Twelve Labs' home page: a large declarative headline, one explanatory line, two calls to action, a product-led visual, a section that explains two complementary capabilities side by side, and a closing call to action. Only that site's copy and structure could be reviewed when writing this; its visual traits are therefore directional. Do not reuse its wording, imagery, or brand colors. Sentinel keeps its own palette, type, and copy.

**Global rules for this page**
- Layout: `(marketing)` route group, no sidebar and no app header. Container max-width 1200px, horizontal padding 24px (16px < 768px).
- Zones alternate: header and hero are **dark zone** (`data-zone="dark"`); the evidence, how-it-works, and scope sections are the **light** work plane; the closing band and footer are **dark**.
- Section vertical padding: 96px (64px < 768px). This is the only place such spacing is allowed; the 32px max section gap applies inside the app.
- One `<h1>`; section headings are `<h2>`. One primary button per viewport.
- All copy below is final unless the product changes. Use no statistics, no logo walls, no testimonials, no pricing, no "contact sales".

**1. Top bar** (64px, sticky, dark zone, bottom border `border-subtle`)
- Left: mark + wordmark (links to `/`). Right: text link `How it works` (anchor `#how`, `body`, `text-secondary`) and primary button `Open Sentinel` (`md`, links to `/library`). Nothing else. On < 640px the text link is hidden.

**2. Hero** (dark zone, bg `bg-chrome`, padding 96px top / 80px bottom, centered text)
- h1 (`hero`, `text-primary`, max-width 880px): `Search your footage like you'd ask a person.`
- Lede (`lede`, `text-secondary`, max-width 620px, 16px below): `Upload recorded video. Sentinel indexes its frames with pretrained vision models, so you can ask for a person, a vehicle, or a scene in plain language and jump straight to the moment.`
- CTAs (24px below, centered, gap 12px): primary `lg` `Open Sentinel` (→ `/library`); secondary `lg` `See how it works` (→ `#how`). Stack and go full-width < 640px.
- **Hero demo** (48px below CTAs): a single framed product view, max-width 1120px, `radius-md`, 1px `border-default`, bg `bg-app` (dark set), **no glow, no drop shadow, no fake window chrome (no traffic-light dots)**. Layout ≥ 1024px: two columns 60/40.
  - Left (60%): the player stage (16:9) showing a still frame of **sample footage**, a detection box with its label (`vehicle 0.91`), and below it the real timeline component with one diamond (semantic match) and a few square ticks (detections) and the playhead.
  - Right (40%): the real `QueryField` showing a typed query, and the first two real `ResultRow`s (with `Detected` and `Frame match` evidence lines, `conf` and `similarity` formatted exactly as in the app).
  - Caption row under the frame (`caption`, `text-tertiary`): `Sample footage — {credit}. Results shown are from a real Sentinel run on this clip.` plus a ghost icon button (`Pause`/`Play`, `aria-label="Pause demo animation"`) at the right.
  - **Sequence (scripted, 9s loop):** (1) query types in at ~45ms/char; (2) Search button presses; 400ms skeleton; (3) two result rows fade in (120ms); (4) first row highlights, the playhead slides to its timestamp (200ms), and the box and chip appear on the frame; (5) hold 4s; (6) reset. These are the only non-state-change animations in the product and exist solely to demonstrate the flow.
  - **Reduced motion / paused / < 640px:** show the final state (step 4) as a static image of the same components; no loop. < 1024px: columns stack, player first, then query and results (one result row on < 640px).
  - Data integrity: the demo's frames, boxes, timestamps, confidences, and similarity values must be exported from a real run of the pipeline on the sample clip (checked into `public/demo/` as JSON + two stills). Never hand-typed numbers. The footage must be self-shot or licensed (CC0/CC-BY with credit shown); no people's faces in identifiable close-up.

**3. Two kinds of evidence** (light zone; mirrors the "two models, one index" layout of the reference)
- h2 (`h2-marketing`): `Two kinds of evidence, never mixed.` Lede: `Every result tells you which kind it is, so you know what you're looking at.`
- Two equal cards in a grid (gap 24px; stacked < 768px): bg `bg-surface`, 1px `border-default`, `radius-md`, padding 24px, no shadow, equal height. Each: 20px icon, title (`section-title`), `body` `text-secondary` paragraph, then a visual well (`bg-well`, `radius-sm`, padding 12px, 16:9) and a `caption` footnote.
  - **Detections** (icon `Square`, `accent`): `An object detector draws a box around a class of object, such as a person, vehicle, or bag, in a sampled frame. You see the box, the class, and the detector's confidence.` Visual: a frame crop with one real box and label. Footnote: `conf 0.91 · Detector confidence. Not a measured accuracy.`
  - **Frame matches** (icon `Diamond`, `text-primary`): `Your query and each frame are embedded in the same space, and the closest frames rank first. The score orders results within one search. It is not a probability.` Visual: three result thumbnails with `0.31`, `0.29`, `0.27` as mono readouts under them (from the real run). Footnote: `similarity · Orders results within one search.`

**4. How it works** (`id="how"`, light zone)
- h2: `From file to footage in three steps.`
- Three columns (stacked < 768px), each: `step-index` (`01`/`02`/`03`), title (`section-title`), one `body` `text-secondary` paragraph, then a **real screenshot crop** of the app in a 1px `border-default` `radius-md` frame (16:10, no device mockup, no shadow).
  1. **Upload** — `Drop in recorded footage. Uploads continue in the background while you work.` (Library Grid with an uploading card.)
  2. **Index** — `Frames are sampled and analyzed. You can leave the page; progress stays visible in the Library.` (An indexing card with the progress line.)
  3. **Search** — `Describe what you want to find. Open a result to land on the exact timestamp, with boxes on the frame.` (Search results.)
- Screenshots are generated from the sample clip at build time or checked in as static assets; they must match the shipped UI (regenerate on UI changes).

**5. Scope** (light zone)
- h2: `What it is, and what it isn't.`
- Two columns separated by a 1px `border-subtle` vertical rule (stacked < 768px). Headings in `label` style. Items are plain `body` lines, 12px apart, with a 16px `Check` (success) or `Minus` (text-tertiary) icon at the left.
  - **Does:** `Searches recorded video in natural language` · `Shows detected people, vehicles, and bags with boxes` · `Takes you to the exact timestamp` · `Shows when a video is still being indexed`
  - **Doesn't:** `Process live streams or manage cameras` · `Identify individuals` · `Present a similarity score as the chance something happened`

**6. Closing band** (dark zone, bg `bg-chrome`, padding 96px, centered)
- h2 (`h2-marketing`, `text-primary`): `Ask your footage a question.`
- Primary `lg` button `Open Sentinel`.

**7. Footer** (dark zone, 64px, top border `border-subtle`)
- Left: wordmark + `© 2026 Sentinel` (`caption`, `text-tertiary`). Right: text link `Open Sentinel`. No social icons, no link columns, no legal links unless legally required (then add exactly those).

**Home states and behavior**
- Loading: static content; the demo shows its static final state until its assets load (no spinner). Images have fixed aspect ratios to avoid layout shift.
- Errors: none expected; if demo JSON fails to load, show the static stills only.
- Keyboard: skip link first, then top bar, then CTAs; the demo's pause button is reachable; the demo is not focusable otherwise.
- `Open Sentinel` always navigates to `/library` (no auth in the MVP).
- Accessibility: the demo is a `<figure>` with `aria-label="Example: searching sample footage for a vehicle"`; its animated internals are `aria-hidden`; the caption and the static final state carry the same information as text. Contrast follows §4.4 in both zones.
- SEO/meta: title `Sentinel — Search your footage in plain language`; description repeating the lede; an Open Graph image generated from the static final demo state.

#### App refinements aligned with the Home page
The Home page and the app share components (`QueryField`, `ResultRow`, `FrameThumb`, `Timeline`, `StatusIndicator`), so these app changes keep the product visually continuous:
- Page titles are 20px (was 18px).
- The Search query field is 56px high with 18px text.
- Result thumbnails are 208×117 so frames read more clearly.
- Library defaults to the thumbnail-forward `Grid` view (list and board remain).
- The wordmark in the app rail links to `/library`; the Home page is reached only by direct URL.

---

## 9. Core component specifications

Every interactive component must implement all listed states. `focus-visible` is always `outline: 2px solid var(--accent); outline-offset: 2px`.

### 9.1 Buttons

Variants:

| Variant | Default | Hover | Active | Disabled | Loading |
|---|---|---|---|---|---|
| **Primary** | bg `accent`, text `accent-fg`, weight 500, no border | bg `accent-hover` | bg `accent-active` | bg `bg-surface-raised`, text `text-disabled` | Label replaced by spinner (14px) + label `…ing`; width locked; `aria-busy` |
| **Secondary** | bg `bg-surface-raised`, 1px `border-default`, text `text-primary` | border `border-strong`, bg `bg-hover` | bg `bg-pressed` | text `text-disabled`, border `border-subtle` | Same as above |
| **Ghost** | transparent, text `text-secondary` | bg `bg-hover`, text `text-primary` | bg `bg-pressed` | text `text-disabled` | Same |
| **Destructive** (outline) | transparent, 1px `danger-border`, text `danger-text` | bg `danger-subtle` | bg `danger-pressed-bg` | as ghost disabled | Same |
| **Destructive solid** (confirm only) | bg `danger`, text `danger-fg` | bg `danger-hover` | bg `danger-active` | as primary disabled | Same |
| **Icon button** | 28/32px square, ghost styling, `aria-label` required | as ghost | as ghost | as ghost | Spinner replaces icon |

Rules: radius `radius-sm`; icon-and-label gap 6px; `Primary` appears **at most once per view** (header action OR in-content primary, not both). `Destructive solid` only appears inside a confirmation. Disabled buttons that are disabled for a non-obvious reason carry a tooltip stating why (use `aria-disabled` + tooltip, not the `disabled` attribute, when the tooltip must be focusable).

### 9.2 Search inputs & text inputs
- Default: bg `bg-surface` (white), 1px `border-default`, text `text-primary`, placeholder `text-tertiary`.
- Hover: `border-strong`. Focus: border `accent` + global ring. Disabled: text `text-disabled`, border `border-subtle`, bg `bg-well`. Error: border `danger`, helper `caption` `danger-text` beneath with `AlertCircle` 12px; `aria-invalid`, `aria-describedby`.
- Loading (async validation): trailing 14px spinner.
- Labels: persistent visible `caption` `text-secondary` label above the input for forms (Settings); the Search and Library filter fields use `aria-label` plus placeholder (their purpose is evident from context and icon).
- The main **QueryField** is specified in §8B.

### 9.3 Upload dropzone
- Used only in the Library empty state and as the drag-over treatment of the list.
- Default: bg `bg-well`, 1px **dashed** `border-strong`, `radius-md`, content centered.
- Hover (pointer over): border `text-tertiary` dashed; cursor default (the button inside is the actual target).
- Drag-over: bg `accent-subtle`, border `accent` dashed, label swaps to `Drop to upload`.
- Focus: the inner `Choose files` button takes the ring. The dropzone container itself is not focusable.
- Disabled (e.g. upload quota unavailable): content replaced with `Uploads are unavailable.` + reason from the API.
- Loading: not applicable (progress lives in rows).
- Accessibility: file input visually hidden but present and labeled `Upload videos`; button triggers it. Drop is an enhancement, never the only path.

### 9.4 Video rows
Defined in §8A. Shared requirement: a `VideoRow` is one component with a `state` prop and renders all states from a single source of truth; no per-state forked layouts.

### 9.5 Status indicators (not pills)
`StatusIndicator` = 6px dot (`radius-full`) + 6px gap + `caption`-size text 12px/500, color per semantic `*-text`, dot color per semantic solid. **No background fill, no border, no pill shape** in lists. States:

| State | Dot | Text |
|---|---|---|
| `uploading` | processing, static | `Uploading 42%` |
| `queued` | processing, static | `Queued` |
| `indexing` | processing, **pulsing** (opacity 0.4↔1, 1.4s; static under reduced motion) | `Indexing 38%` |
| `ready` | success | `Ready` |
| `partial` | warning | `Partially indexed` |
| `failed` | danger | `Failed` |

A filled subtle-background variant (`*-subtle` bg + `*-border` 1px, `radius-xs`, padding 1px 6px) exists **only** for inline alert headers and the Info tab's status; never repeat it per row.

### 9.6 Progress indicators
- **Linear (row/line)**: 2px tall at the row bottom (`radius-xs`), track `border-subtle`, fill `processing`; width transitions 200ms linear. For an inline bar in a message (e.g. a dialog), 4px tall.
- **Determinate vs indeterminate:** use determinate whenever the API provides numbers (upload bytes, indexing fraction). When only a state is known (`queued`), show no bar (text only). Indeterminate bar (`queued` waiting >30s?) is **not** used; do not animate fake progress.
- **Spinner**: Lucide `Loader` 14/16/20px, 1s linear rotation; replaced by a static icon with `Loading…` text under reduced motion.
- All progress elements have `role="progressbar"` with `aria-valuenow/min/max`, or `aria-busy` + status text for indeterminate.

### 9.7 Tabs
- Container: 40px, bottom border `border-subtle`. Tab: padding 0 12px, `body` 500, `text-secondary`.
- Hover: `text-primary`. **Active:** label `accent-text` and 16px leading icon `accent`, plus 2px `accent` underline sitting on the container border (no background, no pill) — matching the `Board | Insights` tabs in the reference. Focus-visible: ring inset (`outline-offset: -2px`). Disabled: `text-disabled`.
- Keyboard: roving tabindex; ←/→ move; Home/End; activation on focus (automatic) since panels are cheap.
- Counts: optional mono count after label in `text-tertiary` (`Matches 8`).
- Segmented control (`Time | Rank`, `Current frame | All`): `sm` height 28px, 1px `border-default`, `radius-sm`; active segment bg `bg-surface-raised`, text `text-primary`; inactive transparent `text-secondary`.

### 9.8 Dropdown menus
- Trigger: secondary or ghost button with trailing `ChevronDown` 14px; open state `bg-surface-raised`.
- Menu: bg `bg-float`, `shadow-float`, padding 4px, min-width 180px, item height 28px, item radius 4px (`radius-sm` minus padding), `body`.
- Item hover/highlight (keyboard or pointer): bg `bg-hover`. Selected (single-select): trailing `Check` 14px in accent. Checkbox items: leading box. Disabled: `text-disabled`. Danger item: `danger-text`, hover bg `danger-subtle`. Group separators: 1px `border-subtle` with 4px margin.
- Motion: opacity 0→1 and translateY(−4px→0) over 120ms.
- Behavior: opens on click/`Enter`/`Space`/`↓`; typeahead; `Esc` closes and returns focus to trigger; closes on selection (except checkbox items). Implement with a headless primitive (see §13).

### 9.9 Tooltips
- bg `bg-float`, 1px `border-default`, `radius-sm`, padding 4px 8px, `caption`, max-width 280px (longer explanatory tooltips, like the similarity explanation, use a **popover-style tooltip** with max-width 320px and padding 8px 12px).
- Delay: 400ms open on hover (0ms on keyboard focus); closes on `Esc`, blur, or pointer leave (with a 100ms grace so users can hover into long tooltips).
- Tooltips never contain interactive elements or the only copy of important information; icon-only buttons use `aria-label` and a tooltip with the same text plus shortcut (`Next match (])` with the key in `Kbd`).

### 9.10 Toasts
- Position: bottom-right, 16px from edges (bottom-center, full-width minus 16px margins on < 640, above bottom nav). Width 360px max. Stack up to 3, newest at the bottom, 8px gap; older are dropped.
- Style: bg `bg-float`, `radius-md`, `shadow-float`, padding 12px 12px 12px 14px, 3px left bar in semantic color, leading semantic icon 16px, `body` text, optional single action (ghost `sm`, e.g. `Search`), and a close `X` icon button.
- Timing: success/info auto-dismiss at 4s; **errors persist until dismissed**; pause on hover/focus. Entering: translateY(8px→0) + opacity over 200ms; exiting: opacity 120ms.
- Accessibility: container `role="region" aria-label="Notifications"`; success/info toasts `role="status"` (polite); errors `role="alert"` (assertive). Toasts never carry the only copy of required info (inline states hold the truth).
- Use toasts only for: only these events: `{name} is ready to search` (action: `Search`), `Deleted “{name}”`, `Indexing failed for {name}` (action: `View`), `Upload failed for {name}` is shown **inline** and not as a toast. Deduplicate by video id + event type. Do not toast for ordinary success of settings changes (inline `Saved`).

### 9.11 Inline alerts
- Used for page/region-level messages (partial indexing, search failed, stale results).
- Layout: `radius-sm`, bg `*-subtle`, 1px `*-border`, padding 10px 12px, leading icon 16px in semantic solid, `body` text `text-primary`, optional trailing action (`Retry`, `Re-run`, link).
- Variants: `info`/`processing`, `warning`, `danger`, `success`. Use `role="status"` except `danger` (`role="alert"`).

### 9.12 Confirmation dialogs
- **Inline confirmation is the default** (Library rows).
- A modal dialog is used only where no stable inline anchor exists (Delete from the Inspection page). Spec: centered, width 440px (full width − 32px on mobile), `radius-md`, bg `bg-surface-raised`, `shadow-float`, backdrop `overlay-scrim` (no blur). Padding 20px. Title `section-title`; body `body` `text-secondary`; footer right-aligned: `Cancel` (secondary, initial focus) + `Delete` (destructive solid). 
- Copy: `Delete “{name}”?` / `This removes the video, its thumbnails, and all indexed search data. This can't be undone.`
- Behavior: focus trapped; `Esc` cancels; backdrop click cancels; on confirm shows loading state in the button, then navigates to `/library` with toast `Deleted “{name}”`.
- Enter/animation: opacity + scale(0.98→1) 120ms.

### 9.13 Empty states
Structure: optional 24px Lucide icon (`text-tertiary`), headline (`display` only for the Library first-run; otherwise `body-strong`), one `body` `text-secondary` sentence, at most **one** button. Left-aligned inside list contexts, centered only in the Library first-run dropzone. No illustrations. Empty states always say what to do next.

### 9.14 Skeleton loaders
- Blocks `bg-surface-raised` (on `bg-surface`; on `bg-well` use `bg-pressed`), `radius-sm` for blocks and `radius-xs` for text lines; opacity pulse 0.5↔1, 1.6s ease-in-out; **match the real component's geometry exactly** to prevent layout shift.
- Shown for: Library list (6 rows), Search results (5 rows), Side panel list (6 items), Info tab (6 rows). Not shown for sub-300ms loads (delay display 200ms).
- Under reduced motion: static `bg-surface-raised`, no pulse.

### 9.15 Error messages
- Field errors: `caption` `danger-text` under the field (see inputs).
- Region errors: `InlineAlert danger` with **what happened**, **what the user can do**, and a **Retry** action. Technical detail (HTTP status, request id) in `mono-data` `text-tertiary` on a second line, selectable, with a ghost `Copy details` button.
- Fatal route errors (Next error boundary): inside the main container, `body-strong` `Something went wrong loading this page.` + `Reload` secondary button + mono error digest. The shell remains intact.
- Never show raw stack traces. Never use humor.

### 9.16 Video timeline markers
Defined in §8C. Component rule: markers are `button`-less visual elements positioned absolutely; interaction is delegated to the track (pointer position → nearest marker within 6px) to keep the DOM small for thousands of markers. Cap rendering to one tick per 1px of track width (aggregate density beyond that).

### 9.17 Detection bounding boxes
Defined in §8C. Component: `DetectionOverlay` (SVG). Props: `detections[]` (normalized), `selectedId`, `showBoxes`, `showLabels`, `videoRect`. Must remain aligned in fullscreen and during window resize (ResizeObserver).

### 9.18 Confidence and similarity indicators
Two components, deliberately **visually different** so they can't be confused:

| | `ConfidenceValue` (detector) | `SimilarityValue` (retrieval) |
|---|---|---|
| Text | `conf 0.91` | `0.31` over `similarity` |
| Placement | Inline in the evidence line / label tag / detection list | Right score column / match list / chip |
| Icon context | Square (detection) | Diamond (semantic) |
| Format | Mono, 2 decimals, no `%`, no bar | Mono, 2 decimals, no `%`, no bar |
| Tooltip | `Detector confidence for this detection. Not a measured accuracy.` | The longer similarity explanation in §8B |
| Color | `text-secondary` for value (never green/red scaled) | `text-primary` value |

Neither has a bar, ring, gauge, or color scale.

### 9.19 Pagination / incremental loading
Described per screen: Library `Load 50 more`, Search results `Show 20 more`. Button style: ghost, full-width, 40px, `body` `text-secondary`, with a `caption` count line. While loading: spinner + `Loading…`; focus moves to the first newly added item after load.

### 9.20 Kbd
`Kbd` keycap: `mono-chip`, padding 1px 5px, 1px `border-default`, bg `bg-surface-inset`, `radius-xs`, `text-secondary`. Used in tooltips, the Search button (`⏎`), and a keyboard-shortcut hint list in the Inspection overflow menu (`Keyboard shortcuts` opens a menu-style popover listing §10.4).

### 9.21 Switch & checkbox
Switch: 32×18 track (`radius-full`), off `border-strong` track with `text-tertiary` thumb, on `accent` track with `accent-fg` thumb; focus ring around track; `role="switch"`. Label to the left, switch right-aligned in settings rows.

---

## 10. Interaction and UX behavior

### 10.1 User journeys

**1. First-time user uploads a video**
1. Arrives at the Home page (`/`), presses `Open Sentinel`, and lands on `/library`. Sees the first-run dropzone; the Library nav item is active.
2. Clicks `Choose files` or drops a file. File picker/dropzone accepts it.
3. The list replaces the empty state. A new row appears immediately at the top in `uploading` with progress. The toolbar appears.
4. The user may navigate elsewhere; the upload continues. Returning shows the same row.

**2. Processing begins and progresses**
1. Upload completes → row becomes `Queued`, then `Indexing 0%`. The sidebar Library item shows the 6px processing dot.
2. Stage label and fraction update on each poll. The row remains usable; the user can open the (playable) video, search other videos, or leave.
3. If `partialSearch`, an `Search` icon button appears on the row as soon as the first segment is indexed.

**3. Processing succeeds or fails**
- **Succeeds:** dot → success `Ready`, progress line disappears, toast `{name} is ready to search` with `Search` action (if the user is on another page; also if on Library). `Search` action navigates to `/search?videos={id}`.
- **Fails:** dot → danger `Failed`, row sub-line shows the short reason and `Retry`; a persistent error toast `Indexing failed for {name}` with `View` action. If part of the video was indexed, state is `partial` (warning) rather than `failed`.
- **Retry:** inline link/menu item; row returns to `Queued`.

**4. User searches for a person or vehicle**
1. Navigates to Search (`/search`). Focus is placed in the query field automatically on arrival (only if there is no `q` in the URL; focus is never moved after results load; it stays where the user left it).
2. Types `person in a red jacket`, optionally toggles `Person`. Presses `Enter`.
3. Sees skeletons, then ranked results. The partial-indexing notice appears if relevant.

**5. User opens a result**
Click or `Enter` on a focused row → navigates to `/videos/{id}?t=…&q=…&event=…`. The page renders the shell and the player stage immediately with a skeleton for the panel; video metadata loads in parallel.

**6. Player seeks to the relevant timestamp**
On `loadedmetadata`, the player seeks to `t` (clamped to duration), remains paused, selects `event` in the Matches tab, shows boxes for that frame, and shows the frame-match chip. The Matches tab is active. Focus: moves to the `Play/Pause` button so that `Space` works and the page announces `Player ready at 00:12:41` via a polite live region.

**7. User inspects a detection and returns to search**
Switches to the `Detections` tab or clicks a box → selection syncs between panel and stage. Uses `[`/`]` to hop between matches. Clicks the `“query”` breadcrumb (or browser Back) → returns to results with state restored and the previously opened row highlighted.

**8. User deletes a video**
- **From Library:** row menu → `Delete…` → inline confirm (Cancel focused) → `Delete` → row collapses → toast `Deleted “{name}”`.
- **From Inspection:** overflow → `Delete…` → modal confirm → navigate to Library with toast.
- Cached search results referencing the deleted video are invalidated; open Search pages show the stale notice or drop those rows.

### 10.2 Loading behavior
- Every list has a skeleton (§9.14); every async button has a loading state; no full-page spinners.
- Optimistic UI for upload rows and delete collapse (rolled back on failure with an inline error).
- Data fetching: stale-while-revalidate (TanStack Query). Library 2s polling when needed. Search results cached by `(q, scope, classes)` for 5 minutes.
- Navigation transitions are instant; page content may stream, the shell never disappears.

### 10.3 Error recovery
- Every failure has a **Retry** in context. The user's input (query, filters, selection) is never cleared by an error.
- Network loss: a thin persistent `InlineAlert warning` at the top of main (`You're offline. Changes will resume when you reconnect.`), removed on reconnect. Upload rows pause with `Paused – offline` and resume automatically when the upload API supports resumable uploads; otherwise they fail with `Retry`.
- 404 for a video id: in-shell empty state `This video doesn't exist or was deleted.` + button `Back to Library`.

### 10.4 Keyboard map

| Scope | Keys | Action |
|---|---|---|
| Global | `Tab`/`Shift+Tab` | Standard order; skip-link `Skip to content` is the first focusable element |
| Search page | `/` | Focus query field |
| Search field | `Enter` | Submit |
| Search field | `Esc` | Clear → blur |
| Search field | `↓` | Move to first result |
| Results list | `↑`/`↓` | Move focus between rows (roving) |
| Results list | `Enter` | Open |
| Results list | `Space` | Toggle frame-strip expansion |
| Player | `Space` or `K` | Play/pause |
| Player | `←` / `→` | Seek −/+ 5s (Shift: 1s) |
| Player | `,` / `.` | Step one sampled frame back/forward (paused) |
| Player | `[` / `]` | Previous / next match |
| Player | `B` / `L` | Toggle boxes / labels |
| Player | `M` | Mute |
| Player | `F` | Fullscreen |
| Player | `Esc` | Exit fullscreen; else back to Search if `q` |
| Menus/dialogs | `Esc` | Close |
Shortcuts are active when focus is not inside a text input/select. They are listed in the `Keyboard shortcuts` popover (§9.20). Do not implement a command palette.

### 10.5 Focus management
- After route change, focus moves to the page's `<h1>`/breadcrumb container (`tabindex=-1`) except Search (query field) and Inspection (Play/Pause).
- Closing a menu returns focus to its trigger. Opening a dialog traps focus; closing returns to the invoker (or to `/library` heading after navigation).
- Inline delete confirmation moves focus to `Cancel`; on cancel, returns to the row's menu trigger; on success moves to the next row (or the list heading if none).
- Newly loaded result pages move focus to the first new row only when the user activated `Show 20 more`.

### 10.6 Modals vs inline
Only one modal exists (delete from inspection). Everything else (expansion of result frames, delete confirmation in the Library, alerts, filters, settings) is inline.

### 10.7 Long-running work never blocks
Uploads, indexing, and searches are all cancellable/leavable. A search in flight is cancelled by a new search or navigation. An in-progress upload is cancelled only by explicit action.

### 10.8 Motion principles
1. Motion communicates **state change** (appearing, expanding, progressing) — never decorates.
2. CSS transitions only (`transition-property` limited to `color, background-color, border-color, opacity, transform, height`), durations §6.8.
3. No parallax, no entrance staggering, no layout-shifting spring animations, no animated numbers, no animated gradients.
4. Reduced motion (`prefers-reduced-motion: reduce`): set all durations to 0 except opacity changes ≤ 80ms; stop pulsing/spinning (replace with static indicators + text).

---

## 11. Responsive and accessibility rules

### 11.1 Responsive behavior by screen

| Screen | ≥ 1280 | 1024–1279 | 768–1023 | < 768 |
|---|---|---|---|---|
| Shell | Sidebar 216 | Sidebar 216 | Rail 52 | Bottom nav |
| Library | Full columns (incl. size) | Hide size | Hide size & uploaded date; actions condensed | Two-line rows, 72×40 thumbs; filters stack (filter input full width, dropdowns in a row below); header Upload becomes icon button `Upload` with `aria-label`; first-run dropzone loses drag copy (`Choose files` only) |
| Search | 960 column | 960 column | Full width | Full width; result row becomes **stacked**: thumbnail full-width (16:9) on top, then text, score inline right of the first line; class toggles wrap to a second line; scope dropdown full width |
| Inspection | Player + 360–480 panel | Player + 320 panel | Panel stacked below, page scrolls | Stage sticky under header; timeline compresses to a single combined track (matches + detections overlaid at 50% height each); controls bar hides `Speed`/`Volume` into an overflow menu; panel full width |
| Settings | 720 column | same | same | Full width; labels above controls |

Touch: no hover-only functionality (every hover reveal also appears on focus/tap); timeline supports touch dragging; marker tooltips on tap-and-hold; 44px minimum targets via `(pointer: coarse)`.

Landscape phones: stage fills the viewport height minus the header; panel below.

### 11.2 Accessibility requirements
- **Contrast:** per §4.4. Text ≥ 4.5:1; UI component boundaries and focus indicators ≥ 3:1. Information is never conveyed by color alone (evidence uses shape + label; status uses label text alongside the dot).
- **Keyboard:** every action is reachable; no keyboard traps except dialogs (properly trapped); visible `:focus-visible` on everything; roving tabindex in tab lists and result lists.
- **Landmarks:** `<header>`, `<nav aria-label="Primary">`, `<main id="main">`, region labels for the side panel (`aria-label="Matches and detections"`).
- **Labels:** every icon-only button has `aria-label`; the player controls expose names and `aria-pressed` states; the timeline has `role="slider"` with `aria-valuetext`; result rows have an accessible name: `Rank 1, Lobby-cam-03, 00:12:41 to 00:12:48, frame match, similarity 0.31`.
- **Live regions:** a visually hidden `role="status"` announces: search start (`Searching`), search results (`12 matches in 3 videos`), no results, indexing completion, player seek (`Seeked to 00:12:41`), and selection changes in the side panel.
- **Video:** custom controls must replicate native a11y (keyboard operable, labeled). Provide `<track>` elements if the source has captions (not expected). Do not autoplay. Autoplay never occurs with sound.
- **Reduced motion:** see §10.8. **Zoom:** layouts remain functional at 200% zoom and 320px width (reflow, no horizontal page scroll; the list container may scroll horizontally inside itself if absolutely necessary).
- **Target size:** ≥ 28×28 desktop, ≥ 44×44 coarse pointer, spacing between adjacent targets ≥ 4px.
- **Language and text:** `lang="en"`; text resizable; timestamps provided with `<time>` or visually hidden full-text (`12 minutes 41 seconds`) for screen readers on key rows.

---

## 12. Data presentation guidelines

The product displays machine-generated output. These rules prevent overclaiming.

### 12.1 Timestamps
| Context | Format | Example |
|---|---|---|
| Result rows, lists, ruler | `mm:ss` if duration < 1h, else `h:mm:ss`; zero-padded minutes/seconds; hours not padded | `12:41` · `1:12:41` |
| Library duration | Same as above | `1:02:14` |
| Player current time | Adds tenths: `mm:ss.s` / `h:mm:ss.s` | `1:12:41.4` |
| Ranges | En dash with spaces, both ends same format | `12:41 – 12:48` |
| Settings option `Seconds` | Decimal seconds with 1 decimal and unit | `761.4 s` |
| URLs | Float seconds, `t=761.4` | — |
| Dates | `12 Mar 2026`; with time in tooltips: `12 Mar 2026, 14:03` in user's local timezone; relative form within 7 days | — |
Sub-second precision beyond tenths is never shown. Within a single list, all timestamps use the same width format (pad with figure spaces if needed so columns align).

### 12.2 Detector confidence
- Decimal, 2 places, no percent sign: `0.91`. Always labeled `conf` or `Detector confidence` where space permits.
- Never colorize by value. Never rounded to look better (use standard rounding to 2 decimals, but clamp the display to `0.99` when the true value is below 1.0 so a non-perfect score never shows as `1.00`).
- Described as the **model's score**, never as accuracy or probability of correctness.

### 12.3 Semantic similarity
- Decimal, 2 places, no percent sign: `0.31`. Label `similarity`. 
- Explained as ordering information within a search. Not comparable across queries or models. No bars, rings, gradients, "high/medium/low", and no thresholds drawn by the UI.
- If the backend returns negative or unnormalized values, display as returned with 2 decimals; do not rescale.

### 12.4 Processing status
Use the exact set in §9.5. Percentages shown only if the API provides them; otherwise text only. `Indexing` always includes what's available: stage and indexed range if known.

### 12.5 Missing metadata
Use an em dash `—` with `title="Not available"`; never `0`, `N/A`, `null`, or `Unknown` (except in `Resolution` when the codec is unreadable: `—`). Missing thumbnail → placeholder tile. Missing duration for a processing video → `—`.

### 12.6 No-result states
Always state the scope (`in 3 videos`) and the user's query. Suggest rephrasing; do not assert absence. See §8B.

### 12.7 Partial indexing
- Any surface where a partially indexed video participates in search shows the `Results may be incomplete` notice (§8B).
- The Library marks `Partially indexed` (warning) with the indexed range.
- The Inspection Info tab lists `Indexed range`; the timeline shades the **unindexed** portion with a diagonal-hatch pattern in `border-subtle` on `bg-surface` and a tooltip `Not indexed yet` / `Not indexed`. (Functional hatch; allowed.)

### 12.8 Failed inference
- Frame-level failures (`Frames not analyzed: 12`) are reported in the Info tab (`warning-text`) and as a `caption` under the Library's row status if > 0 and the video is otherwise ready (`12 frames couldn't be analyzed`).
- Video-level failure: `failed` state with a short human reason and expandable technical detail.
- Failed videos are excluded from Search scope and labeled `Failed` where listed (Scope menu omits them).

### 12.9 Stale results
Results are stale if (a) the set of indexed videos/frames changed after the search was run (a scoped video finished indexing, was re-indexed, or was deleted), or (b) the results are older than 10 minutes. Show an `InlineAlert warning`: `Results are out of date. {reason}` + `Re-run` button. Stale results remain visible and usable (never auto-refresh under the user's cursor). Deleted-video rows are removed immediately and a `caption` `1 result removed because its video was deleted.` is shown.

### 12.10 Prohibited claims
Never display: overall accuracy, "AI confidence %", "match probability", fabricated counts, trends, or "insights". Counts shown must be literal counts from the API (e.g. `12 matches`, `3 videos`, `×2` detections in a frame).

---

## 13. Frontend implementation guidance

### 13.1 Stack
Next.js (App Router), TypeScript (strict), Tailwind CSS, `lucide-react` (icons), `@tanstack/react-query` (server state), `clsx` + `tailwind-merge` + `class-variance-authority` (variants), headless primitives from `@radix-ui/react-{dropdown-menu,dialog,tooltip,tabs,switch,popover}` (behavior/a11y only; **all styling is custom per this document**). No UI kit (no shadcn theme defaults, no MUI, no Chakra). Fonts via `next/font` (Geist, Geist Mono). Local state via React state; global UI state (uploads) via a small store (Zustand or context). No animation library.

### 13.2 Tokens in code
Define CSS variables in `globals.css` on `:root` (section 4–6 names) and map in `tailwind.config` under `theme.extend`:
- `colors`: `chrome, app, well, surface, raised, inset, hover, pressed, float, stage, border: {subtle, DEFAULT, strong}, text: {primary, secondary, tertiary, disabled}, accent: {DEFAULT, hover, active, subtle, border, fg, text}, success/warning/danger/processing: {DEFAULT, subtle, border, text}` → `var(--…)`.
- `borderRadius`: `xs: 2px, sm: 6px, md: 8px, full`. **Remove or never use** Tailwind's `rounded-lg/xl/2xl/3xl`.
- `spacing`, `fontSize` (with line-height and tracking tuples per §5), `fontFamily: { sans, mono }`, `boxShadow: { float }`, `transitionDuration: { fast: 80ms, base: 120ms, slow: 200ms }`, `transitionTimingFunction: { standard }`, `screens` per §6.9, `zIndex`.
- Provide utility classes `.num` (`font-mono tabular-nums`) and `.focus-ring` (global focus-visible style applied via a base layer rule on `:focus-visible`).
- Lint rule/CI check: reject raw HEX values and arbitrary values (`[#...]`, `rounded-[…]`) in component files.

### 13.3 Route and component hierarchy

```
app/
  layout.tsx                    // fonts, providers, <html> (light default)
  (marketing)/
    layout.tsx                  // MarketingShell (no sidebar, no app header)
    page.tsx                    // Home (/)
  (app)/
    layout.tsx                  // <AppShell>
    library/page.tsx
    search/page.tsx
    videos/[videoId]/page.tsx
    settings/page.tsx
components/
  shell/    AppShell, Sidebar, SidebarItem, Header, Breadcrumb, BottomNav, SkipLink
  ui/       Button, IconButton, Input, Switch, SegmentedControl, Tabs, Menu, Tooltip,
            Toast(+Toaster), Dialog, InlineAlert, EmptyState, Skeleton, Progress, Kbd,
            StatusIndicator, Spinner
  data/     Timestamp, TimeRange, ConfidenceValue, SimilarityValue, FrameThumb,
            ClassFilter, EvidenceLine, MissingValue
  library/  LibraryToolbar, VideoList, VideoRow, UploadRow, UploadDropzone,
            DeleteConfirmRow, useUploads (store)
  search/   QueryField, ScopeSelect, ResultList, ResultRow, FrameStrip,
            SearchIdle (examples+recent), PartialIndexNotice
  player/   VideoPlayer, PlayerControls, DetectionOverlay, MatchChip,
            Timeline, TimelineTrack, TimelineMarkers, PlayheadScrubber,
            SidePanel, MatchesTab, DetectionsTab, InfoTab, KeyboardShortcuts
  settings/ SettingsSection, SettingRow
  marketing/ MarketingHeader, Hero, HeroDemo, EvidenceCards, HowItWorks, ScopeLists, ClosingCta, MarketingFooter
lib/
  api/ (typed client, capability flags), format/ (timestamp, size, date),
  hooks/ (usePlayerTime, useVideoRect, useRecentQueries, usePrefs, usePolling)
```

### 13.4 Shared across screens (build once)
`StatusIndicator`, `Timestamp`/`TimeRange`, `ConfidenceValue`, `SimilarityValue`, `FrameThumb` (thumbnail + optional box overlay + timestamp chip), `ClassFilter` (used on Search and in the Detections tab), `EvidenceLine`, `InlineAlert`, `EmptyState`, `Skeleton` variants, `Menu`, `Button`, `Tooltip`, `Toast`. The Library `VideoRow`, `VideoCard`, and Search `ResultRow` share `FrameThumb`.

### 13.5 Component variants (CVA)
- `Button`: `variant: primary | secondary | ghost | destructive | destructiveSolid`, `size: sm | md | lg`, `loading`, `iconOnly`.
- `StatusIndicator`: `status: uploading | queued | indexing | ready | partial | failed`, `progress?`.
- `InlineAlert`: `tone: info | processing | warning | danger | success`.
- `FrameThumb`: `size: 64x36 | 96x54 | 208x117`, `boxes?`, `timestamp?`.
- `EmptyState`: `size: page | inline`.

### 13.6 Layout rules for implementation
- Use CSS grid for the shell and result rows; flex for toolbars. Avoid absolute positioning except overlays and markers.
- Tables: use semantic `<table>` for the desktop Library list.
- The player's overlay SVG uses a `viewBox="0 0 1 1"` with `preserveAspectRatio="none"` and `vector-effect: non-scaling-stroke`; compute the rect to match the rendered video.
- `useVideoRect` + `ResizeObserver`; `requestVideoFrameCallback` for time (fallback `requestAnimationFrame`), throttle React state updates to ≤ 15 Hz for the time readout (use refs/CSS vars for the playhead position to avoid re-rendering lists).
- Virtualize result and detection lists only if > 200 items; otherwise plain rendering.
- Persist: prefs, recent queries, side panel width in `localStorage`; everything else in URL/server.

### 13.7 Iconography conventions
- **Lucide only**, stroke width 1.5 (set globally), sizes 14/16/18/20/24 only. Default 16, inline-with-text 14, nav 16, search field 18, empty state 24.
- Icon color follows adjacent text color unless marked accent (active state, detection evidence).
- Semantic evidence icons are fixed: **Detection → `Square`**, **Semantic match → `Diamond`**. Don't repurpose them.
- No emoji anywhere in the UI. No filled icon variants. No multi-colored icons.

### 13.8 Animation principles
See §6.8 and §10.8. Implement via Tailwind `transition-*` utilities and a few keyframes (`pulse-soft`, `spin`, `toast-in`, `menu-in`). No JS-driven animations.

### 13.9 Performance rules
Lazy-load thumbnails (`loading="lazy"`, fixed dimensions, `decoding="async"`). Never autoplay video on hover previews. Debounce only resize/handlers, not search. Use `content-visibility: auto` on off-screen result rows if needed.

---

## 14. Explicit anti-patterns (prohibited)

Do not do any of the following. Reviewers should reject changes that include them.

1. **Generic AI-SaaS template styling:** hero banners inside the app, "Welcome back" greeting blocks, feature-tour carousels, sparkle icons, "AI-powered" labels.
2. **Excessive rounded cards:** no card around every section; no radii above 8px (`radius-md`) except `radius-full` on dots/switches. No `rounded-xl`, `rounded-2xl`.
3. **Gradients** on backgrounds, buttons, borders, text, or cards. (Only the functional black scrims over video.)
4. **Oversized hero sections** or large page titles; no type larger than 24px.
5. **Excessive pills/badges (and lock/upsell badges, plan buttons, workspace switchers copied from the reference):** status is dot + text; no filled pill per attribute; no tag clouds; no `New`/`Beta` badges.
6. **Arbitrary accent colors, and any purple/violet/indigo/magenta (including selection, focus, links, avatars, charts):** only the teal accent family (`#0B7285` light / `#46B5C9` dark zone); no per-feature or per-class colors; semantic colors only for status.
7. **Glassmorphism, backdrop blur, glowing borders, neon, or soft colored shadows.** Dialog backdrops are flat scrims.
8. **Emoji as icons**, or Unicode symbols (✓ ✕ ★) as icons; use Lucide.
9. **Random or decorative animation:** no bouncing, staggered list entrances, parallax, confetti, animated gradients, or number count-ups. Motion only for state change per §10.8.
10. **Inconsistent border radii:** only 2/4/6 per §6.4. No mixing of arbitrary values.
11. **Huge empty spaces** without purpose; no vertically centered query field "hero"; no 120px section gaps. Max section gap inside the app is 32px; the Home page uses 96px section padding per §8E and nowhere else.
12. **Redundant dashboard metrics:** no "Total videos", "Hours indexed", "Searches today" cards, no sparkline decorations, no usage graphs.
13. **Fake charts, placeholder analytics, fabricated accuracy numbers**, mock activity feeds, "recent activity" lists, or lorem ipsum in shipped UI.
14. **Decorative elements competing with the player:** no colored panels around the video, no shadows/glows on the stage, no animated chrome near it, no accent-filled controls near the stage except the single active state.
15. **Multiple competing primary actions:** one primary button per view. Header **Upload video** XOR the empty-state `Choose files`; the Search page's primary is the `Search` button inside the field.
16. **Inconsistent typography:** only the tokens in §5; no ad-hoc font sizes/weights; no mixing mono for non-data text; no sans for timestamps.
17. **Buttons with no real functionality:** no disabled `Share`, `Export`, `Compare`, `Upgrade`, `Settings` placeholders, no `Coming soon`. If the backend can't do it, the UI doesn't show it.
18. **Presenting similarity as probability:** no percent signs, no gauges, no color-scaled confidence, no "likely/very likely" labels for semantic scores.
19. **Mixing evidence types:** boxes on frames that were retrieved only semantically; a diamond marker for a detection; the same label for `conf` and `similarity`.
20. **Navigation items without features** (no Dashboard, Analytics, Alerts, Cameras, Team, Billing).
21. **Hover-only interactions** without a keyboard/touch equivalent.
22. **Toasts as the only record** of an important event (failures must also persist inline).
23. **Card-grid library, masonry layouts, or infinite scroll** in the MVP.
24. **Component library default themes** (shadcn/MUI defaults) leaking through.
25. **Home page filler:** logo walls, testimonials, statistics, pricing tables, "contact sales", newsletter forms, fake window chrome, device mockups, stock photography, gradient or video-loop heroes, auto-playing audio.
26. **Hand-typed demo data:** every number, box, and timestamp on the Home page must come from a real run of the pipeline on the sample clip.
27. **Copying another product's marketing:** reuse structure, not wording, imagery, or brand colors.

---

## 15. Final implementation checklist for the coding agent

### Tokens & foundation
- [ ] All colors defined as CSS variables exactly as in §4; Tailwind maps semantic names; no raw HEX in components.
- [ ] Light default tokens on `:root`, dark tokens on `[data-zone="dark"]` (rail + Inspection player column); `color-scheme` set accordingly; no theme toggle; **no purple anywhere**.
- [ ] Geist + Geist Mono loaded via `next/font` with the specified fallbacks; base size 14px; type tokens in §5 implemented as Tailwind `fontSize` entries.
- [ ] Spacing scale, radii (2/4/6/full), borders (1px), shadow-float, z-index, motion tokens, and breakpoints configured; Tailwind's default large radii unused.
- [ ] Global `:focus-visible` outline (`2px accent`, offset 2px) in a base layer.
- [ ] `.num` utility with tabular numerals; all data values use Mono.
- [ ] `prefers-reduced-motion` handled globally.

### Shell
- [ ] Grid shell with fixed sidebar (216/52/hidden) and 48px header; only `<main>` scrolls (except inspection ≥ lg).
- [ ] Nav: Library, Search, Settings only; correct active state (including `/videos/*` → Library); processing dot only when work in progress.
- [ ] Header title/breadcrumb rules per route; max one primary action.
- [ ] Bottom nav < 768px; skip link; landmarks.

### Library
- [ ] Dense table-style list with 96×54 thumbnails, columns and responsive hiding per §8A.
- [ ] Filter, status filter, sort, count; `Load 50 more`.
- [ ] Upload via button, drop anywhere, multiple files, concurrency 2, optimistic rows, progress lines, cancel, inline validation failures.
- [ ] All six video states rendered through one `VideoRow`; polling with backoff and visibility pause.
- [ ] First-run empty state with the single primary; filtered-empty state.
- [ ] Row actions menu; inline delete confirmation with Cancel focused; collapse animation; failure handling.

### Search
- [ ] 56px query field with submit-on-Enter, Search button + `⏎` Kbd, clear, `/` focus, Esc behavior, `↓` to results; URL-synced state.
- [ ] Scope dropdown, API-driven class toggles, `Clear filters`; no other filters.
- [ ] Idle state (examples + recent), no-videos state, loading skeletons, long-wait message.
- [ ] Partial-indexing, partial, and stale `InlineAlert`s.
- [ ] `ResultRow` per §8B: rank, 208×117 thumbnail with timestamp chip and detection box preview, body with distinct Detection (`Square`) and Frame match (`Diamond`) evidence lines, `conf` vs `similarity` formatting, tooltips with the exact explanatory copy, expandable frame strip, roving keyboard navigation.
- [ ] Sort, `Show 20 more`, empty results, failure with Retry; scroll/expansion restoration and re-find highlight on return.

### Inspection
- [ ] Layout and proportions per §8C; panel resizable (320–480); stacked below `lg`; sticky stage on mobile.
- [ ] Native `<video>` with custom controls bar; correct letterbox-aware SVG overlay; boxes styled per spec (1.5px, label tag, hover/selected states, dimming of non-selected, honest sampling window).
- [ ] Overlay toggles (Boxes `B`, Labels `L`) with `aria-pressed`.
- [ ] Timeline: ruler, Matches track (diamonds), Detections track (square ticks), scrub bar, playhead (neutral), hover tooltip, marker tooltips, unindexed hatch, legend, empty-track messages, keyboard slider semantics.
- [ ] Side panel with Matches / Detections / Info tabs, selection sync with stage and timeline, seek-and-pause behavior, `[`/`]` navigation.
- [ ] Semantic match chip on the stage; no box for semantic matches.
- [ ] Delete via dialog; breadcrumb and Back return to search with state restored.
- [ ] Keyboard map in §10.4 fully implemented; shortcuts popover.

### Settings
- [ ] Display, Search, About always; Processing and Data only under their capability flags; immediate apply with inline `Saved`; no invented model controls.

### Components & states
- [ ] Every component in §9 has default/hover/focus/active/disabled/loading states implemented as specified.
- [ ] Status shown as dot + text (no pills); progress lines 2px; tabs with 2px accent underline; menus/tooltips/toasts/dialog as specified; toast policy (errors persist, deduped, bottom-right).
- [ ] `ConfidenceValue` and `SimilarityValue` implemented as distinct components; no `%`, bars, or color scales.

### Data honesty
- [ ] Timestamp/date/size formatting utilities per §12 with unit tests (`<1h`, `≥1h`, ranges, tenths).
- [ ] Missing values render `—`; no `0`/`N/A`.
- [ ] Partial indexing, failed frames, stale results, and no-result copy implemented exactly; no fabricated metrics anywhere.

### Accessibility & responsive
- [ ] Contrast ratios verified (§4.4); target sizes (28px desktop / 44px coarse).
- [ ] Live-region announcements for search, seek, status changes; accessible names for rows/icons/timeline.
- [ ] Verified at 1440, 1280, 1024, 768, 390 widths and at 200% zoom; no horizontal page scroll.

### Final self-review (run before delivering)
- [ ] Library `List`/`Board` tabs, board columns, and `VideoCard` implemented per §8A; no `Insights` tab.
- [ ] Home page (`/`) built per §8E: marketing layout, top bar, hero with real-data demo (reduced-motion static state, pause control, sample-footage credit), two-evidence cards, how-it-works with real screenshots, scope lists, closing band, footer.
- [ ] Library defaults to `Grid` (`VideoCard`), with `List` and `Board`; Settings default-view control updated.
- [ ] Page title 20px, query field 56px, result thumbnails 208×117 applied everywhere.
- [ ] Scan for violations of §14 (gradients, large radii, pills, emoji, extra nav, placeholder buttons).
- [ ] Confirm only one primary button per view.
- [ ] Confirm squares always mean detection and diamonds always mean semantic match.
- [ ] Confirm no component invents colors, radii, or font sizes outside tokens.

---

## Appendix A — Document review notes (contradictions resolved)

- **Playhead color vs accent:** accent is reserved for detections/active states; the playhead is neutral (`text-primary`) to stay visible over accent ticks. Applied consistently in §8C and §4.4.
- **Home page vs. app density:** large type and 96px spacing exist only on `/` (§8E); the app keeps its compact scale.
- **Primary buttons:** Library header action is hidden in the first-run empty state in favor of the in-content primary to avoid two primaries (§8A, §14.15).
- **Modal policy:** the only modal is delete-from-inspection; all else inline (§9.12, §10.6).
- **Class filter effect:** filters restrict results/boxes by detector class everywhere they appear (Search and the Detections tab) with identical semantics (§8B, §8C).
- **Toast scope:** toast events enumerated (ready, deleted, indexing failed). Upload failures and validation are inline (§9.10, §8A).
- **Focus on arrival:** Search focuses the field only when `q` is absent; Inspection focuses Play/Pause; others focus the heading container (§10.5, §10.1).
- **Sidebar active for `/videos/*`:** Library is highlighted; the breadcrumb disambiguates when the user came from Search (§7.2, §7.3).
- **Themes:** light work surface with dark navigation rail and dark player zone, both driven by the same semantic variable names; no user-facing theme toggle (§3).