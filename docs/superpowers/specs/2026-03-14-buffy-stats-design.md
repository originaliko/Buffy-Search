# Buffy the Vampire Slayer — Data Viz & Search · Design Spec

**Date:** 2026-03-14
**Status:** Approved

---

## Overview

A static web application hosted on GitHub Pages that combines a full-text transcript search with data visualizations inspired by [sheets.works/data-viz/friends](https://sheets.works/data-viz/friends). The site covers all 7 seasons (143 episodes) of Buffy the Vampire Slayer (1997–2003).

**Target audience:** 40–50 year old Buffy fans. Minimum font size is 13px throughout the UI.

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
│   ├── main.js            # bootstrap, section init, async data loading
│   ├── hero.js            # hero stats
│   ├── episode-explorer.js # dot grid
│   ├── characters.js      # who speaks most (with toggle)
│   ├── ratings.js         # IMDb scatter plot (Chart.js)
│   ├── catchphrases.js    # bar chart (Chart.js)
│   ├── firstlast.js       # first/last lines cards
│   └── search.js          # transcript search
├── data/
│   ├── stats.json         # pre-computed stats, loads immediately (~50 KB)
│   └── dialogues.json     # full transcripts, loaded async (~6 MB)
├── scripts/
│   └── build_data.py      # CSV → JSON conversion (run locally, not deployed)
└── dataset/               # raw source files, not deployed
    ├── csv/
    └── episodes_data/
```

`data/` is committed to the repo and served by GitHub Pages. `dataset/` and `scripts/` stay local.

---

## Data Architecture

### Two-tier JSON (approach B)

Stats load immediately; dialogue loads async when the user interacts with the episode explorer or search.

**`data/stats.json`** (~50 KB):
```json
{
  "meta": {
    "total_lines": 51247,
    "total_episodes": 143,
    "total_seasons": 7,
    "peak_rating": { "value": 9.2, "episode": "s02e22", "title": "Becoming: Part II" },
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
    { "phrase": "Vampire", "total": 341, "top_character": "Buffy", "by_character": { "Buffy": 120, "Giles": 80 } }
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

**`data/dialogues.json`** (~6 MB):
```json
{
  "s01e01": [
    { "start": 71.01, "end": 73.12, "character": "Darla", "line": "Are you sure this is a good idea?" }
  ]
}
```

---

## Python Build Script (`scripts/build_data.py`)

- **Runtime:** Python 3, stdlib only (`csv`, `json`, `glob`, `re`)
- **Input:** all `dataset/csv/S0xE0x_script.csv` + `dataset/episodes_data/buffy_episodes.json`
- **Output:** `data/stats.json` + `data/dialogues.json`

**Config block at the top of the script:**
```python
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

**Processing steps (single pass per file):**
1. Read CSV, normalize character names via alias map
2. Join with episode metadata via filename-derived id (e.g. `S01E01` → `s01e01`)
3. Accumulate: line counts per character/episode, catchphrase tallies, first/last line per character
4. Write `stats.json` then `dialogues.json`

Run with: `python scripts/build_data.py`

---

## Page Design

### Visual Style
- Existing gothic dark theme: `--night #0D0D0F`, `--blood #8B0000`, `--stake #C8860A`, `--pale #E8E0D5`
- Fonts: Playfair Display (headings) + Space Mono (body)
- Minimum font size: **13px**
- No "Section 0x" labels — section titles stand alone

### Layout
- Long-scroll single page, sections stacked
- Sticky side-nav dots (right edge) for jumping between sections
- Floating **"⚔ Search Dialogue"** button (bottom-right) scrolls to the search section

---

## Sections

### 1 — Hero
Five stat cards: total lines · episodes · peak IMDb rating · top speaker · seasons.

### 2 — Episode Explorer
- Season tabs (S1–S7) + episode dropdown
- Dot grid: each dot = one line, color-coded by character, "Other" in gray
- Hover tooltip: character name + full line text
- Info bar below: episode title, rating, line count, top speaker
- Dialogue data loaded async on first interaction

### 3 — Who Speaks Most
- Horizontal bar chart, 13 characters
- **Pill-shaped centered toggle:** "Total lines" / "Per appearance" (avg lines/episode)
- Bars re-sort by value when switching modes
- Value label after each bar (e.g. `12,482` or `87 / ep`)

### 4 — IMDb Ratings
- Scatter plot via Chart.js
- X-axis: episode index (1–143), Y-axis: rating (6–10)
- Color per season, season labels on X-axis
- Hover tooltip: episode title + rating
- Callout labels for highest and lowest rated episodes

### 5 — Catchphrases & Keywords
- Horizontal bar chart via Chart.js
- Configurable phrase list (defined in `build_data.py`)
- Shows total count + top character per phrase

### 6 — First & Last Lines
- Grid of cards (3 columns), one per tracked character
- Each card: character name + color dot, first line + episode ref, last line + episode ref

### 7 — Search
- Text input + season filter + character filter
- Searches `dialogues.json` (loaded async on first keystroke)
- Results show: character · episode id · episode title · rating · matching line (keyword highlighted)

---

## Footer / Credits

- Timed transcript data: [jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer](https://github.com/jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer)
- Episode ratings: [TVMaze — Buffy the Vampire Slayer](https://www.tvmaze.com/shows/427/buffy-the-vampire-slayer)

---

## Deployment

Static site, no build step. Deploy to GitHub Pages by pointing it at the `main` branch root (or a `/docs` folder if preferred). `dataset/` is excluded via `.gitignore`.
