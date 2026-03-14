# Buffy Data Viz & Search Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static GitHub Pages site with transcript search and data visualizations for Buffy the Vampire Slayer (7 seasons, 143 episodes).

**Architecture:** A Python script converts 143 CSV files into two JSON files (`stats.json` loaded immediately, `dialogues.json` loaded lazily). A vanilla JS multi-file static site reads these and renders 7 sections: hero stats, episode dot-grid explorer, character bar chart, IMDb scatter plot, catchphrases chart, first/last lines cards, and full-text search.

**Tech Stack:** Python 3 (stdlib only), vanilla JS (ES modules), Chart.js (CDN), Google Fonts, GitHub Pages.

---

## Chunk 1: Data Pipeline

### Task 1: Project scaffolding & .gitignore

**Files:**
- Create: `.gitignore`
- Create: `data/.gitkeep`
- Create: `scripts/` (directory only)

- [ ] **Step 1: Create .gitignore**

```
# Raw source data — too large / not needed on GitHub Pages
dataset/

# Generated files — committed after running build script
# (data/ IS committed, so don't ignore it)

# OS / editor
.DS_Store
.superpowers/
```

Save to `.gitignore`.

- [ ] **Step 2: Create data directory placeholder**

```bash
mkdir -p data scripts
touch data/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore data/.gitkeep
git commit -m "chore: scaffold project, add .gitignore"
```

---

### Task 2: Write build script — character normalization

**Files:**
- Create: `scripts/build_data.py`
- Create: `scripts/test_build.py`

- [ ] **Step 1: Write the failing test for character normalization**

Create `scripts/test_build.py`:

```python
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# We'll import the normalize function once it exists
# For now, define what we expect

def test_normalize_known_alias():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("BUFFY", ALIAS_MAP) == "Buffy"

def test_normalize_case_insensitive():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("buffy summers", ALIAS_MAP) == "Buffy"

def test_normalize_unknown_returns_raw():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("Master", ALIAS_MAP) == "Master"

def test_normalize_empty_returns_empty():
    from build_data import normalize_character, ALIAS_MAP
    assert normalize_character("", ALIAS_MAP) == ""

if __name__ == "__main__":
    import traceback, sys
    tests = [test_normalize_known_alias, test_normalize_case_insensitive,
             test_normalize_unknown_returns_raw, test_normalize_empty_returns_empty]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except Exception as e:
            print(f"  FAIL  {t.__name__}: {e}")
            failed += 1
    sys.exit(failed)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/iko/DEV/Buffy-Search && python scripts/test_build.py
```

Expected: `ModuleNotFoundError: No module named 'build_data'`

- [ ] **Step 3: Write the config block and normalize_character function**

Create `scripts/build_data.py` with config + the function:

```python
import csv, json, glob, re, os

# ── CONFIG ──────────────────────────────────────────────────────────────────

OTHER_COLOR = "#444444"

CHARACTERS = {
    "Buffy":    {"color": "#C8251A", "aliases": ["BUFFY", "Buffy Summers", "buffy"]},
    "Willow":   {"color": "#C8860A", "aliases": ["WILLOW", "Willow Rosenberg"]},
    "Xander":   {"color": "#4A90D9", "aliases": ["XANDER", "Xander Harris"]},
    "Giles":    {"color": "#7B5EA7", "aliases": ["GILES", "Rupert Giles"]},
    "Spike":    {"color": "#E8D5A3", "aliases": ["SPIKE", "William"]},
    "Angel":    {"color": "#2C6E49", "aliases": ["ANGEL", "Angelus"]},
    "Anya":     {"color": "#D4847A", "aliases": ["ANYA", "Anyanka", "Anya Jenkins"]},
    "Tara":     {"color": "#7EB5A6", "aliases": ["TARA", "Tara Maclay"]},
    "Cordelia": {"color": "#C9A84C", "aliases": ["CORDELIA", "Cordelia Chase"]},
    "Dawn":     {"color": "#6B9BD2", "aliases": ["DAWN", "Dawn Summers"]},
    "Joyce":    {"color": "#A67C52", "aliases": ["JOYCE", "Joyce Summers"]},
    "Faith":    {"color": "#B5451B", "aliases": ["FAITH", "Faith Lehane"]},
    "Riley":    {"color": "#5C7A5C", "aliases": ["RILEY", "Riley Finn"]},
}

CATCHPHRASES = [
    "Vampire", "Slayer", "Hellmouth", "Chosen", "Watcher",
    "Bloody hell", "Bored now", "Grr argh",
]

# ── DERIVED LOOKUP ───────────────────────────────────────────────────────────

# Build alias → canonical name map (all lowercase keys)
ALIAS_MAP = {}
for canonical, info in CHARACTERS.items():
    ALIAS_MAP[canonical.lower()] = canonical
    for alias in info["aliases"]:
        ALIAS_MAP[alias.lower()] = canonical


# ── HELPERS ──────────────────────────────────────────────────────────────────

def normalize_character(raw, alias_map):
    """Return canonical character name, or raw value if unknown."""
    if not raw:
        return raw
    return alias_map.get(raw.strip().lower(), raw.strip())
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python scripts/test_build.py
```

Expected: all 4 PASS, exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/build_data.py scripts/test_build.py
git commit -m "feat: build script config and character normalization"
```

---

### Task 3: Write build script — episode id derivation and CSV reading

**Files:**
- Modify: `scripts/build_data.py`
- Modify: `scripts/test_build.py`

- [ ] **Step 1: Write failing tests**

Add to `scripts/test_build.py`:

```python
def test_episode_id_from_filename():
    from build_data import episode_id_from_filename
    assert episode_id_from_filename("S01E01_script.csv") == "s01e01"
    assert episode_id_from_filename("S07E22_script.csv") == "s07e22"

def test_read_csv_rows_count():
    """Smoke test: S01E01 should have >100 rows."""
    from build_data import read_csv_rows
    rows = read_csv_rows("dataset/csv/S01E01_script.csv")
    assert len(rows) > 100, f"Expected >100, got {len(rows)}"

def test_read_csv_row_structure():
    from build_data import read_csv_rows
    rows = read_csv_rows("dataset/csv/S01E01_script.csv")
    # Find a row that has a character name
    char_rows = [r for r in rows if r["character"]]
    assert len(char_rows) > 0
    r = char_rows[0]
    assert "start" in r and "end" in r and "character" in r and "line" in r
    assert isinstance(r["start"], float)
```

Run: `python scripts/test_build.py` — expect failures on the new tests.

- [ ] **Step 2: Implement episode_id_from_filename and read_csv_rows**

Add to `scripts/build_data.py`:

```python
def episode_id_from_filename(filename):
    """'S01E01_script.csv' → 's01e01'"""
    base = os.path.basename(filename)
    match = re.match(r'(S\d+E\d+)', base, re.IGNORECASE)
    if not match:
        raise ValueError(f"Cannot derive episode id from: {filename}")
    return match.group(1).lower()


