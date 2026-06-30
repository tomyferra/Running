"""
Official race results — auto-imported from {DB_DIR}/races/*.json.

Runner is identified by FULLNAME setting ("Tomas Ferrari") matched
case-insensitively against the name field in each row.

Two JSON formats are supported (detected via DataFields):

  Format A — Mayas/SPORTident style (11 cols):
    [BIB, ID, rank_overall, rank_sex, rank_cat, "Last, First", time,
     DorsalTest, "Male/Female DD-DD", flag, bgcolor]

  Format B — BsAs/Connective style (9 cols):
    [BIB, ID, "rank.", "First Last", flag, "M/FDD-DD", M/F,
     chip_time, gun_time]
    Sex and category ranks are computed from the full results.

Distance is inferred from the filename (10k→10, 21k→21, 42k→42.195,
*maraton*→42.195, *media*/*half*→21.0975).
"""

import json
import logging
import re
from pathlib import Path

from fastapi import APIRouter

from app.config import get_settings

logger   = logging.getLogger(__name__)
router   = APIRouter(prefix="/races", tags=["races"])
settings = get_settings()

RACES_DIR   = Path(settings.db_dir) / "races"
RACES_STORE = Path(settings.db_dir) / "races.json"


# ── persistence ────────────────────────────────────────────────────────────

def _load() -> dict:
    if not RACES_STORE.exists():
        return {}
    return {r["id"]: r for r in json.loads(RACES_STORE.read_text("utf-8"))}


def _save(stored: dict) -> None:
    races = sorted(stored.values(), key=lambda r: r.get("race_date", ""), reverse=True)
    RACES_STORE.write_text(json.dumps(races, ensure_ascii=False, indent=2), "utf-8")


# ── shared helpers ─────────────────────────────────────────────────────────

def _match_name(row_name: str, fullname: str) -> bool:
    parts = fullname.lower().split()
    target = row_name.lower()
    return all(p in target for p in parts)


def _infer_distance(filename: str) -> float | None:
    stem = Path(filename).stem.lower()
    m = re.search(r'(\d+(?:[.,]\d+)?)k', stem)
    if m:
        km = float(m.group(1).replace(",", "."))
        return 42.195 if km == 42 else km
    if any(kw in stem for kw in ("maraton", "marathon", "maratón")):
        return 42.195
    if any(kw in stem for kw in ("media", "half")):
        return 21.0975
    return None


def _to_secs(t: str) -> int:
    parts = [int(x) for x in t.split(":")]
    return parts[0] * 3600 + parts[1] * 60 + parts[2] if len(parts) == 3 else parts[0] * 60 + parts[1]


def _detect_format(datafields: list) -> str:
    joined = " ".join(str(f) for f in datafields)
    if "RangoTotal" in joined:
        return "A"
    if "NAMESHORT" in joined or "SexoMF" in joined:
        return "B"
    return "unknown"


# ── format A parser (Mayas/SPORTident) ────────────────────────────────────

def _parse_a(data: list, meta: dict, filename: str, fullname: str, distance_km: float) -> dict:
    valid = [r for r in data if len(r) >= 9]

    me = next((r for r in valid if _match_name(r[5], fullname)), None)
    if me is None:
        return {"error": f"'{fullname}' not found in standings"}

    total     = len(valid)
    rank      = int(me[2])
    sex_rank  = int(me[3])
    cat_rank  = int(me[4])
    age_group = me[8]
    finish    = me[6]
    males     = sum(1 for r in valid if "Male"   in r[8])
    females   = sum(1 for r in valid if "Female" in r[8])
    total_cat = sum(1 for r in valid if r[8] == age_group)
    winner    = min(valid, key=lambda r: int(r[2]))

    gap_secs  = _to_secs(finish) - _to_secs(winner[6])
    pace_secs = _to_secs(finish) / distance_km

    return {
        "bib":            me[7],
        "runner_name":    me[5],
        "finish_time":    finish,
        "pace":           f"{int(pace_secs // 60)}:{int(pace_secs % 60):02d}",
        "rank_overall":   rank,
        "rank_sex":       sex_rank,
        "rank_category":  cat_rank,
        "age_group":      age_group,
        "total_finishers": total,
        "total_males":    males,
        "total_females":  females,
        "total_category": total_cat,
        "winner_name":    winner[5],
        "winner_time":    winner[6],
        "gap_to_winner":  f"+{gap_secs // 60}:{gap_secs % 60:02d}",
        "pct_from_top":   round(rank / total * 100, 1),
    }


