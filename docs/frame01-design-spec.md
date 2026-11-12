# Handoff Spec: Frame 01 — Uber Home (Real, Android)

## Overview

Frame 01 of the "Surge Alert - Uber UI Reference" Figma file is a faithful, editable recreation of the real Uber Android app's home screen. It exists so Surge Alert's own screens (Frames 06-09) can be shown sitting inside an accurate version of the real app, not a generic mockup.

This spec documents the exact measurements, colors, and copy pulled from a real screen recording of the Uber app (frame-extracted and pixel-sampled with ffmpeg/PIL), and marks which parts of the Figma frame already match it versus which parts still need correcting.

- **Frame size:** 412 × 917 (Android reference dimensions)
- **Source-to-Figma scale factor:** 0.4769 (real capture was 864 × 1920px; multiply any native pixel measurement by 0.4769 to get the Figma value)
- **Figma file:** [Surge Alert - Uber UI Reference](https://www.figma.com/design/2Ly9NolRhiaBJ9Iz753ayp/Surge-Alert---Uber-UI-Reference)

---

## Design Tokens Used

| Token | Value | Usage |
|---|---|---|
| `color-bg-app` | `#161616` | Screen background |
| `color-surface-pill` | `#282828` (also seen `#292929`) | Search bar, address card, icon-circle backgrounds |
| `color-icon-circle-bg` | `#292929` | Background circle behind each "For you" grid icon |
| `color-badge-bg` | `#D91009` (also seen `#D62012`) | Red tag-style promo badges |
| `color-badge-text` | `#FFFFFF` | Text inside promo badges |
| `color-clock-icon-bg` | `#E2E2E2` | Light-gray circle behind the clock icon in each address row |
| `color-text-primary` | `#FFFFFF` | Headings, active tab, address titles |
| `color-text-secondary` | `~#9A9A9A` (mid-gray, not re-sampled precisely) | Address subtitles, inactive "Parcel" tab, icon labels |

---

## Components

### 1. Header tabs — **FIXED, verified in Figma**

| Element | Property | Value |
|---|---|---|
| Car icon (🚗) | Position | X 100, Y 67, W 16, H 16 |
| "Uber" text | Position | X 118, Y 66, W 38, H 19 |
| Underline (Rectangle 26) | Position | X 100, Y 88, W 56, H 2, fill `#FFFFFF` |
| Bag icon (🛍️) | Position | X 237, Y 70, W 16, H 16 |
| "Parcel" text | Position | X 255, Y 69, W 47, H 19, color secondary (inactive tab) |

**Note:** the tab group is centered as a unit in the frame, not left-aligned to the search bar below it. The underline spans the car icon *and* the "Uber" text together (X 100 → 156), not just the text.

### 2. Search bar — unchanged, already correct
Two-pill row: search icon + "Where to?" placeholder, divider, calendar icon + "Later" label.

### 3. Address card — **PENDING, not yet applied**

Currently built as two separate cards. Target: **one card, two rows, one divider.**

| Element | Target value |
|---|---|
| Card | X 24, Y ≈253, W ≈372, H ≈131, fill `color-surface-pill`, rounded corners |
| Divider | Thin horizontal line at Y ≈317, full card width minus padding |
| Row 1 clock icon circle | X ≈53 (center), Y ≈288 (center), bg `color-clock-icon-bg` |
| Row 1 title | "Smoky Docky Brookefield" — bold, white |
| Row 1 subtitle | "Ground floor, start of, 60 Fee…" — gray, truncated with ellipsis |
| Row 1 chevron | ">" right-aligned, gray |
| Row 2 clock icon circle | Same style as Row 1, centered ≈Y 351 |
| Row 2 title | "514, 5th Main Rd" — bold, white |
| Row 2 subtitle | "Krishna Reddy Layout, Amar…" — gray, truncated with ellipsis |
| Row 2 chevron | ">" right-aligned, gray |

### 4. "For you" heading — **PENDING**

| Element | Current (wrong) | Target |
|---|---|---|
| Heading text | X 24, Y ≈265 | X 24, Y ≈424 (see vertical-rhythm note below) |
| Chevron | Large button, far right of frame (old "Rectangle 29" + "→") | Small circle (~24px diameter), immediately after the heading text, ~X 94–110 |

### 5. "For you" 8-icon grid — **PENDING (relabel + rebadge)**

4 columns × 2 rows, each icon a circle (~78px diameter) on `color-icon-circle-bg`, label below in white/gray.

| Position | Label | Badge |
|---|---|---|
| Row 1, Col 1 | Bike Saver | none |
| Row 1, Col 2 | Auto | none |
| Row 1, Col 3 | Ride | 🔴 "25%" |
| Row 1, Col 4 | Bus & Train | 🔴 "Promo" |
| Row 2, Col 1 | Reserve | 🔴 "7%" |
| Row 2, Col 2 | Parcel | 🔴 "40%" |
| Row 2, Col 3 | Teens | none |
| Row 2, Col 4 | **Intercity** (currently mislabeled "Seniors") | none |

Badge spec: red tag/ribbon shape (not a pill), `color-badge-bg` fill, white bold text, positioned overlapping the top-left/top-center of the icon circle it belongs to. Currently built as green pills with the wrong values — needs both a shape and color change.

### 6. "More ways to use Uber" section — **PENDING (rename + reposition)**

Currently named "Outstation getaways" with two invented destination cards (Nandi Hills, Coorg). Real app shows a horizontally-scrolling card row (content mostly cropped by the bottom nav bar — only the top ≈64px of the cards is visible before the frame clips).

| Element | Target value |
|---|---|
| Heading | "More ways to use Uber", Y ≈732 |
| Card row | Starts Y ≈768, cards partially hidden behind bottom nav (matches real app — this section is meant to hint at more content below the fold) |

Decide before rebuilding: keep this as a generic "more services" row (closer to the real app, use neutral placeholder cards) or keep the invented "Outstation getaways" travel-card idea as an intentional Surge-Alert-adjacent embellishment. Recommend the former for the "faithful base" pass, and reintroducing any invented content afterward if wanted.

### 7. Bottom nav — unchanged, already correct
Home / Services / Activity / Account, icon + label, fixed at the bottom of the frame.

---

## Layout: Vertical Rhythm — **PENDING, the highest-impact fix**

The current Figma build is noticeably more vertically compressed than the real app. The clearest symptom: "For you" currently sits at Y ≈265; in the real app's proportions it should sit at **Y ≈424** — a ≈160px difference that cascades to everything below it (icon grid, "More ways" section, cards).

Recommended fix order:
1. Correct the address card first (item 3 above) — this changes the height of the block above "For you".
2. Move "For you" and everything below it down as a group to hit the corrected target Y positions, preserving relative spacing between the icon grid, its labels, and the badges.
3. Rebuild "More ways to use Uber" (item 6) at its corrected position last, since its content is being decided.

---

## Content Specs

- **Truncation:** address subtitles truncate with an ellipsis at roughly 40 characters (matches real app behavior for long addresses).
- **Badge text:** short — percentages ("25%", "7%", "40%") or the single word "Promo". No badge exceeds 5 characters.
- **Copy source of truth:** `uber-copy-reference.md` in this project has every other verbatim string already audited from the same recording.

---

## Status Summary

| Area | Status |
|---|---|
| Header tabs (position + underline) | ✅ Fixed and verified in Figma |
| Search bar | ✅ Already correct |
| Address card consolidation | ⬜ Pending |
| "For you" heading + chevron | ⬜ Pending |
| Icon grid labels + badges | ⬜ Pending |
| Overall vertical rhythm | ⬜ Pending — highest priority, affects everything below the address card |
| "More ways to use Uber" section | ⬜ Pending — needs a content decision first |
| Bottom nav | ✅ Already correct |

---

## Notes for Whoever Applies These Changes in Figma

- Work element-by-element via the Layers panel and the numeric Position/Layout fields in the right-hand panel — don't try to drag by eye, the frame is small at typical canvas zoom.
- Verify each edit with a screenshot before moving to the next one. This session's Figma browser-automation tooling was unusually unstable and produced a couple of accidental mass-duplication incidents (both caught and undone via Ctrl+Z with no lasting damage) — better to check in often than to batch several risky edits together.