def read_csv_rows(filepath):
    """Read a transcript CSV and return list of dicts with normalized fields."""
    rows = []
    with open(filepath, encoding="utf-8", errors="replace") as f:
        reader = csv.reader(f)
        for raw in reader:
            if len(raw) < 4:
                continue
            try:
                start = float(raw[0])
                end = float(raw[1])
            except ValueError:
                continue
            rows.append({
                "start": start,
                "end": end,
                "character": raw[2].strip(),
                "line": raw[3].strip(),
            })
    return rows
```

- [ ] **Step 3: Run tests**

```bash
python scripts/test_build.py
```

Expected: all 7 PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/build_data.py scripts/test_build.py
git commit -m "feat: episode id derivation and CSV reading"
```

---

### Task 4: Write build script — stats accumulation

**Files:**
- Modify: `scripts/build_data.py`
- Modify: `scripts/test_build.py`

- [ ] **Step 1: Write failing tests for catchphrase matching**

Add to `scripts/test_build.py`:

```python
def test_catchphrase_match_case_insensitive():
    from build_data import phrase_matches
    assert phrase_matches("bloody hell", "Oh, Bloody Hell!") is True

def test_catchphrase_match_substring():
    from build_data import phrase_matches
    assert phrase_matches("Vampire", "That vampire attacked me") is True

def test_catchphrase_no_match():
    from build_data import phrase_matches
    assert phrase_matches("Slayer", "I'm just a normal girl") is False

def test_catchphrase_regex_safe():
    from build_data import phrase_matches
    # phrase with dot (regex metachar) — must NOT match unintended strings
    assert phrase_matches("hell.", "hellmouth") is False
```

Run: `python scripts/test_build.py` — expect failures.

- [ ] **Step 2: Implement phrase_matches**

Add to `scripts/build_data.py`:

```python
def phrase_matches(phrase, line):
    """Case-insensitive substring match, regex-safe."""
    return bool(re.search(re.escape(phrase), line, re.IGNORECASE))
```

- [ ] **Step 3: Run tests**

```bash
python scripts/test_build.py
```

Expected: all tests PASS.

- [ ] **Step 4: Implement accumulate_episode — the main stats accumulation function**

Add to `scripts/build_data.py`:

```python
def accumulate_episode(rows, ep_id, alias_map, stats):
    """
    Process rows for one episode and accumulate into stats dict.

    stats keys populated/updated:
      - dialogues[ep_id]: list of row dicts with canonical character
      - char_lines[canonical]: total line count
      - char_episodes[canonical]: set of ep_ids where char has >=1 line
      - char_first[canonical]: {"line", "ep_id"} of earliest line seen so far
      - char_last[canonical]:  {"line", "ep_id"} of latest line seen so far
      - phrase_totals[phrase]: total count across all episodes
      - phrase_by_char[phrase][canonical]: count per character
      - ep_line_count[ep_id]: total lines
      - ep_top_speaker[ep_id]: {char: count} dict (caller computes argmax)
    """
    stats["dialogues"].setdefault(ep_id, [])
    stats["ep_line_count"][ep_id] = 0
    stats["ep_top_speaker"].setdefault(ep_id, {})

    for row in rows:
        canonical = normalize_character(row["character"], alias_map)
        entry = {
            "start": row["start"],
            "end": row["end"],
            "character": canonical,
            "line": row["line"],
        }
        stats["dialogues"][ep_id].append(entry)

        if canonical:
            # Line counts
            stats["char_lines"][canonical] = stats["char_lines"].get(canonical, 0) + 1
            stats["char_episodes"].setdefault(canonical, set()).add(ep_id)
            stats["ep_top_speaker"][ep_id][canonical] = (
                stats["ep_top_speaker"][ep_id].get(canonical, 0) + 1
            )

            # First / last lines (only for tracked characters)
            if canonical in CHARACTERS:
                if canonical not in stats["char_first"]:
                    stats["char_first"][canonical] = {"line": row["line"], "ep_id": ep_id}
                stats["char_last"][canonical] = {"line": row["line"], "ep_id": ep_id}

        # Catchphrases
        for phrase in CATCHPHRASES:
            if phrase_matches(phrase, row["line"]):
                stats["phrase_totals"][phrase] = stats["phrase_totals"].get(phrase, 0) + 1
                stats["phrase_by_char"].setdefault(phrase, {})
                if canonical:
                    stats["phrase_by_char"][phrase][canonical] = (
                        stats["phrase_by_char"][phrase].get(canonical, 0) + 1
                    )

        stats["ep_line_count"][ep_id] = stats["ep_line_count"].get(ep_id, 0) + 1
```

- [ ] **Step 5: Commit**

```bash
git add scripts/build_data.py scripts/test_build.py
git commit -m "feat: catchphrase matching and stats accumulation"
```

---

### Task 5: Write build script — main() and JSON output

**Files:**
- Modify: `scripts/build_data.py`

- [ ] **Step 1: Implement main()**

Add to the bottom of `scripts/build_data.py`:

