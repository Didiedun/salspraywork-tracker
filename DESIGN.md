---
version: beta
name: Digital Depot — workshop tool
description: |
  Digital Depot is a job tracker for Malaysian body-and-paint workshops (bengkel).
  It is used on phones in bright workshop light by owners, workers and customers,
  so the system is built for legibility first: ink on primer-grey, one petrol
  accent for actions and progress, and status colours that only ever mean money
  or time. Headings, figures and number plates are set in Barlow Semi Condensed,
  a face drawn from licence plates and road signs; interface text is Archivo.
  Tokens live in tailwind.config.js; shared component classes live in src/index.css.

colors:
  primary: "#0B5E78"
  primary-deep: "#084A5F"
  on-primary: "#ffffff"
  ink: "#141B1F"
  body: "#2A3337"
  charcoal: "#3F4A50"
  mute: "#56626A"
  ash: "#616D75"
  stone: "#A9B4BA"
  canvas: "#EEF1F2"
  surface-bone: "#E3E8EA"
  surface-card: "#ffffff"
  surface-dark: "#1A2327"
  surface-deep: "#11181B"
  on-dark: "#F2F5F6"
  on-dark-mute: "rgba(242,245,246,0.72)"
  hairline: "#D7DEE1"
  hairline-strong: "#141B1F"
  divider-dark: "rgba(242,245,246,0.14)"
  success: "#146C45"
  warning: "#B45309"
  danger: "#B91C1C"

typography:
  display-hero:
    fontFamily: Barlow Semi Condensed
    fontSize: clamp(40px, 4.8vw, 67px)
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: -0.01em
  display-page:
    fontFamily: Barlow Semi Condensed
    fontSize: 30px / 36px from sm
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  title:
    fontFamily: Barlow Semi Condensed
    fontSize: 16px–20px
    fontWeight: 700
    lineHeight: 1.3
  figure:
    fontFamily: Barlow Semi Condensed
    fontSize: 24px–30px
    fontWeight: 700
    lineHeight: 1
    fontFeature: tabular-nums
  body-md:
    fontFamily: Archivo
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-lg:
    fontFamily: Archivo
    fontSize: 16px–18px
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Archivo
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
  kicker:
    fontFamily: Archivo
    fontSize: 12px
    fontWeight: 700
    letterSpacing: 0.14em
    textTransform: uppercase
  plate:
    fontFamily: Barlow Semi Condensed
    fontWeight: 700
    letterSpacing: 0.06em
    textTransform: uppercase

rounded:
  sm: 6px
  md: 10px
  lg: 16px
  xl: 12px
  2xl: 16px
  full: 9999px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    hover: "{colors.primary-deep}"
    rounded: "{rounded.full} in forms and cards, {rounded.xl} for .ui-primary"
    minHeight: 44px
  button-on-dark:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    use: primary action on surface-deep bands (landing close, footer)
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.charcoal}"
    border: 1px solid {colors.hairline}
  button-advance:
    backgroundColor: primary at 10%
    textColor: "{colors.primary}"
    border: 1px solid primary at 25%
  segmented-control:
    track: "{colors.surface-bone} with {colors.hairline} border"
    selected: "{colors.surface-dark} background, {colors.on-dark} text"
  text-input:
    backgroundColor: "{colors.canvas}"
    border: 1px solid {colors.hairline}
    focus: border {colors.primary} + 2px ring primary at 20%
  plate:
    className: .plate
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    typography: "{typography.plate}"
    note: sized in em, so `plate text-2xl` / `plate text-[13px]` scale the whole chip
  status-badge:
    unpaid: red-50 / red-700 / red-200
    deposit: amber-50 / amber-700 / amber-200
    paid: emerald-50 / {colors.success} / emerald-200
  info-callout:
    backgroundColor: primary at 5%
    border: 1px solid primary at 20%
  sidebar:
    backgroundColor: "{colors.surface-deep}"
    item: "{colors.on-dark} at 70%"
    item-active: "{colors.on-dark} background, {colors.ink} text"
---

## Overview

The interface should feel like a well-made workshop tool, not a startup landing
page. It digitises the paper job card that hangs on a car in the bay, so it
borrows from that world: ink on grey primer, a single enamel-blue accent, and
number plates that look like number plates.

## Colour

- **Petrol (`primary`)** is the only brand colour. Use it for primary actions,
  progress (stage bar), links, selected-but-not-final states and informational
  callouts. It is deliberately not red, amber or green.
