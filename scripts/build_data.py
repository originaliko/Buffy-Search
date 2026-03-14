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