```python
def build_stats_json(stats, episode_meta):
    """Assemble the stats.json structure from accumulated stats."""
    total_lines = sum(stats["char_lines"].values())
    ep_ratings = [e["rating"] for e in episode_meta.values() if e.get("rating")]
    peak = max(episode_meta.values(), key=lambda e: e.get("rating") or 0)
    lowest = min(episode_meta.values(), key=lambda e: e.get("rating") or 9999)
    top_speaker_name = max(stats["char_lines"], key=stats["char_lines"].get) if stats["char_lines"] else ""

    characters_out = []
    for name in CHARACTERS:
        total = stats["char_lines"].get(name, 0)
        appeared = len(stats["char_episodes"].get(name, set()))
        characters_out.append({
            "name": name,
            "color": CHARACTERS[name]["color"],
            "total_lines": total,
            "episodes_appeared": appeared,
            "lines_per_appearance": round(total / appeared) if appeared else 0,
        })

    episodes_out = []
    for ep_id, meta in sorted(episode_meta.items()):
        top_char_in_ep = ""
        if stats["ep_top_speaker"].get(ep_id):
            top_char_in_ep = max(stats["ep_top_speaker"][ep_id],
                                 key=stats["ep_top_speaker"][ep_id].get)
        episodes_out.append({
            "id": ep_id,
            "season": meta["season"],
            "episode": meta["episode"],
            "title": meta["title"],
            "air_date": meta["air_date"],
            "rating": meta.get("rating"),
            "line_count": stats["ep_line_count"].get(ep_id, 0),
            "top_speaker": top_char_in_ep,
        })

    catchphrases_out = []
    for phrase in CATCHPHRASES:
        total = stats["phrase_totals"].get(phrase, 0)
        by_char = stats["phrase_by_char"].get(phrase, {})
        top_char = max(by_char, key=by_char.get) if by_char else ""
        catchphrases_out.append({
            "phrase": phrase,
            "total": total,
            "top_character": top_char,
            "by_character": dict(sorted(by_char.items(), key=lambda x: -x[1])),
        })
    catchphrases_out.sort(key=lambda x: -x["total"])

    first_last_out = []
    for name in CHARACTERS:
        entry = {"character": name}
        if name in stats["char_first"]:
            fl = stats["char_first"][name]
            ep = episode_meta.get(fl["ep_id"], {})
            entry["first"] = {"line": fl["line"], "episode_id": fl["ep_id"],
                              "episode_title": ep.get("title", "")}
        if name in stats["char_last"]:
            ll = stats["char_last"][name]
            ep = episode_meta.get(ll["ep_id"], {})
            entry["last"] = {"line": ll["line"], "episode_id": ll["ep_id"],
                             "episode_title": ep.get("title", "")}
        first_last_out.append(entry)

    return {
        "meta": {
            "total_lines": total_lines,
            "total_episodes": len(episode_meta),
            "total_seasons": 7,
            "peak_rating": {"value": peak.get("rating"), "episode": peak["id"],
                            "title": peak["title"]},
            "lowest_rating": {"value": lowest.get("rating"), "episode": lowest["id"],
                              "title": lowest["title"]},
            "top_speaker": {"character": top_speaker_name,
                            "lines": stats["char_lines"].get(top_speaker_name, 0)},
        },
        "episodes": episodes_out,
        "characters": characters_out,
        "catchphrases": catchphrases_out,
        "first_last": first_last_out,
    }


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_glob = os.path.join(root, "dataset", "csv", "*.csv")
    meta_path = os.path.join(root, "dataset", "episodes_data", "buffy_episodes.json")
    out_stats = os.path.join(root, "data", "stats.json")
    out_dialogues = os.path.join(root, "data", "dialogues.json")

    # Load episode metadata keyed by id
    with open(meta_path, encoding="utf-8") as f:
        raw_meta = json.load(f)
    episode_meta = {ep["id"]: ep for ep in raw_meta["episodes"]}

    # Init stats accumulator
    stats = {
        "dialogues": {},
        "char_lines": {},
        "char_episodes": {},
        "char_first": {},
        "char_last": {},
        "phrase_totals": {},
        "phrase_by_char": {},
        "ep_line_count": {},
        "ep_top_speaker": {},
    }

    # Process each CSV in air_date order (ensures first/last line logic is correct)
    csv_files = sorted(glob.glob(csv_glob))
    for filepath in csv_files:
        ep_id = episode_id_from_filename(filepath)
        rows = read_csv_rows(filepath)
        accumulate_episode(rows, ep_id, ALIAS_MAP, stats)
        print(f"  processed {ep_id} ({len(rows)} rows)")

    # Ensure every episode has a key in dialogues (even if empty)
    for ep_id in episode_meta:
        stats["dialogues"].setdefault(ep_id, [])

    # Build and write stats.json
    stats_data = build_stats_json(stats, episode_meta)
    os.makedirs(os.path.dirname(out_stats), exist_ok=True)
    with open(out_stats, "w", encoding="utf-8") as f:
        json.dump(stats_data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"Written: {out_stats}")

    # Write dialogues.json
    with open(out_dialogues, "w", encoding="utf-8") as f:
        json.dump(stats["dialogues"], f, ensure_ascii=False, separators=(",", ":"))
    print(f"Written: {out_dialogues}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the build script**

```bash
cd /Users/iko/DEV/Buffy-Search && python scripts/build_data.py
```

Expected: 143 "processed sXXeXX" lines, then two "Written:" lines. No errors.

- [ ] **Step 3: Verify output shape**

```bash
python3 -c "
import json
s = json.load(open('data/stats.json'))
print('total_lines:', s['meta']['total_lines'])
print('episodes:', len(s['episodes']))
print('characters:', len(s['characters']))
print('catchphrases:', len(s['catchphrases']))
print('first_last entries:', len(s['first_last']))
d = json.load(open('data/dialogues.json'))
print('dialogue keys:', len(d))
print('s01e01 lines:', len(d['s01e01']))
"
```

Expected:
- `total_lines` > 40000
- `episodes` == 143
- `characters` == 13
- `catchphrases` == 8
- `first_last entries` == 13
- `dialogue keys` == 143
- `s01e01 lines` > 100

- [ ] **Step 4: Run all tests**

```bash
python scripts/test_build.py
```

Expected: all PASS.

- [ ] **Step 5: Commit data and script**

```bash
git add scripts/build_data.py data/stats.json data/dialogues.json
git commit -m "feat: complete build script, generate stats.json and dialogues.json"
```

---

## Chunk 2: Foundation + Hero + Episode Explorer + Who Speaks Most

### Task 6: HTML skeleton and CSS foundation

**Files:**
- Create: `index.html`
- Create: `css/style.css`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Buffy the Vampire Slayer — Data & Dialogue</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Space+Mono:wght@400;700&display=swap">
  <link rel="stylesheet" href="css/style.css">
  <!-- Chart.js from CDN — used by ratings.js and catchphrases.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>

  <!-- Side navigation dots -->
  <nav class="side-nav" aria-label="Page sections">
    <a href="#hero"         class="nav-dot" data-label="Hero"              aria-label="Hero"></a>
    <a href="#explorer"     class="nav-dot" data-label="Episode Explorer"  aria-label="Episode Explorer"></a>
    <a href="#characters"   class="nav-dot" data-label="Who Speaks Most"   aria-label="Who Speaks Most"></a>
    <a href="#ratings"      class="nav-dot" data-label="IMDb Ratings"      aria-label="IMDb Ratings"></a>
    <a href="#catchphrases" class="nav-dot" data-label="Catchphrases"      aria-label="Catchphrases"></a>
    <a href="#firstlast"    class="nav-dot" data-label="First & Last Lines" aria-label="First & Last Lines"></a>
    <a href="#search"       class="nav-dot" data-label="Search"            aria-label="Search"></a>
  </nav>

  <!-- Floating search button -->
  <button class="search-float" onclick="document.getElementById('search').scrollIntoView({behavior:'smooth'})">
    ⚔ Search Dialogue
  </button>

  <main>
    <section id="hero"><!-- populated by hero.js --></section>
    <section id="explorer"><!-- populated by episode-explorer.js --></section>
    <section id="characters"><!-- populated by characters.js --></section>
    <section id="ratings"><!-- populated by ratings.js --></section>
    <section id="catchphrases"><!-- populated by catchphrases.js --></section>
    <section id="firstlast"><!-- populated by firstlast.js --></section>
    <section id="search"><!-- populated by search.js --></section>
  </main>

  <footer class="site-footer">
    <p>Transcript data: <a href="https://github.com/jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer" target="_blank" rel="noopener">jfreedland/Timestamp-Audio-in-Buffy-the-Vampire-Slayer</a></p>
    <p>Episode ratings: <a href="https://www.tvmaze.com/shows/427/buffy-the-vampire-slayer" target="_blank" rel="noopener">TVMaze</a></p>
  </footer>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/style.css**

```css
/* ── VARIABLES ──────────────────────────────────────────────────────────────── */
:root {
  --night:  #0D0D0F;
  --dusk:   #1A1A24;
  --fog:    #2A2A38;
  --mist:   #3D3D55;
  --blood:  #8B0000;
  --stake:  #C8860A;
  --pale:   #E8E0D5;
  --ghost:  #B8B0A8;
}