# ── format B parser (BsAs/Connective) ─────────────────────────────────────

def _parse_b(data: list, meta: dict, filename: str, fullname: str, distance_km: float) -> dict:
    valid = [r for r in data if len(r) == 9 and r[2].rstrip(".").isdigit()]

    me = next((r for r in valid if _match_name(r[3], fullname)), None)
    if me is None:
        return {"error": f"'{fullname}' not found in standings"}

    my_rank   = int(me[2].rstrip("."))
    my_sex    = me[6]   # "M" or "F"
    my_cat    = me[5]   # "M30-34"
    finish    = me[7]   # chip time

    total     = len(valid)
    males     = sum(1 for r in valid if r[6] == "M")
    females   = sum(1 for r in valid if r[6] == "F")
    total_cat = sum(1 for r in valid if r[5] == my_cat)

    sex_rank  = sum(1 for r in valid if r[6] == my_sex and int(r[2].rstrip(".")) < my_rank) + 1
    cat_rank  = sum(1 for r in valid if r[5] == my_cat and int(r[2].rstrip(".")) < my_rank) + 1

    winner    = min(valid, key=lambda r: int(r[2].rstrip(".")))
    gap_secs  = _to_secs(finish) - _to_secs(winner[7])
    pace_secs = _to_secs(finish) / distance_km

    return {
        "bib":            me[0],
        "runner_name":    me[3],
        "finish_time":    finish,
        "pace":           f"{int(pace_secs // 60)}:{int(pace_secs % 60):02d}",
        "rank_overall":   my_rank,
        "rank_sex":       sex_rank,
        "rank_category":  cat_rank,
        "age_group":      my_cat,
        "total_finishers": total,
        "total_males":    males,
        "total_females":  females,
        "total_category": total_cat,
        "winner_name":    winner[3],
        "winner_time":    winner[7],
        "gap_to_winner":  f"+{gap_secs // 60}:{gap_secs % 60:02d}",
        "pct_from_top":   round(my_rank / total * 100, 1),
    }


# ── entry point ────────────────────────────────────────────────────────────

def _build_entry(raw: dict, filename: str, fullname: str) -> dict:
    meta = raw.get("list", {})
    base = {
        "id":           Path(filename).stem,
        "race_name":    meta.get("HeadLine1") or Path(filename).stem,
        "race_date":    (meta.get("LastChange") or "")[:10],
        "json_filename": filename,
    }

    distance_km = _infer_distance(filename)
    if distance_km is None:
        return {**base, "error": f"Cannot infer distance from '{filename}' — rename to include e.g. '10k'"}

    fmt = _detect_format(raw.get("DataFields", []))
    if fmt == "unknown":
        return {**base, "error": "Unrecognised DataFields format"}

    data = raw["data"]
    parser = _parse_a if fmt == "A" else _parse_b
    result = parser(data, meta, filename, fullname, distance_km)

    if "error" in result:
        return {**base, "distance_km": distance_km, **result}

    return {**base, "distance_km": distance_km, **result}


def _sync() -> list:
    RACES_DIR.mkdir(parents=True, exist_ok=True)
    stored  = _load()
    changed = False

    for path in sorted(RACES_DIR.glob("*.json")):
        if path.stem in stored:
            continue
        try:
            raw = json.loads(path.read_text("utf-8"))
        except Exception as exc:
            logger.warning("Cannot read %s: %s", path.name, exc)
            continue
        if "data" not in raw or "list" not in raw:
            logger.warning("Skipping %s — unexpected format", path.name)
            continue

        entry = _build_entry(raw, path.name, settings.fullname)
        stored[entry["id"]] = entry
        changed = True
        if "error" in entry:
            logger.warning("Race %s: %s", path.name, entry["error"])
        else:
            logger.info("Auto-imported '%s'", entry["race_name"])

    if changed:
        _save(stored)

    return sorted(stored.values(), key=lambda r: r.get("race_date", ""), reverse=True)


# ── routes ─────────────────────────────────────────────────────────────────

@router.get("", summary="List races (auto-imports new JSON files from races dir)")
async def list_races():
    return _sync()


@router.delete("/{race_id}", summary="Remove a stored race result")
async def delete_race(race_id: str):
    stored = _load()
    stored.pop(race_id, None)
    _save(stored)
    return {"ok": True}
