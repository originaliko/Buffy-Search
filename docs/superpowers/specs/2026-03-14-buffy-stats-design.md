# Buffy the Vampire Slayer — Data Viz & Search · Design Spec

**Date:** 2026-03-14
**Status:** Approved

---

## Overview

A static web application hosted on GitHub Pages that combines a full-text transcript search with data visualizations inspired by [sheets.works/data-viz/friends](https://sheets.works/data-viz/friends). The site covers all 7 seasons (143 episodes) of Buffy the Vampire Slayer (1997–2003).

**Target audience:** 40–50 year old Buffy fans. Minimum font size is 13px throughout the UI. Mobile is explicitly out of scope.

---

## Data Sources

- **Timed transcripts:** CSV files from [jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer](https://github.com/jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer) (`dataset/csv/`, 143 files, format: `start_time, end_time, character, dialogue`)
- **Episode metadata:** `dataset/episodes_data/buffy_episodes.json` (id, season, episode, title, air_date, rating sourced from [TVMaze](https://www.tvmaze.com/shows/427/buffy-the-vampire-slayer))

---

## File Structure

```
buffy-search/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js              # bootstrap, section init, async data loading
│   ├── hero.js              # hero stats
│   ├── episode-explorer.js  # dot grid
│   ├── characters.js        # who speaks most (with toggle) — raw DOM/SVG, no Chart.js
│   ├── ratings.js           # IMDb scatter plot (Chart.js)
│   ├── catchphrases.js      # bar chart (Chart.js)
│   ├── firstlast.js         # first/last lines cards
│   └── search.js            # transcript search
├── data/
│   ├── stats.json           # pre-computed stats, loads immediately (~50 KB)
│   └── dialogues.json       # full transcripts, loaded async (~6 MB)
├── scripts/
│   └── build_data.py        # CSV → JSON conversion (run locally, not deployed)
└── dataset/                 # raw source files, not deployed
    ├── csv/
    └── episodes_data/
```

`data/` is committed to the repo and served by GitHub Pages. `dataset/` and `scripts/` stay local and are excluded via `.gitignore`.

---

## Data Architecture

### Two-tier JSON

`stats.json` loads immediately on page load. `dialogues.json` (~6 MB) is fetched once, lazily, triggered by whichever of these happens first:
- User clicks any season tab in the Episode Explorer
- User types the first character in the Search input

A single `Promise` in `main.js` manages the fetch. Both `episode-explorer.js` and `search.js` await this same promise — the file is never fetched twice. If the fetch fails, both sections display an inline error message: `"Could not load transcript data. Please refresh the page."` No other fallback is needed.

**`data/stats.json`** (~50 KB):
```json
{
  "meta": {
    "total_lines": 51247,
    "total_episodes": 143,
    "total_seasons": 7,
    "peak_rating": { "value": 9.2, "episode": "s02e22", "title": "Becoming: Part II" },
    "lowest_rating": { "value": 6.4, "episode": "s01e08", "title": "I, Robot... You, Jane" },
    "top_speaker": { "character": "Buffy", "lines": 12482 }
  },
  "episodes": [
    { "id": "s01e01", "season": 1, "episode": 1, "title": "...", "air_date": "...", "rating": 7.9, "line_count": 312 }
  ],
  "characters": [
    {
      "name": "Buffy",
      "color": "#C8251A",
      "total_lines": 12482,
      "episodes_appeared": 143,
      "lines_per_appearance": 87
    }
  ],
  "catchphrases": [
    {
      "phrase": "Vampire",
      "total": 341,
      "top_character": "Buffy",
      "by_character": { "Buffy": 120, "Giles": 80 }
    }
  ],
  "first_last": [
    {
      "character": "Buffy",
      "first": { "line": "Can I help you?", "episode_id": "s01e01", "episode_title": "Welcome to the Hellmouth" },
      "last":  { "line": "Spike.", "episode_id": "s07e22", "episode_title": "Chosen" }
    }
  ]
}
```

Notes on `stats.json` fields:
- `lines_per_appearance`: `round(total_lines / episodes_appeared)` — stored as integer.
- `catchphrases[].by_character`: only characters with count > 0 are included (absent key = zero count).
- `first_last`: "first line" = first CSV row (by row order) in the earliest episode by air_date where the character has dialogue. "Last line" = last CSV row in the latest such episode.

**`data/dialogues.json`** (~6 MB):
```json
{
  "s01e01": [
    { "start": 71.01, "end": 73.12, "character": "Darla", "line": "Are you sure this is a good idea?" }
  ]
}
```

- Every episode id appears as a key, even if no lines were found (value = empty array `[]`).
- `character` field uses the canonical name from `CHARACTERS` for tracked characters, or the raw CSV value for others.

---

## Python Build Script (`scripts/build_data.py`)

- **Runtime:** Python 3, stdlib only (`csv`, `json`, `glob`, `re`)
- **Input:** all `dataset/csv/S0xE0x_script.csv` + `dataset/episodes_data/buffy_episodes.json`
- **Output:** `data/stats.json` + `data/dialogues.json`

**Config block at the top of the script:**
```python
OTHER_COLOR = "#444444"

CHARACTERS = {
    "Buffy":    { "color": "#C8251A", "aliases": ["BUFFY", "Buffy Summers"] },
    "Willow":   { "color": "#C8860A", "aliases": ["WILLOW", "Willow Rosenberg"] },
    "Xander":   { "color": "#4A90D9", "aliases": ["XANDER", "Xander Harris"] },
    "Giles":    { "color": "#7B5EA7", "aliases": ["GILES", "Rupert Giles"] },
    "Spike":    { "color": "#E8D5A3", "aliases": ["SPIKE", "William"] },
    "Angel":    { "color": "#2C6E49", "aliases": ["ANGEL", "Angelus"] },
    "Anya":     { "color": "#D4847A", "aliases": ["ANYA", "Anyanka"] },
    "Tara":     { "color": "#7EB5A6", "aliases": ["TARA", "Tara Maclay"] },
    "Cordelia": { "color": "#C9A84C", "aliases": ["CORDELIA", "Cordelia Chase"] },
    "Dawn":     { "color": "#6B9BD2", "aliases": ["DAWN", "Dawn Summers"] },
    "Joyce":    { "color": "#A67C52", "aliases": ["JOYCE", "Joyce Summers"] },
    "Faith":    { "color": "#B5451B", "aliases": ["FAITH", "Faith Lehane"] },
    "Riley":    { "color": "#5C7A5C", "aliases": ["RILEY", "Riley Finn"] },
}

CATCHPHRASES = [
    "Vampire", "Slayer", "Hellmouth", "Chosen", "Watcher",
    "Bloody hell", "Bored now", "Grr argh",
]
```

**Catchphrase matching rules:**
- Case-insensitive
- Substring match (the phrase may appear anywhere within a line)
- Multi-word phrases matched as exact sequence (e.g. `"bloody hell"` matches `"Oh, bloody hell!"`)
- Always use `re.escape(phrase)` before passing to `re.search` to handle any future phrases containing regex metacharacters: `re.search(re.escape(phrase), line, re.IGNORECASE)`
- Attribution: the line's canonical character name gets the count
- Tie-breaking in tooltip "top 3 speakers": alphabetical order by character name

**Processing steps (single pass per episode file):**
1. Read CSV, normalize character names via alias map (case-insensitive alias lookup)
2. Join with episode metadata via filename-derived id (e.g. `S01E01_script.csv` → `s01e01`)
3. Accumulate: line counts per character/episode, catchphrase tallies, track first/last line per character
4. Write `stats.json` then `dialogues.json`

Run with: `python scripts/build_data.py` from the project root.

---

## Page Design

### Visual Style
- Gothic dark theme CSS variables: `--night #0D0D0F`, `--blood #8B0000`, `--stake #C8860A`, `--pale #E8E0D5`, `--ghost #B8B0A8`, `--fog #2A2A38`, `--dusk #1A1A24`, `--mist #3D3D55`
- Fonts: Playfair Display (headings) + Space Mono (body), loaded from Google Fonts
- **Minimum font size: 13px** — no element in the UI may use a smaller font size
- No "Section 0x" labels — section titles stand alone

### Layout
- Long-scroll single page, sections stacked vertically
- Sticky side-nav dots (right edge, 7 dots) — each dot corresponds to one section. Active dot highlights in `--stake` color, updated via `IntersectionObserver` (threshold: 0.4). Hovering a dot shows a tooltip with the section title.
- Floating **"⚔ Search Dialogue"** button (bottom-right, fixed position) — clicking it smooth-scrolls to the Search section

---

## Sections

### 1 — Hero
Five stat cards in a single row: total lines · episodes · peak IMDb rating · top speaker · seasons.

### 2 — Episode Explorer

**Controls:**
- Season tabs (S1–S7) — clicking a tab loads dialogue data if not yet loaded, then renders the first episode of that season
- Episode dropdown — always filtered to episodes within the currently selected season tab
- Default state on page load: Season 1 selected, S1E01 loaded in the dropdown, dot grid shown immediately using `stats.json` episode `line_count` as a placeholder dot count (colored gray) until `dialogues.json` is ready

**Dot grid:**
- Each dot = one line of dialogue
- Dot size: 6×6 px, gap: 3px, `flex-wrap: wrap`
- Grid is fixed-width (fills the section container) and wraps naturally — no scroll within the grid. Episodes with many lines will simply produce a taller grid.
- Color: canonical character color from `CHARACTERS`, or `OTHER_COLOR` (`#444444`) for untracked characters and empty-character rows
- Hover tooltip: character name + full line text (native `title` attribute for simplicity)

**Info bar below the grid:**
- Episode title · Rating ★ · Total lines · Top speaker (character with most lines in this episode)

**Loading:** On page load, Season 1 / S1E01 is pre-selected and gray placeholder dots render immediately using `line_count` from `stats.json` — this does **not** trigger the lazy fetch. The fetch fires only on an explicit user action (clicking a season tab or typing in Search). Once `dialogues.json` is loaded, the dot grid re-renders with correct colors automatically.

### 3 — Who Speaks Most

- Rendered in raw DOM (no Chart.js) — `div`-based horizontal bars
- 13 character rows, sorted by value descending (re-sorts on toggle)
- **Toggle** (centered, pill-shaped): "Total lines" / "Per appearance"
  - Total lines: `total_lines` — formatted with thousands separator (e.g. `12,482`)
  - Per appearance: `lines_per_appearance` — displayed as `87 / ep`
- Bar widths are percentages relative to the top value (always 100%)
- Bar fill color = character color

### 4 — IMDb Ratings

- Scatter plot via **Chart.js** (no additional plugins)
- X-axis: episode index 1–143, labeled with season markers (S1 … S7) at the correct x positions
- Y-axis: dynamic range — `floor(min_rating) - 0.5` to `ceil(max_rating) + 0.1`, so no data point is clipped
- Each point colored by season (7 colors, one per season)
- Hover tooltip (Chart.js built-in): episode title + rating
- "Best episode" and "worst episode" callouts: rendered as HTML `<div>` elements absolutely positioned over the chart container. Pixel position obtained via `chart.getDatasetMeta(0).data[index].x/y` after render. A small CSS arrow points toward the dot.

### 5 — Catchphrases & Keywords

- Horizontal bar chart via **Chart.js**
- One bar per phrase, sorted by total count descending
- Bar label shows: phrase + total count
- Tooltip on hover: breakdown by character (top 3 speakers)

### 6 — First & Last Lines

- CSS Grid, 3 columns. 13 cards → 4 full rows + 1 orphan card in the last row, left-aligned (columns 2 and 3 of the last row are intentionally empty)
- Each card: character color dot + name header, "First line" block, "Last line" block
- Each block: italic quote + episode reference (id + title)

### 7 — Search

- Text input + season dropdown ("All seasons" default) + character dropdown ("All characters" default)
- `dialogues.json` loaded async on first keystroke (shared promise with Episode Explorer)
- Results capped at **100 matches** displayed. If more exist, show: `"Showing 100 of N results — refine your search to see more."`
- Zero results: `"No lines found matching your search."`
- Each result card: `CHARACTER · SxEx · Episode Title · Rating ★` + matching line with keyword highlighted in `--stake` color via `<mark>` styled element
- Search is case-insensitive substring match across the `line` field

---

## Footer / Credits

- Timed transcript data: [jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer](https://github.com/jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer)
- Episode ratings: [TVMaze — Buffy the Vampire Slayer](https://www.tvmaze.com/shows/427/buffy-the-vampire-slayer)

---

## Deployment

Static site, no build step. Deploy to GitHub Pages by pointing it at the `main` branch root. `dataset/` and `scripts/` are excluded via `.gitignore`.