/* ── RESET & BASE ───────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; scroll-behavior: smooth; }

body {
  background: var(--night);
  color: var(--pale);
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  overflow-x: hidden;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(139,0,0,.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(200,134,10,.08) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

/* ── TYPOGRAPHY ─────────────────────────────────────────────────────────────── */
h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  font-weight: 700;
  letter-spacing: -2px;
  line-height: 0.9;
}
h1 em { color: var(--blood); font-style: italic; display: block; }

h2 {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  letter-spacing: -1px;
  margin-bottom: 1.5rem;
}

a { color: var(--stake); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Minimum font size rule: nothing below 13px */
small, .meta, .ep-ref, .tag { font-size: 13px; }

/* ── LAYOUT ─────────────────────────────────────────────────────────────────── */
main { position: relative; z-index: 1; }

section {
  max-width: 960px;
  margin: 0 auto;
  padding: 80px 32px;
  border-bottom: 1px solid var(--fog);
}

/* ── SIDE NAV ───────────────────────────────────────────────────────────────── */
.side-nav {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 100;
}

.nav-dot {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mist);
  display: block;
  transition: background 0.2s, transform 0.2s;
}
.nav-dot::after {
  content: attr(data-label);
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: var(--dusk);
  border: 1px solid var(--fog);
  color: var(--ghost);
  font-size: 13px;
  padding: 3px 8px;
  white-space: nowrap;
  border-radius: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}
.nav-dot:hover::after { opacity: 1; }
.nav-dot.active, .nav-dot:hover { background: var(--stake); transform: scale(1.4); }

/* ── FLOATING SEARCH BUTTON ─────────────────────────────────────────────────── */
.search-float {
  position: fixed;
  bottom: 28px;
  right: 52px;
  background: var(--blood);
  color: var(--pale);
  border: none;
  padding: 12px 20px;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  z-index: 100;
  border-radius: 2px;
  transition: opacity 0.2s;
}
.search-float:hover { opacity: 0.85; }

/* ── SHARED COMPONENTS ──────────────────────────────────────────────────────── */
.subtitle {
  font-size: 13px;
  color: var(--ghost);
  letter-spacing: 1px;
  margin-bottom: 1.5rem;
}

.card {
  background: var(--dusk);
  border: 1px solid var(--fog);
  border-radius: 3px;
}

.error-msg {
  color: var(--blood);
  font-size: 13px;
  padding: 12px;
  border: 1px solid var(--blood);
  border-radius: 2px;
  margin-top: 12px;
}

/* ── HERO ───────────────────────────────────────────────────────────────────── */
.hero-eyebrow {
  font-size: 13px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--stake);
  margin-bottom: 14px;
  opacity: 0.8;
}

.hero-tagline {
  font-size: 13px;
  color: var(--ghost);
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 14px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-top: 40px;
}

.stat-card {
  background: var(--dusk);
  border: 1px solid var(--fog);
  border-radius: 3px;
  padding: 20px 16px;
}
.stat-card .num {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--stake);
  line-height: 1;
}
.stat-card .lbl {
  font-size: 13px;
  color: var(--ghost);
  margin-top: 6px;
}

/* ── EPISODE EXPLORER ───────────────────────────────────────────────────────── */
.char-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 20px;
}
.char-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.char-pill .swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ep-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 20px;
}
.season-btn {
  background: var(--fog);
  border: 1px solid var(--mist);
  color: var(--ghost);
  padding: 7px 12px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.15s;
}
.season-btn.active {
  background: var(--blood);
  color: var(--pale);
  border-color: var(--blood);
}
.ep-select {
  background: var(--dusk);
  border: 1px solid var(--fog);
  color: var(--ghost);
  padding: 7px 12px;
  font-family: inherit;
  font-size: 13px;
  border-radius: 2px;
  margin-left: 8px;
}

.dot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  background: var(--dusk);
  padding: 20px;
  border: 1px solid var(--fog);
  border-radius: 3px;
  min-height: 80px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  cursor: default;
}

.ep-info-bar {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-top: 14px;
  font-size: 13px;
  color: var(--ghost);
}
.ep-info-bar span { color: var(--stake); }
.ep-info-bar .loading { color: var(--mist); font-style: italic; }

/* ── WHO SPEAKS MOST ────────────────────────────────────────────────────────── */
.toggle-wrap { display: flex; justify-content: center; margin-bottom: 28px; }
.toggle-bar {
  display: flex;
  border: 1px solid var(--fog);
  border-radius: 999px;
  overflow: hidden;
}
.toggle-btn {
  padding: 9px 22px;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border: none;
  cursor: pointer;
  background: var(--dusk);
  color: var(--ghost);
  transition: background 0.15s, color 0.15s;
}
.toggle-btn.active { background: var(--blood); color: var(--pale); }

.char-bars { display: flex; flex-direction: column; gap: 14px; }
.char-row { display: flex; align-items: center; gap: 14px; }
.char-name {
  width: 90px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--ghost);
  text-align: right;
  flex-shrink: 0;
}
.bar-track {
  flex: 1;
  background: var(--fog);
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.bar-val { font-size: 13px; color: var(--pale); min-width: 80px; }

/* ── RATINGS ────────────────────────────────────────────────────────────────── */
.chart-wrap {
  position: relative;
  background: var(--dusk);
  border: 1px solid var(--fog);
  border-radius: 3px;
  padding: 24px;
}
.chart-callout {
  position: absolute;
  background: var(--dusk);
  border: 1px solid var(--stake);
  color: var(--stake);
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}
.chart-callout::after {
  content: '▼';
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: var(--stake);
}
.chart-callout.low::after { content: '▲'; top: -14px; bottom: auto; }

/* ── CATCHPHRASES ───────────────────────────────────────────────────────────── */
/* Uses .chart-wrap, nothing extra needed */

/* ── FIRST & LAST LINES ─────────────────────────────────────────────────────── */
.fl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  justify-items: start;
}
.fl-card {
  width: 100%;
  background: var(--dusk);
  border: 1px solid var(--fog);
  border-radius: 3px;
  overflow: hidden;
}
.fl-card-header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.fl-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.fl-block { padding: 12px 16px; border-top: 1px solid var(--fog); }
.fl-block .tag { font-size: 13px; color: var(--ghost); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
.fl-block .quote { font-size: 13px; font-style: italic; line-height: 1.5; }
.fl-block .ep-ref { font-size: 13px; color: var(--mist); margin-top: 4px; }

/* ── SEARCH ─────────────────────────────────────────────────────────────────── */
.search-controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.search-row { display: flex; gap: 10px; }
.search-input {
  flex: 1;
  background: var(--dusk);
  border: 1px solid var(--mist);
  color: var(--pale);
  padding: 12px 16px;
  font-family: inherit;
  font-size: 14px;
  border-radius: 2px;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--stake); }
