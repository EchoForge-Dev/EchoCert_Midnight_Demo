# EchoForgeStyle — Midnight Edition
## The Unified Design Language for All Echo Products · Midnight Line

> **深不见底的宁静 · 工程图纸感 · 磨砂玻璃质感 · 证而不泄**
>
> IBM Plex Mono — Monochrome — Glass Morphism — Engineering Precision — Zero-Knowledge
>
> **Version:** 1.0 (Midnight Line)
> **Derived from:** Main repo `DESIGN.md` v2.1 (Cardano line)
> **Last Updated:** 2026-08-05
> **Status:** Active
>
> This document is the single source of truth for design in the **EchoForge Midnight line**
> (`m.echoforgellc.tech`). The core system (philosophy, tokens, typography, glass, animation)
> is **shared with the main repo** — if a shared token changes, change it in both files in the
> same sitting; divergence is a bug. Midnight-specific sections (Privacy & Proof UI, wallet
> connection, product line) are owned by this file only.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Glass Morphism System](#glass-morphism-system)
5. [Component Patterns](#component-patterns)
6. [Privacy & Proof UI](#privacy--proof-ui) ← Midnight-specific
7. [Wallet Connection](#wallet-connection) ← Midnight-specific
8. [Animation Principles](#animation-principles)
9. [Layout & Spacing](#layout--spacing)
10. [Dark Mode / Light Mode](#dark-mode--light-mode)
11. [Products — Midnight Line](#products--midnight-line)
12. [Brand Assets](#brand-assets)
13. [Technical Stack Notes](#technical-stack-notes)
14. [Implementation Checklist](#implementation-checklist)
15. [File References](#file-references)

---

## Design Philosophy

### Four Pillars

The first three pillars are shared with every EchoForge product. The fourth is what the
Midnight line adds — and it is the reason this line exists.

#### 1. 深不见底的宁静 — Depth of Silence
Infinite black (or pure white in light mode) backgrounds create visual depth without
distraction. Negative space is intentional stillness. Users focus on what matters: data,
interaction, proof. No decorative color, no noise.

#### 2. 工程图纸感 — Engineering Precision
Corner markers (`⌐`), guide lines, and monospace fonts (IBM Plex Mono) evoke technical
drawings and engineering blueprints. Grid patterns and architectural lines communicate
structure. Every element has a purpose — nothing is accidental.

#### 3. 磨砂玻璃质感 — Glass Morphism
Semi-transparent containers with backdrop blur create floating layers. Not frosted —
translucent, revealing depth. Subtle glows and inset shadows add dimensionality without
clutter. Light plays through glass; information remains readable.

#### 4. 证而不泄 — Prove, Don't Reveal
On Midnight, the product's job is to prove statements without exposing the data behind
them. The UI must make this legible: **every user-visible datum is labeled by where it
lives** (local / shielded / public), and **nothing crosses a privacy boundary without an
explicit, designed confirmation**. Privacy is not a settings page — it is the interface.
Data minimization is All for Simple applied to data.

### Design Principles
- **Monochrome first**: Black, white, gray. Green for success only, yellow for warnings *and disclosure confirmations*.
- **IBM Plex Mono everywhere**: The typeface for headers, nav, labels, data, body — everywhere. CJK fallbacks for CJK characters only.
- **Dual mode**: Dark mode is the canonical design. Light mode must be equally polished.
- **Zero decoration**: No gradients for aesthetics, no rounded decorative borders. Only functional geometry.
- **Breathing, not flashing**: Animations at 2–6 second cycles. Never jarring. Always purposeful.
- **Honest waiting**: ZK proof generation takes real time. Never fake progress; design the wait.

---

## Color Palette

### Core Tokens (shared with main repo)

| Token | Dark Mode | Light Mode | Purpose |
|---|---|---|---|
| `--bg-primary` | `#000000` | `#FFFFFF` | Page background |
| `--bg-secondary` | `#0A0A0A` | `#F5F5F5` | Section backgrounds |
| `--text-primary` | `#FFFFFF` | `#000000` | Primary text, borders, highlights |
| `--text-secondary` | `#808080` | `#808080` | Secondary text, hints, labels |
| `--border-color` | `#262626` | `#D9D9D9` | Dividers, separators |
| `--glass-bg` | `rgba(0,0,0,0.4)` | `rgba(255,255,255,0.4)` | Glass container backgrounds |
| `--glass-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Glass container borders |
| `--card-bg` | `rgba(26,26,26,0.8)` | `rgba(245,245,245,0.8)` | Product card backgrounds |

### Named Colors (Tailwind Tokens)

```css
absolute-zero:     #000000  /* Pure void */
titanium-white:    #FFFFFF  /* Pure light */
echo-gray:         #808080  /* The middle */
echo-mid-dark:     #262626  /* Dark border */
echo-light-border: #D9D9D9  /* Light border */
```

### Opacity Scale

```css
white/5    rgba(255,255,255,0.05)  /* Barely visible guide */
white/8    rgba(255,255,255,0.08)  /* Glass border */
white/10   rgba(255,255,255,0.10)  /* Subtle border */
white/15   rgba(255,255,255,0.15)  /* Active border */
white/20   rgba(255,255,255,0.20)  /* Highlighted border */
white/40   rgba(255,255,255,0.40)  /* Secondary text */
white/60   rgba(255,255,255,0.60)  /* Tertiary text */
white/80   rgba(255,255,255,0.80)  /* Primary text variation */
```

### Semantic Colors (Use Sparingly)

| Color | Value | Midnight-line meaning |
|---|---|---|
| Success green | `#4EDE80` | Proof verified · transaction confirmed · wallet connected (breathing dot) |
| Warning yellow | `#EAB308` | Warnings **and disclosure confirmations** — anything about to become more public |
| Monochrome pulse | white/gray | PROVING and other in-progress states — work is neither success nor warning |

- **Never use**: blue, red, purple, orange as UI colors.
- Disclosure gets yellow deliberately: crossing a privacy boundary is the one action in a
  Midnight product that deserves friction.

---

## Typography

### Primary Typeface: IBM Plex Mono

IBM Plex Mono is used for **all text** in Echo products. It communicates precision,
technical authority, and minimalist engineering intent.

```css
font-family: 'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace;
```

Tailwind token: `font-mono` / `font-display`

**When to use IBM Plex Mono:**
- Page titles and section headers
- Navigation items (always uppercase, `tracking-[0.15em]`)
- Product names, labels, values
- All data: hashes, addresses (Bech32m), proofs, token amounts
- Button text (uppercase, tracked)
- Body text and descriptions

### CJK Exception

User-visible text ships in four languages: **EN (primary), 简体中文, 繁體中文, 日本語.**
For CJK characters only, add the matching Noto Sans fallback:

```css
/* Simplified Chinese */  font-family: 'IBM Plex Mono', 'Noto Sans SC', monospace;
/* Traditional Chinese */ font-family: 'IBM Plex Mono', 'Noto Sans TC', monospace;
/* Japanese */            font-family: 'IBM Plex Mono', 'Noto Sans JP', monospace;
```

**Never use Noto Sans SC/TC/JP for Latin text.** Latin is always IBM Plex Mono.

### Typography Scale

| Role | Size | Weight | Tracking | Transform |
|---|---|---|---|---|
| Hero (EN) | `text-9xl` → `text-6xl` | `font-black` | `-0.05em` | none |
| Hero (CJK) | `text-9xl` → `text-6xl` | `font-black` | `-0.03em` | none |
| Section Title | `text-2xl` → `text-3xl` | `font-bold` | `0.2em` | uppercase |
| Card Title | `text-base` | `font-semibold` | `0.1em` | uppercase |
| Nav Item | `text-[11px]` | `font-medium` | `0.15em` | uppercase |
| Body | `text-sm` | `font-normal` | `0.01em` | none |
| Label | `text-[10px]` | `font-bold` | `0.15em` | uppercase |
| Micro | `text-[10px]` | `font-normal` | `0.05em` | none |

### Typography Classes (globals.css)

```css
/* Section headings */
.text-tech {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.625rem;  /* 10px */
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

/* Code / data display */
.text-mono-code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

/* Engineering labels */
.label-tech {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.5625rem;  /* 9px */
  color: rgba(128,128,128,1);
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

/* Data values */
.value-tech {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6875rem;  /* 11px */
  color: rgba(255,255,255,0.80);
  word-break: break-all;
}
```

---

## Glass Morphism System

### Core Concept

Three layers compose every glass container:

```
Layer 1: backdrop-filter: blur(12px) + linear-gradient background
Layer 2: border: 1px solid rgba(255,255,255,0.10)
Layer 3: box-shadow outer (depth) + inset (inner glow)
```

### Panel Variants

#### Standard Glass Panel
```css
.glass-panel {
  background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    0 8px 32px rgba(31, 38, 135, 0.10),
    inset 0 0 32px rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
}
```
**Use for:** Main cards, containers, modals

#### Subtle Glass Panel
```css
.glass-panel-subtle {
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow:
    0 4px 16px rgba(31, 38, 135, 0.05),
    inset 0 0 16px rgba(255, 255, 255, 0.03);
  border-radius: 0.75rem;
}
```
**Use for:** Nested content, secondary info boxes

#### Strong Glass Panel
```css
.glass-panel-strong {
  background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03));
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow:
    0 12px 48px rgba(31, 38, 135, 0.15),
    inset 0 0 48px rgba(255, 255, 255, 0.08);
  border-radius: 1.5rem;
}
```
**Use for:** Modals, primary action zones, disclosure confirmations

### Glass Rules
- ✅ Always pair `backdrop-filter: blur` with translucent background
- ✅ Use inset glow for inner depth
- ✅ Add engineering corner markers to major glass containers
- ❌ Never use fully opaque backgrounds with blur
- ❌ Never nest `.glass-panel` inside another `.glass-panel` — use subtle variant

---

## Component Patterns

### Engineering Corner Markers

Every major container features corner markers inspired by technical drawings.

```css
.corner-tl { position: absolute; top: 8px; left: 8px; width: 12px; height: 12px;
  border-top: 1px solid rgba(128,128,128,0.3); border-left: 1px solid rgba(128,128,128,0.3); }
.corner-tr { position: absolute; top: 8px; right: 8px; width: 12px; height: 12px;
  border-top: 1px solid rgba(128,128,128,0.3); border-right: 1px solid rgba(128,128,128,0.3); }
.corner-bl { position: absolute; bottom: 8px; left: 8px; width: 12px; height: 12px;
  border-bottom: 1px solid rgba(128,128,128,0.3); border-left: 1px solid rgba(128,128,128,0.3); }
.corner-br { position: absolute; bottom: 8px; right: 8px; width: 12px; height: 12px;
  border-bottom: 1px solid rgba(128,128,128,0.3); border-right: 1px solid rgba(128,128,128,0.3); }
```

```jsx
<div className="relative overflow-hidden">
  <span className="corner-tl" />
  <span className="corner-tr" />
  <span className="corner-bl" />
  <span className="corner-br" />
  {/* content */}
</div>
```

### Button System

#### Glass Button (Secondary)
```jsx
<button
  className="h-9 px-5 rounded-full text-[11px] font-mono font-medium tracking-[0.12em] uppercase transition-all duration-200"
  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
>
  ACTION
</button>
```

#### Primary Button (Inverted Fill)
```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="h-9 px-5 rounded-full text-[11px] font-mono font-semibold tracking-[0.12em] uppercase"
  style={{
    border: '1px solid var(--text-primary)',
    color: 'var(--text-primary)',
    background: 'transparent',
  }}
  onMouseEnter={e => {
    e.currentTarget.style.background = 'var(--text-primary)';
    e.currentTarget.style.color = 'var(--bg-primary)';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.background = 'transparent';
    e.currentTarget.style.color = 'var(--text-primary)';
  }}
>
  CONFIRM
</motion.button>
```

### Coming Soon Modal

Used when a product feature is not yet available. Same pattern as the main line —
triggered by clicking nav items for unreleased products.

```
ECHO_PRODUCT
ECHO_{PRODUCT_NAME}
────────────────────
STATUS: COMING_SOON
[ CLICK TO DISMISS ]
```

Glass panel + corner markers, IBM Plex Mono, auto-dismisses after 2.5 seconds; backdrop
click also dismisses.

### Status Indicators

```jsx
{/* Active / confirmed — green breathing */}
<motion.div
  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
  style={{ width: 6, height: 6, borderRadius: '50%', background: '#4EDE80' }}
/>

{/* Inactive — gray static */}
<div style={{ width: 6, height: 6, borderRadius: '50%', background: '#808080' }} />

{/* Warning / disclosure — yellow pulse */}
<motion.div
  animate={{ opacity: [1, 0.3, 1] }}
  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
  style={{ width: 6, height: 6, borderRadius: '50%', background: '#EAB308' }}
/>

{/* Proving — white breathing (monochrome: work in progress) */}
<motion.div
  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
  style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-primary)' }}
/>
```

### Divider Lines

```jsx
{/* Technical divider — gradient fade */}
<div style={{
  height: 1,
  background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)'
}} />

{/* Simple divider */}
<div style={{ height: 1, background: 'var(--border-color)' }} />
```

### Progress Bar

```jsx
<div style={{
  height: 2,
  background: 'var(--border-color)',
  borderRadius: 1,
  overflow: 'hidden',
}}>
  <motion.div
    style={{ height: '100%', background: 'var(--text-primary)', borderRadius: 1 }}
    animate={{ width: `${percent}%` }}
    transition={{ ease: 'easeOut', duration: 0.4 }}
  />
</div>
```

Use determinate bars only for real progress (e.g. DUST balance vs cap). Proof generation
has no reliable percentage — use the indeterminate PROVING pattern instead (see below).

### Label + Value Pattern

```jsx
<div>
  <p className="label-tech">DOCUMENT HASH</p>
  <p className="value-tech break-all">aabbccdd...eeff</p>
</div>
```

On the Midnight line every label carries a privacy scope marker — see next section.

---

## Privacy & Proof UI

*Midnight-specific. This section is what pillar 4 looks like in components.*

### Three-Level Data Classification

Every user-visible datum belongs to exactly one scope, and the UI must say which:

| Marker | Scope | Meaning | Visual |
|---|---|---|---|
| `○ LOCAL` | Local private state | Witness data. Never leaves the device. | Gray outline circle, `--text-secondary` |
| `◐ SHIELDED` | Shielded on-chain | On the ledger, cryptographically shielded. | Half-filled circle, `--text-primary` at 60% |
| `● PUBLIC` | Public ledger | Plainly readable by anyone, forever. | Filled circle, `--text-primary` |

```jsx
<div>
  <p className="label-tech">
    DATE_OF_BIRTH <span style={{ color: 'var(--text-secondary)' }}>○ LOCAL</span>
  </p>
  <p className="value-tech">2012-**-**</p>
</div>
```

Rules:
- The marker sits inside the `label-tech` line, never as a separate badge row.
- Markers are monochrome. Privacy scope is structure, not decoration.
- If a screen shows data with mixed scopes, group by scope with divider lines —
  LOCAL first, PUBLIC last.

### Disclosure Confirmation

Mirrors Compact's `disclose()` at the interface level: **no datum moves outward
(LOCAL → SHIELDED, LOCAL → PUBLIC, SHIELDED → PUBLIC) without an explicit confirmation
that lists exactly what becomes visible, to whom, irreversibly.**

Design:
- `.glass-panel-strong` modal with corner markers
- Yellow pulse dot + `DISCLOSURE` label (`#EAB308` — the one sanctioned use of warning
  color for a non-error state)
- Body: table of datum → old scope → new scope
- Confirm button is the standard primary button, but never pre-focused; cancel is default
- Copy states permanence plainly: `THIS CANNOT BE UNDONE. PUBLIC IS FOREVER.`

```
◉ DISCLOSURE
────────────────────────────
AGE_OVER_18      ○ LOCAL → ● PUBLIC
────────────────────────────
THIS CANNOT BE UNDONE.
[ CANCEL ]        [ DISCLOSE ]
```

### Proof Lifecycle States

A Midnight transaction passes through distinct states the user must be able to read at a
glance. Canonical state labels (uppercase, `text-tech`):

| State | Label | Visual |
|---|---|---|
| 1. Local input | `DRAFT` | Static gray dot |
| 2. Generating ZK proof | `PROVING` | White breathing dot + spinning ring + scan line overlay |
| 3. Wallet balancing / signing | `SIGNING` | White breathing dot, wallet prompt open |
| 4. Sent to network | `SUBMITTED` | White static dot |
| 5. On chain | `CONFIRMED` | Green breathing dot |
| ✗ Any failure | `FAILED: {reason}` | Yellow pulse dot, error text in `value-tech` |

PROVING rules — proof generation takes real time (seconds to minutes):
- **Never block silently.** The spinning ring (4s linear) + scan line (2s) run the whole time.
- **Never fake a percentage.** Indeterminate animation + elapsed time counter (`text-mono-code`).
- The UI stays interactive where safe; the proving panel is the only busy region.
- Show which prover is working: `PROVING VIA WALLET` or `PROVING VIA LOCAL PROOF SERVER`.

### Fees & Balances

- Fees are paid in DUST (testnet: tDUST). Display amounts in `value-tech`, unit suffix in
  `label-tech`: `1.204 tDUST`.
- DUST balance has a cap (derived from NIGHT delegation) — render as the standard 2px
  progress bar: balance vs cap. This is the sanctioned determinate-progress use case.
- Shielded and unshielded balances are different things. Never sum them into one number;
  list them under their scope markers (`◐ SHIELDED` / `● PUBLIC`).

### Network Badge

The Midnight line runs on test networks. Every header shows a network badge so no one
mistakes preview for production:

```jsx
<span className="label-tech" style={{ border: '1px solid var(--border-color)',
  padding: '2px 8px', borderRadius: 9999 }}>
  NET: PREVIEW
</span>
```

Values follow the wallet's `networkId`: `UNDEPLOYED` (local), `PREVIEW`, `PREPROD`.
Read it from the wallet configuration — never hardcode.

---

## Wallet Connection

The Midnight line uses the **Midnight DApp Connector API** (Lace wallet, Midnight
edition). This replaces the main line's CIP-30 pattern; the visual design is identical,
only the plumbing differs.

**Behavior:**
- Opens as a centered glass modal with backdrop blur, corner markers
- Detects installed wallets at runtime by **enumerating `window.midnight`** and matching
  on `name`/`rdns` — wallets inject under per-wallet keys, so never assume a fixed key
  (Lace's `window.midnight.mnLace` alias is a convenience, not a contract)
- Shows wallet icon (from the wallet's `icon` property) + name
- `connect(networkId)` targets the network selected for the app (`undeployed` /
  `preview` / `preprod`); the wallet prompts the user with **Always** or **Only once**
- Spinning ring animation during the connection attempt
- `PermissionRejected` is a normal outcome, not an error screen — return to the modal
  with a quiet `label-tech` note
- On success: header button turns filled (inverted) with green breathing dot + wallet name
- On disconnect: returns to outline button state

**Connected state in Header:**
```jsx
<motion.button
  style={{
    border: "1px solid var(--text-primary)",
    color: connectedWallet ? "var(--bg-primary)" : "var(--text-primary)",
    background: connectedWallet ? "var(--text-primary)" : "transparent",
  }}
>
  <BreathingDot color="#4EDE80" />  {/* green when connected */}
  {connectedWallet.name.toUpperCase()}
</motion.button>
```

**Implementation rules:**
- All wallet access is client-side only (`"use client"`, guard `window`)
- Read indexer/node endpoints from the wallet's `getConfiguration()` — never hardcode
- DApp Connector errors are plain objects: check `error.type === "DAppConnectorAPIError"`,
  never `instanceof`
- API details: https://docs.midnight.network/ → DApp Connector; offline: `MIDNIGHT_KB.html`

---

## Animation Principles

### Philosophy
- Every animation communicates **state** or **guides attention**
- Never animate for decoration
- 2–6 second cycle duration for continuous loops
- `ease-in-out` for infinite loops; `[0.22, 1, 0.36, 1]` for entrances
- Respect `prefers-reduced-motion`

### Core Keyframes

```css
@keyframes fadeUp {   /* Entrance */
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}

@keyframes glowPulse { /* Breathing status */
  0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.2), inset 0 0 20px rgba(255,255,255,0.05); }
  50%      { box-shadow: 0 0 40px rgba(255,255,255,0.4), inset 0 0 40px rgba(255,255,255,0.10); }
}

@keyframes borderDance { /* Hover focus */
  0%, 100% { border-color: rgba(128,128,128,0.2); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
  50%      { border-color: rgba(255,255,255,0.4); box-shadow: 0 0 20px rgba(255,255,255,0.1); }
}

@keyframes float { /* Icon bobbing */
  0%, 100% { transform: translateY(0px);  }
  50%      { transform: translateY(-8px); }
}

@keyframes scanLine { /* CRT processing — canonical PROVING overlay */
  0%   { top: 0%;   opacity: 0.3; }
  50%  {            opacity: 1;   }
  100% { top: 100%; opacity: 0.3; }
}
```

### Framer Motion Patterns

```jsx
{/* Entrance (card/modal) */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
/>

{/* Stagger children: delay i * 0.1 per item */}

{/* Breathing status dot */}
<motion.div
  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
/>

{/* Spinning ring — connection & PROVING */}
<motion.div
  animate={{ rotate: 360 }}
  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
/>
```

### Animation Timing Reference

| Animation | Duration | Easing | Use Case |
|---|---|---|---|
| Page entrance | `0.6s` | `[0.22, 1, 0.36, 1]` | Sections fading in |
| Card entrance | `0.4–0.6s` | `[0.22, 1, 0.36, 1]` | Card mount |
| Stagger step | `0.1s` delay per item | — | List/grid items |
| Breathing dot | `2s` loop | `easeInOut` | Status indicators |
| Glow pulse | `3s` loop | `easeInOut` | Glass container pulse |
| Float | `4s` loop | `easeInOut` | Icon bob |
| Spinner | `4s` loop | `linear` | Connection / proving rings |
| Scan line | `2s` loop | `linear` | PROVING overlay |
| Modal in/out | `0.25s` | `easeOut` / `easeIn` | Coming Soon / disclosure modal |
| Button hover | `0.2s` | `easeOut` | Background fill swap |
| Progress bar | `0.4s` | `easeOut` | DUST balance / step progression |

---

## Layout & Spacing

### Scale System

```
4px   (0.25rem)  xs
8px   (0.5rem)   sm
12px  (0.75rem)  md-sm
16px  (1rem)     md
24px  (1.5rem)   lg
32px  (2rem)     xl
40px  (2.5rem)   2xl
48px  (3rem)     3xl
64px  (4rem)     4xl
```

### Container Widths

| Container | Width |
|---|---|
| Page max | `max-w-7xl` (80rem / 1280px) |
| Prose/content | `max-w-3xl` (48rem / 768px) |
| Modal | `max-w-sm` (360px) |
| Card | Full grid column |

### Page Padding

- **Horizontal**: `px-6 lg:px-12`
- **Section vertical**: `py-24 md:py-32`
- **Card internal**: `p-6`
- **Modal internal**: `p-8`

### Header

- Height: `h-16` (64px), fixed/sticky
- Layout: 3-column CSS grid `grid-cols-[1fr_auto_1fr]` for true center alignment
- Left: Logo (`EchoForge.svg`)
- Center: Product nav pill
- Right: Network badge + theme toggle + wallet button
- Nav pill: `border: 1px solid var(--glass-border)`, `gap-1`, `rounded-full`
- Nav items: `text-[11px] font-mono tracking-[0.15em] uppercase`

### Z-Index Scale

```
z-0    Base content
z-10   Sticky headers, floating elements
z-20   Dropdowns, tooltips
z-30   Modals backdrop
z-40   Modals content
z-50   Toast notifications
```

---

## Dark Mode / Light Mode

### Implementation

Both themes are defined via CSS custom properties on `:root` and `[data-theme="light"]`:

```css
:root {
  /* Dark mode (default) */
  --bg-primary:     #000000;
  --bg-secondary:   #0A0A0A;
  --text-primary:   #FFFFFF;
  --text-secondary: #808080;
  --border-color:   #262626;
  --glass-bg:       rgba(0, 0, 0, 0.4);
  --glass-border:   rgba(255, 255, 255, 0.08);
  --card-bg:        rgba(26, 26, 26, 0.8);
}

[data-theme="light"] {
  --bg-primary:     #FFFFFF;
  --bg-secondary:   #F5F5F5;
  --text-primary:   #000000;
  --text-secondary: #808080;
  --border-color:   #D9D9D9;
  --glass-bg:       rgba(255, 255, 255, 0.4);
  --glass-border:   rgba(0, 0, 0, 0.08);
  --card-bg:        rgba(245, 245, 245, 0.8);
}
```

### Theme Toggle

- Located in the header, right column
- Icon: sun (light) / moon (dark)
- Persisted to `localStorage` under key `echo-theme`
- Applied to `document.documentElement.dataset.theme`
- Default: system preference via `prefers-color-scheme`, fallback dark
  (dark is canonical — this is the Midnight line)

### Light Mode Rules

- All `rgba(255,255,255,X)` glass values invert to `rgba(0,0,0,X)`
- Corner markers use `rgba(0,0,0,0.3)` instead of `rgba(128,128,128,0.3)`
- Status green (`#4EDE80`) and warning yellow (`#EAB308`) remain unchanged
- Privacy scope markers stay monochrome in both themes

---

## Products — Midnight Line

The Midnight line is in the **reserve phase** (see `工作逻辑.md`): learning, reference
examples, and knowledge base — no shipped products yet. Products, when they come, follow
the `Echoxxx` naming and belong to EchoForge, under `m.echoforgeef.com`.

| Item | Status | Description |
|---|---|---|
| `examples/` | ✅ Reference | 4 Compact reference contracts (counter, age-credential, document-anchor, private-ballot) + explainer SVGs. Not deployed. |
| `MIDNIGHT_KB.html` | ✅ Reference | Bilingual Midnight docs knowledge base (offline source of truth) — served at `/kb/` |
| `site/` | ✅ Live | m.echoforgeef.com pages: home, `/echomkb/` intro, 404 — four languages (EN / 简 / 繁 / 日), shared `site.css` derived from the KB stylesheet |
| EchoMKB (`echomkb/`, public repo) | ✅ Reference | Agent skill: live docs search + version-drift report. Not a UI product; its intro page follows this design system incl. ○ LOCAL / ● PUBLIC scope markers |
| Future `Echoxxx` products | 🧊 Frozen | Type B — unfrozen only per the conditions in `工作逻辑.md` |

Cardano-line products (EchoCert, EchoUploader, EchoID, EchoDash) are documented in the
**main repo's** `DESIGN.md` — not here. Same style, different chain, one brand.

---

## Brand Assets

Shared with the main line — reuse as-is, never redraw:

| File | Use |
|---|---|
| `EchoForge.svg` | EchoForge logo — header, favicon source, footer |
| `EFB.svg` | EchoForge brand graphic — hero / marketing surfaces |

Monochrome by design; they inherit `currentColor` where possible so both themes work.
New product icons follow the main-line convention: monochrome SVG, 16–64px grid.

---

## Technical Stack Notes

Stack for Midnight-line frontends: **React + Tailwind + Framer Motion**, contracts in
**Compact**, chain access via **midnight-js + DApp Connector (Lace)**.

Version discipline (this ecosystem moves fast and breaks compatibility):

- Compiler ↔ runtime versions must match **exactly**; pin all `@midnight-ntwrk/*`
  dependencies without `^`/`~`.
- The authority on versions is https://docs.midnight.network/relnotes/support-matrix —
  when any two sources disagree, the support-matrix wins.
- Check locally: `compact check` (compiler), `npm view <pkg> version` (SDK packages).
- Snapshot 2026-08-26 (verify before relying): matrix tests Compact toolchain 0.31.1
  (language 0.23), compact-runtime 0.16.0, midnight-js 4.1.1, proof server 8.1.0 — while
  the docs already describe toolchain 0.34.0 / language 0.26.0. Run `echomkb versions`.

Design-relevant consequences:
- Proof generation is slow → PROVING states are mandatory, not optional polish.
- Testnet-era → network badge is mandatory on every page.
- Private state lives on the user's device → design for "state not found on this
  device" as a first-class empty state, not an error.

---

## Implementation Checklist

### Design & Visual
- [ ] IBM Plex Mono for all text; `font-mono` applied globally
- [ ] Noto Sans SC/TC/JP only where CJK characters appear; never for Latin
- [ ] Only CSS vars for colors; no hardcoded values
- [ ] Glass panels: blur + translucent background + border; corner markers on major containers
- [ ] Typography scale followed per role

### Privacy (Midnight-specific — every item blocking)
- [ ] Every user-visible datum carries a scope marker: `○ LOCAL` / `◐ SHIELDED` / `● PUBLIC`
- [ ] No outward data movement without the disclosure confirmation modal
- [ ] Proof lifecycle states (`DRAFT → PROVING → SIGNING → SUBMITTED → CONFIRMED`) all designed, including `FAILED`
- [ ] PROVING is indeterminate + elapsed time; no fake percentages
- [ ] Network badge visible in header, read from wallet configuration
- [ ] Shielded and unshielded balances never summed
- [ ] No PII in public ledger state, ever

### Animations & Interactions
- [ ] 2–6s cycles; GPU-only properties (`transform`, `opacity`)
- [ ] `prefers-reduced-motion` respected
- [ ] Status dots: green (confirmed), yellow (warning/disclosure), white (proving), gray (inactive)

### Wallet & Network
- [ ] Wallet detection enumerates `window.midnight` (no fixed-key assumption)
- [ ] All wallet access client-side only; endpoints from `getConfiguration()`
- [ ] `PermissionRejected` handled as a normal path
- [ ] Errors checked via `type` field, never `instanceof`

### Responsive & Accessibility
- [ ] Dark + light themes both polished
- [ ] Mobile (`sm`) / tablet (`md`) / desktop (`lg`) tested
- [ ] `aria-label`, focus rings, keyboard navigation, focus trap in modals
- [ ] Empty / loading / error / "private state not on this device" states designed

### Content
- [ ] All user-facing text in four languages: EN (primary), 简体, 繁體, 日本語
- [ ] Status labels honest: LIVE / COMING_SOON / IN_DEVELOPMENT — no vaporware wording

---

## File References

Local workspace only. Main-repo files are documented in the main repo.

| File | Purpose |
|---|---|
| `DESIGN.md` | **This file** — Midnight-line design source of truth |
| `CLAUDE.md` | AI assistant (vCTO) guidelines for this workspace |
| `工作逻辑.md` | Work logic: security + privacy debt rules, Type A/B freeze (Chinese) |
| `项目监工.md` | Status table + changelog for this workspace |
| `MIDNIGHT_KB.html` | Offline Midnight docs knowledge base |
| `examples/` | Compact reference contracts + explainer SVGs |
| `EchoForge.svg`, `EFB.svg` | Brand assets (shared with main line) |

---

**EchoForgeStyle — Midnight Edition** — Designed for silence, precision, glass, and proof.

IBM Plex Mono · Monochrome · Midnight · Zero-Knowledge

一切为简 · All for Simple · 证而不泄 · Prove, Don't Reveal

[m.echoforgellc.tech](https://m.echoforgellc.tech)

© 2026 EchoForge