- **Status colours carry meaning, never decoration.** Red = unpaid, overdue,
  destructive, error. Amber = deposit / partly paid, stale, warning. Green = paid,
  ready, success. Do not use them for icons, categories or emphasis.
- **Neutrals** are primer greys with a faint petrol cast. `canvas` is the page,
  `surface-card` (white) holds content, `surface-bone` is for insets and tracks.
- **Dark bands** (`surface-deep`: sidebar, footer, closing CTA, auth panel) use
  light buttons and light focus rings; petrol on near-black is only 2.5:1.
- Categories (expense types, EPF/SOCSO/EIS) are told apart by their label, not
  by colour — use the neutral chip (`bg-surface-bone text-charcoal`).

### Contrast

Text colours are chosen to meet WCAG AA (4.5:1) on the surfaces they sit on.
Rules that keep it so:

- Red text is `red-700`, amber text is `amber-700` (`amber-800` on `canvas`),
  green text is `badge-success`. `red-500/600` and `amber-500/600` are for icons only.
- White text needs a background at least as dark as `red-600`, `amber-700`,
  `emerald-700`, `badge-success` or `primary`.
- `ash` is the lightest colour allowed for readable text; `stone` is for
  borders, disabled fills and decoration only.
- On dark bands, text is `on-dark` at 60% opacity or more.

## Typography

- **Barlow Semi Condensed 700** — page and section headings, big figures,
  number plates, logo marks. It is narrow, so step it up one size next to
  Archivo (a 14px Archivo label pairs with a 16px Barlow title).
- **Archivo 400–700** — everything else. Numbers use tabular figures (set
  globally on `body`).
- **System monospace** — only for literal codes (invite codes, URLs, IC/EPF
  numbers, SQL).
- Kickers (`.page-kicker`) are small, bold, tracked uppercase Archivo in `mute`.
  They label; they do not decorate.

## Number plates

Malaysian plates are white characters on black. Any vehicle identifier is set
with the `.plate` class (`src/index.css`), which draws the plate chip in em units
so it scales with the text size it is given. Plates are the fastest way for a
worker to match a card to a car, so keep them prominent on job cards.

## Shape and depth

Cards are white on the grey canvas with a 1px `hairline` border and at most a
hairline shadow. Controls are pills; cards use 12–16px corners. Overlays dim with
`ink` at 40% and a small blur. There are no gradients, glows or dotted textures.

## Patterns

The app is used one-handed in a workshop, so the common path is short and the
rare path is one level down.

- **Navigation.** Sidebar on desktop; on phones a bottom tab bar (`.app-tabbar`)
  with the same five pages. Portal, tutorial, feedback, language and logout
  live in the menu drawer. Every page opens with `PageHeader`.
- **Primary action.** One per screen. On phones the dashboard's "Kerja Baru" is
  a floating `.fab` above the tab bar.
- **Filtering.** Tap-to-filter summary tiles (`.attention-tile`) feed a single
  filter state shared with the chip row (`.chip`, `.chip-on`). A two-way
  choice (Aktif/Selesai, Walk-in/Booking, page tabs) is a `.segmented` control.
- **Job card.** Facts in fixed positions (`.job-facts`), one advance button,
  secondary actions in the bottom bar (`.job-card-actions`). Destructive
  actions are never on the card; delete lives inside the edit form.
- **Feedback.** Never `alert()` / `confirm()`. Use `useNotify()` from
  `src/context/NotifyContext.jsx`: `toast.success/error/info` for results and
  `await confirm({ title, message, tone: 'danger' })` before anything
  irreversible. Plan limits go through `usePlanGate()`, which offers the
  upgrade (`/settings#langganan`).
- **Forms.** Group long forms into titled `.form-section`s, mark required
  fields with `*`, link every visible label to its field (`htmlFor`/`id`),
  and give label-less fields (search, inline edits) an `aria-label`.

## Do and don't

- Do keep one accent. If two petrol elements compete, make one secondary.
- Do reserve red/amber/green for money and time states — not payment methods,
  categories or icons.
- Do use `.plate` for plates, `.ui-primary` / `.ui-secondary` for buttons.
- Don't add tinted icon wells in several colours ("rainbow" features, tutorials).
- Don't use emoji as UI icons — use lucide-react icons.
- Don't introduce new font families; Barlow Semi Condensed + Archivo cover it.