.search-btn {
  background: var(--blood);
  color: var(--pale);
  border: none;
  padding: 12px 22px;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 2px;
}
.filter-row { display: flex; gap: 8px; }
.filter-select {
  background: var(--dusk);
  border: 1px solid var(--fog);
  color: var(--ghost);
  padding: 8px 12px;
  font-family: inherit;
  font-size: 13px;
  border-radius: 2px;
}
.result-count { font-size: 13px; color: var(--ghost); margin-bottom: 12px; }
.result-card {
  background: var(--dusk);
  border: 1px solid var(--fog);
  border-left: 3px solid var(--blood);
  border-radius: 0 3px 3px 0;
  padding: 14px 18px;
  margin-bottom: 10px;
}
.result-card .r-meta { font-size: 13px; color: var(--ghost); margin-bottom: 5px; }
.result-card .r-line { font-size: 14px; }
.result-card mark { background: transparent; color: var(--stake); font-style: normal; }

/* ── FOOTER ─────────────────────────────────────────────────────────────────── */
.site-footer {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 32px;
  font-size: 13px;
  color: var(--mist);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.site-footer a { color: var(--ghost); }
.site-footer a:hover { color: var(--stake); }
```

- [ ] **Step 3: Open in browser and verify it loads without errors**

Open `index.html` in a browser (or run `python3 -m http.server 8000` and visit `http://localhost:8000`). Console should show no errors. Page should be dark, fonts should load, sections should be empty placeholders.

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: HTML skeleton and CSS foundation"
```

---

### Task 7: main.js — data loading and IntersectionObserver nav

**Files:**
- Create: `js/main.js`

- [ ] **Step 1: Create js/main.js**

```javascript
// js/main.js
// Bootstrap: load stats.json immediately, expose lazy loader for dialogues.json

import { initHero }          from './hero.js';
import { initExplorer }      from './episode-explorer.js';
import { initCharacters }    from './characters.js';
import { initRatings }       from './ratings.js';
import { initCatchphrases }  from './catchphrases.js';
import { initFirstLast }     from './firstlast.js';
import { initSearch }        from './search.js';

// ── Shared lazy-load promise for dialogues.json ──────────────────────────────
let _dialoguesPromise = null;

export function loadDialogues() {
  if (!_dialoguesPromise) {
    _dialoguesPromise = fetch('data/dialogues.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .catch(() => {
        // Propagate error string — callers display it
        throw new Error('Could not load transcript data. Please refresh the page.');
      });
  }
  return _dialoguesPromise;
}

// ── Side-nav IntersectionObserver ────────────────────────────────────────────
function initSideNav() {
  const dots = document.querySelectorAll('.nav-dot');
  const sections = document.querySelectorAll('main section[id]');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        dots.forEach(d => d.classList.remove('active'));
        const dot = document.querySelector(`.nav-dot[href="#${entry.target.id}"]`);
        if (dot) dot.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  let stats;
  try {
    const res = await fetch('data/stats.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    stats = await res.json();
  } catch {
    document.querySelector('main').innerHTML =
      '<p class="error-msg" style="margin:40px auto;max-width:960px;padding:32px">Failed to load data. Make sure you are serving the site over HTTP (not file://).</p>';
    return;
  }

  initHero(stats);
  initExplorer(stats);
  initCharacters(stats);
  initRatings(stats);
  initCatchphrases(stats);
  initFirstLast(stats);
  initSearch(stats);
  initSideNav();
}

boot();
```

- [ ] **Step 2: Verify no console errors**

Serve via `python3 -m http.server 8000` and open `http://localhost:8000`. Open browser console — expect one fetch error for `data/stats.json` ONLY if data files aren't present. If data files exist, no errors.

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: main.js bootstrap, shared lazy loader, side-nav observer"
```

---

### Task 8: hero.js

**Files:**
- Create: `js/hero.js`

- [ ] **Step 1: Create js/hero.js**

```javascript
// js/hero.js

export function initHero(stats) {
  const { meta } = stats;
  const el = document.getElementById('hero');

  el.innerHTML = `
    <div class="hero-eyebrow">Buffy the Vampire Slayer · 1997–2003</div>
    <h1>Into Every<br><em>Generation</em></h1>
    <div class="hero-tagline">Seven seasons of dialogue, data &amp; darkness</div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="num">${meta.total_lines.toLocaleString()}</div>
        <div class="lbl">Lines of dialogue</div>
      </div>
      <div class="stat-card">
        <div class="num">${meta.total_episodes}</div>
        <div class="lbl">Episodes</div>
      </div>
      <div class="stat-card">
        <div class="num">${meta.peak_rating.value}</div>
        <div class="lbl">Peak IMDb rating</div>
      </div>
      <div class="stat-card">
        <div class="num">${meta.top_speaker.character}</div>
        <div class="lbl">Top speaker</div>
      </div>
      <div class="stat-card">
        <div class="num">${meta.total_seasons}</div>
        <div class="lbl">Seasons</div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:8000`. The hero section should show the five stat cards with real numbers from `stats.json`.

- [ ] **Step 3: Commit**

```bash
git add js/hero.js
git commit -m "feat: hero section with stat cards"
```

---

### Task 9: episode-explorer.js

**Files:**
- Create: `js/episode-explorer.js`

- [ ] **Step 1: Create js/episode-explorer.js**

```javascript
// js/episode-explorer.js
import { loadDialogues } from './main.js';

const OTHER_COLOR = '#444444';

// Build character color map from stats.characters
function buildColorMap(characters) {
  const map = {};
  characters.forEach(c => { map[c.name] = c.color; });
  return map;
}

// Render placeholder dots (gray) using line_count from stats
function renderPlaceholderDots(container, lineCount) {
  container.innerHTML = '';
  for (let i = 0; i < lineCount; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = OTHER_COLOR;
    container.appendChild(dot);
  }
}

// Render real dots from dialogue data
function renderDots(container, lines, colorMap) {
  container.innerHTML = '';
  lines.forEach(entry => {
    const dot = document.createElement('div');
    dot.className = 'dot';
    dot.style.background = colorMap[entry.character] || OTHER_COLOR;
    dot.title = entry.character
      ? `${entry.character}: ${entry.line}`
      : entry.line;
    container.appendChild(dot);
  });
}

function updateInfoBar(bar, ep, topSpeaker) {
  bar.innerHTML = `
    <div>Episode <span>${ep.id.toUpperCase()}</span></div>
    <div>Title <span>${ep.title}</span></div>
    <div>Rating <span>${ep.rating ?? 'N/A'} ★</span></div>
    <div>Lines <span>${ep.line_count}</span></div>
    <div>Top speaker <span>${topSpeaker || '—'}</span></div>
  `;
}

export function initExplorer(stats) {
  const { episodes, characters } = stats;
  const colorMap = buildColorMap(characters);

  // Group episodes by season
  const bySeason = {};
  episodes.forEach(ep => {
    (bySeason[ep.season] = bySeason[ep.season] || []).push(ep);
  });

  const el = document.getElementById('explorer');

  // Build legend HTML
  const legendHTML = characters.map(c =>
    `<div class="char-pill">
       <div class="swatch" style="background:${c.color}"></div>${c.name}
     </div>`
  ).join('') + `<div class="char-pill"><div class="swatch" style="background:${OTHER_COLOR}"></div>Other</div>`;

  // Build season buttons
  const seasons = Object.keys(bySeason).sort((a, b) => a - b);
  const seasonBtnsHTML = seasons.map(s =>
    `<button class="season-btn" data-season="${s}">S${s}</button>`
  ).join('');

  el.innerHTML = `
    <h2>Episode Explorer</h2>
    <p class="subtitle">Each dot is one line of dialogue — hover to read it</p>
    <div class="char-legend">${legendHTML}</div>
    <div class="ep-controls">
      ${seasonBtnsHTML}
      <select class="ep-select" id="ep-select"></select>
    </div>
    <div class="dot-grid" id="dot-grid"></div>
    <div class="ep-info-bar" id="ep-info-bar"></div>
  `;

  const dotGrid = el.querySelector('#dot-grid');
  const epSelect = el.querySelector('#ep-select');
  const infoBar = el.querySelector('#ep-info-bar');
  const seasonBtns = el.querySelectorAll('.season-btn');

  let currentSeason = seasons[0];
  let dialoguesData = null;

  function populateDropdown(season) {
    const eps = bySeason[season] || [];
    epSelect.innerHTML = eps.map(ep =>
      `<option value="${ep.id}">S${ep.season}E${String(ep.episode).padStart(2,'0')} — ${ep.title}</option>`
    ).join('');
  }

  function showEpisode(epId) {
    const ep = episodes.find(e => e.id === epId);
    if (!ep) return;

    if (dialoguesData) {
      renderDots(dotGrid, dialoguesData[epId] || [], colorMap);
    } else {
      renderPlaceholderDots(dotGrid, ep.line_count);
    }
    updateInfoBar(infoBar, ep, ep.top_speaker);
  }

  function selectSeason(season) {
    currentSeason = season;
    seasonBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.season === String(season));
    });
    populateDropdown(season);
    showEpisode(epSelect.value);
  }

  // Season tab click — triggers lazy load
  seasonBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectSeason(btn.dataset.season);
      if (!dialoguesData) {
        infoBar.innerHTML = '<span class="loading">Loading transcript data…</span>';
        loadDialogues()
          .then(data => {
            dialoguesData = data;
            showEpisode(epSelect.value);
          })
          .catch(err => {
            dotGrid.innerHTML = `<p class="error-msg">${err.message}</p>`;
          });
      }
    });
  });

  // Episode dropdown change
  epSelect.addEventListener('change', () => showEpisode(epSelect.value));

  // Initial render: season 1, episode 1, gray placeholder dots (no fetch)
  populateDropdown(currentSeason);
  seasonBtns[0]?.classList.add('active');
  showEpisode(epSelect.value);
}
```

- [ ] **Step 2: Verify in browser**

Reload. The Episode Explorer section should show:
- Character legend with correct colors
- Season buttons S1–S7, S1 active
- Dropdown with S1 episodes
- Gray dot grid for S1E01
- Info bar with episode title, rating, line count

Click "S2" — the fetch should fire (check Network tab), dots should re-render in color once loaded.

- [ ] **Step 3: Commit**

```bash
git add js/episode-explorer.js
git commit -m "feat: episode explorer with dot grid and lazy dialogue loading"
```

---

### Task 10: characters.js — Who Speaks Most with toggle

**Files:**
- Create: `js/characters.js`

- [ ] **Step 1: Create js/characters.js**

```javascript
// js/characters.js

export function initCharacters(stats) {
  const { characters } = stats;
  const el = document.getElementById('characters');

  el.innerHTML = `
    <h2>Who Speaks Most</h2>
    <div class="toggle-wrap">
      <div class="toggle-bar">
        <button class="toggle-btn active" data-mode="global">Total lines</button>
        <button class="toggle-btn" data-mode="per">Per appearance</button>
      </div>
    </div>
    <div class="char-bars" id="char-bars"></div>
  `;

  const barsEl = el.querySelector('#char-bars');
  const btns = el.querySelectorAll('.toggle-btn');

  function render(mode) {
    const scored = characters.map(c => ({
      ...c,
      val: mode === 'global' ? c.total_lines : c.lines_per_appearance,
    })).sort((a, b) => b.val - a.val);

    const max = scored[0]?.val || 1;

    barsEl.innerHTML = scored.map(c => {
      const pct = ((c.val / max) * 100).toFixed(1);
      const label = mode === 'global'
        ? c.val.toLocaleString()
        : `${c.val} / ep`;
      return `
        <div class="char-row">
          <div class="char-name">${c.name}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${c.color}"></div>
          </div>
          <div class="bar-val">${label}</div>
        </div>
      `;
    }).join('');
  }

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.mode);
    });
  });

  render('global');
}
```

- [ ] **Step 2: Verify in browser**

Reload. "Who Speaks Most" section should show 13 sorted bars. Toggle between "Total lines" and "Per appearance" — bars should re-sort.

- [ ] **Step 3: Commit**

```bash
git add js/characters.js
git commit -m "feat: who speaks most chart with global/per-appearance toggle"
```

---

## Chunk 3: Charts + First/Last Lines + Search + Deployment

### Task 11: ratings.js — IMDb scatter plot

**Files:**
- Create: `js/ratings.js`

- [ ] **Step 1: Create js/ratings.js**

```javascript
// js/ratings.js
// Requires Chart.js loaded globally from CDN

const SEASON_COLORS = ['#C8251A','#C8860A','#4A90D9','#7B5EA7','#E8D5A3','#2C6E49','#D4847A'];

export function initRatings(stats) {
  const { episodes } = stats;
  const el = document.getElementById('ratings');

  el.innerHTML = `
    <h2>IMDb Ratings</h2>
    <p class="subtitle">All ${episodes.length} episodes · hover for details · color per season</p>
    <div class="chart-wrap" style="height:320px">
      <canvas id="ratings-canvas"></canvas>
    </div>
  `;

  const ratings = episodes.map(ep => ep.rating).filter(r => r != null);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const yMin = Math.floor(minRating) - 0.5;
  const yMax = Math.ceil(maxRating) + 0.1;

  // Find season start x-positions for labels
  const seasonStarts = {};
  episodes.forEach((ep, i) => {
    if (!seasonStarts[ep.season]) seasonStarts[ep.season] = i;
  });

  const data = episodes.map((ep, i) => ({
    x: i + 1,
    y: ep.rating,
    label: ep.title,
    season: ep.season,
  }));

  const chart = new Chart(document.getElementById('ratings-canvas'), {
    type: 'scatter',
    data: {
      datasets: [{
        data,
        backgroundColor: data.map(d => SEASON_COLORS[d.season - 1]),
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const d = ctx.raw;
              return `${d.label} — ${d.y} ★`;
            },
          }
        }
      },
      scales: {
        x: {
          min: 1,
          max: episodes.length,
          ticks: {
            color: '#3D3D55',
            font: { size: 13 },
            callback: (val) => {
              // Show season label at season start positions
              const match = Object.entries(seasonStarts).find(([, idx]) => idx + 1 === val);
              return match ? `S${match[0]}` : '';
            },
            maxRotation: 0,
          },
          grid: { color: '#2A2A38' },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: { color: '#3D3D55', font: { size: 13 } },
          grid: { color: '#2A2A38' },
        }
      }
    }
  });

  // Add callout overlays after chart animation completes (more reliable than rAF)
  chart.options.animation = {
    onComplete: () => addCallouts(chart, data, episodes, el)
  };
  chart.update();
}

function addCallouts(chart, data, episodes, el) {
  const wrap = el.querySelector('.chart-wrap');
  const meta = chart.getDatasetMeta(0);

  const peakIdx = episodes.findIndex(ep => ep.id === (
    episodes.reduce((best, ep) => (ep.rating ?? 0) > (best.rating ?? 0) ? ep : best)
  ).id);
  const lowIdx = episodes.findIndex(ep => ep.id === (
    episodes.filter(ep => ep.rating != null)
             .reduce((worst, ep) => ep.rating < worst.rating ? ep : worst)
  ).id);

  function makeCallout(idx, isLow) {
    if (idx < 0 || !meta.data[idx]) return;
    const pt = meta.data[idx];
    const ep = episodes[idx];
    const div = document.createElement('div');
    div.className = `chart-callout${isLow ? ' low' : ''}`;
    div.textContent = `${ep.rating} ★ ${ep.title}`;
    // Position relative to chart-wrap
    const wrapRect = wrap.getBoundingClientRect();
    const canvasRect = chart.canvas.getBoundingClientRect();
    const left = canvasRect.left - wrapRect.left + pt.x;
    const top  = canvasRect.top  - wrapRect.top  + pt.y + (isLow ? 12 : -36);
    div.style.cssText = `left:${left}px;top:${top}px;transform:translateX(-50%)`;
    wrap.style.position = 'relative';
    wrap.appendChild(div);
  }

  makeCallout(peakIdx, false);
  makeCallout(lowIdx, true);
}
```

- [ ] **Step 2: Verify in browser**

Reload. The Ratings section should show a scatter plot with colored dots per season. Hover shows episode title + rating. Two callout labels should appear for best and worst episodes.

- [ ] **Step 3: Commit**

```bash
git add js/ratings.js
git commit -m "feat: IMDb ratings scatter plot with Chart.js and callout overlays"
```

---

### Task 12: catchphrases.js

**Files:**
- Create: `js/catchphrases.js`

- [ ] **Step 1: Create js/catchphrases.js**

```javascript
// js/catchphrases.js
// Requires Chart.js loaded globally from CDN

export function initCatchphrases(stats) {
  const { catchphrases } = stats;
  const el = document.getElementById('catchphrases');

  const sorted = [...catchphrases].sort((a, b) => b.total - a.total);

  el.innerHTML = `
    <h2>Catchphrases &amp; Keywords</h2>
    <p class="subtitle">How often iconic words appear across 7 seasons</p>
    <div class="chart-wrap" style="height:${Math.max(200, sorted.length * 44)}px">
      <canvas id="catchphrases-canvas"></canvas>
    </div>
  `;

  new Chart(document.getElementById('catchphrases-canvas'), {
    type: 'bar',
    data: {
      labels: sorted.map(p => `${p.phrase}  (${p.total})`),
      datasets: [{
        data: sorted.map(p => p.total),
        backgroundColor: '#C8860A',
        borderRadius: 2,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const phrase = sorted[ctx.dataIndex];
              // Top 3 speakers (sorted alphabetically for tie-breaking)
              const top3 = Object.entries(phrase.by_character)
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 3)
                .map(([name, count]) => `${name}: ${count}`)
                .join(' · ');
              return top3 || `Total: ${phrase.total}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#3D3D55', font: { size: 13 } },
          grid: { color: '#2A2A38' },
        },
        y: {
          ticks: { color: '#B8B0A8', font: { size: 13 } },
          grid: { display: false },
        }
      }
    }
  });
}
```

- [ ] **Step 2: Verify in browser**

Reload. Catchphrases section should show a horizontal bar chart, sorted by count. Hover shows top 3 speakers.

- [ ] **Step 3: Commit**

```bash
git add js/catchphrases.js
git commit -m "feat: catchphrases horizontal bar chart with speaker tooltips"
```

---

### Task 13: firstlast.js

**Files:**
- Create: `js/firstlast.js`

- [ ] **Step 1: Create js/firstlast.js**

```javascript
// js/firstlast.js

export function initFirstLast(stats) {
  const { first_last, characters } = stats;
  const colorMap = Object.fromEntries(characters.map(c => [c.name, c.color]));
  const el = document.getElementById('firstlast');

  const cards = first_last.map(entry => {
    const color = colorMap[entry.character] || '#444';
    const firstBlock = entry.first ? `
      <div class="fl-block">
        <div class="tag">First line</div>
        <div class="quote">"${entry.first.line}"</div>
        <div class="ep-ref">${entry.first.episode_id.toUpperCase()} · ${entry.first.episode_title}</div>
      </div>` : '';
    const lastBlock = entry.last ? `
      <div class="fl-block">
        <div class="tag">Last line</div>
        <div class="quote">"${entry.last.line}"</div>
        <div class="ep-ref">${entry.last.episode_id.toUpperCase()} · ${entry.last.episode_title}</div>
      </div>` : '';
    return `
      <div class="fl-card">
        <div class="fl-card-header">
          <div class="fl-dot" style="background:${color}"></div>${entry.character}
        </div>
        ${firstBlock}${lastBlock}
      </div>`;
  }).join('');

  el.innerHTML = `
    <h2>First &amp; Last Lines</h2>
    <p class="subtitle">How each character entered and exited the story</p>
    <div class="fl-grid">${cards}</div>
  `;
}
```

- [ ] **Step 2: Verify in browser**

Reload. 13 cards in a 3-column grid, each showing first and last lines with episode references.

- [ ] **Step 3: Commit**

```bash
git add js/firstlast.js
git commit -m "feat: first and last lines character cards"
```

---

### Task 14: search.js

**Files:**
- Create: `js/search.js`

- [ ] **Step 1: Create js/search.js**

```javascript
// js/search.js
import { loadDialogues } from './main.js';

const MAX_RESULTS = 100;

export function initSearch(stats) {
  const { episodes, characters } = stats;
  const el = document.getElementById('search');

  // Build episode lookup by id
  const epById = Object.fromEntries(episodes.map(ep => [ep.id, ep]));
  const seasons = [...new Set(episodes.map(ep => ep.season))].sort((a, b) => a - b);
  const charNames = characters.map(c => c.name);

  el.innerHTML = `
    <h2>Search Dialogue</h2>
    <p class="subtitle">Search every line spoken across all ${episodes.length} episodes</p>
    <div class="search-controls">
      <div class="search-row">
        <input class="search-input" id="search-input" type="text" placeholder="Search dialogue…" autocomplete="off">
        <button class="search-btn" id="search-btn">Search</button>
      </div>
      <div class="filter-row">
        <select class="filter-select" id="filter-season">
          <option value="">All seasons</option>
          ${seasons.map(s => `<option value="${s}">Season ${s}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-character">
          <option value="">All characters</option>
          ${charNames.map(n => `<option value="${n}">${n}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="search-results"></div>
  `;

  const input = el.querySelector('#search-input');
  const btn = el.querySelector('#search-btn');
  const filterSeason = el.querySelector('#filter-season');
  const filterChar = el.querySelector('#filter-character');
  const resultsEl = el.querySelector('#search-results');

  let dialogues = null;
  let fetchTriggered = false;

  function highlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }

  function runSearch() {
    const query = input.value.trim();
    const season = filterSeason.value;
    const character = filterChar.value;

    if (!query) { resultsEl.innerHTML = ''; return; }
    if (!dialogues) { resultsEl.innerHTML = '<p class="result-count">Loading transcript data…</p>'; return; }

    const matches = [];
    for (const [epId, lines] of Object.entries(dialogues)) {
      const ep = epById[epId];
      if (!ep) continue;
      if (season && String(ep.season) !== String(season)) continue;

      for (const entry of lines) {
        if (character && entry.character !== character) continue;
        if (!entry.line.toLowerCase().includes(query.toLowerCase())) continue;
        matches.push({ ep, entry });
        if (matches.length > MAX_RESULTS) break;
      }
      if (matches.length > MAX_RESULTS) break;
    }

    if (matches.length === 0) {
      resultsEl.innerHTML = '<p class="result-count">No lines found matching your search.</p>';
      return;
    }

    // Check if we hit the cap
    let countMsg = '';
    if (matches.length === MAX_RESULTS) {
      // We may have stopped early — do a count pass if under threshold
      countMsg = `<p class="result-count">Showing ${MAX_RESULTS} results — refine your search to see more.</p>`;
    } else {
      countMsg = `<p class="result-count">${matches.length} result${matches.length !== 1 ? 's' : ''}</p>`;
    }

    const cards = matches.map(({ ep, entry }) => {
      const epLabel = `S${ep.season}E${String(ep.episode).padStart(2,'0')}`;
      const rating = ep.rating ? `${ep.rating} ★` : '';
      return `
        <div class="result-card">
          <div class="r-meta">${entry.character ? entry.character.toUpperCase() + ' · ' : ''}${epLabel} · ${ep.title}${rating ? ' · ' + rating : ''}</div>
          <div class="r-line">${highlight(entry.line, query)}</div>
        </div>`;
    }).join('');

    resultsEl.innerHTML = countMsg + cards;
  }

  // Trigger lazy load on first keystroke
  input.addEventListener('keydown', () => {
    if (fetchTriggered) return;
    fetchTriggered = true;
    loadDialogues()
      .then(data => { dialogues = data; })
      .catch(err => {
        resultsEl.innerHTML = `<p class="error-msg">${err.message}</p>`;
      });
  });

  input.addEventListener('keyup', e => {
    if (e.key === 'Enter') runSearch();
  });
  btn.addEventListener('click', runSearch);
}
```

- [ ] **Step 2: Verify in browser**

Reload. Search section should show input, two filter dropdowns. Type a query and press Enter or click Search. Results should appear with highlighted keywords, episode info, and rating.

Test edge cases:
- Empty query → no results shown
- Query with no matches → "No lines found" message
- Season filter narrows results
- Character filter narrows results

- [ ] **Step 3: Commit**

```bash
git add js/search.js
git commit -m "feat: dialogue search with season and character filters"
```

---

### Task 15: Final verification and GitHub Pages deployment

**Files:**
- No new files

- [ ] **Step 1: Full visual pass in browser**

Serve the site: `python3 -m http.server 8000` and open `http://localhost:8000`.

Check each section:
- [ ] Hero: 5 stat cards with real numbers
- [ ] Episode Explorer: season tabs work, dot grid loads colors on tab click, dropdown updates
- [ ] Who Speaks Most: 13 bars, toggle re-sorts
- [ ] IMDb Ratings: scatter plot visible, callouts on best/worst episodes, hover tooltips work
- [ ] Catchphrases: horizontal bars, hover shows top 3 speakers
- [ ] First & Last Lines: 13 cards in 3-column grid
- [ ] Search: returns results, filters work, keyword highlighted
- [ ] Side-nav dots: active dot updates as you scroll
- [ ] Floating "Search Dialogue" button: scrolls to search section
- [ ] No console errors

- [ ] **Step 2: Check all font sizes ≥ 13px**

Open browser DevTools → Elements panel. Spot-check the smallest-looking text (ep-ref, tag, meta labels). Confirm computed font-size is ≥ 13px.

- [ ] **Step 3: Ensure dataset/ is not tracked by git**

```bash
git status
```

`dataset/` should not appear. If it does:

```bash
git rm -r --cached dataset/
git commit -m "chore: untrack dataset directory"
```

- [ ] **Step 4: Push to GitHub and enable Pages**

```bash
git push origin main
```

Then on GitHub: Settings → Pages → Source → Deploy from branch → `main` / `/ (root)` → Save.

- [ ] **Step 5: Verify live site**

Visit `https://<your-username>.github.io/<repo-name>/` and confirm the site loads correctly, including the async `dialogues.json` fetch.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: final deployment adjustments"
git push origin main
```

---

*End of plan.*
