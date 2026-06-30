"""
Sync service — orchestrates downloading from Garmin Connect and
persisting to the local database.

Flow: GarminClient → parse raw dicts → build entities → ActivityDAO.upsert
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.client.garmin_client import GarminClient, GarminClientError
from app.dao.activity_dao import ActivityDAO
from app.models.entities import Activity, ActivityLap, RunMetrics

logger = logging.getLogger(__name__)

_sync_lock = asyncio.Lock()


class SyncAlreadyRunningError(Exception):
    pass


class SyncService:
    def __init__(self, dao: ActivityDAO, client: GarminClient) -> None:
        self._dao = dao
        self._client = client

    async def sync(self, days: int = 30) -> dict:
        if _sync_lock.locked():
            raise SyncAlreadyRunningError("A sync is already in progress.")

        async with _sync_lock:
            return await self._run_sync(days)

    async def _run_sync(self, days: int) -> dict:
        end_date = datetime.now(tz=timezone.utc).date()
        start_date = end_date - timedelta(days=days)
        logger.info("Syncing activities from %s to %s", start_date, end_date)

        raw_activities = await self._client.get_activities_by_date(
            str(start_date), str(end_date)
        )

        synced = 0
        for raw in raw_activities:
            try:
                await self._upsert_activity(raw)
                synced += 1
            except Exception:
                logger.exception("Failed to persist activity %s", raw.get("activityId"))

        await self._dao.commit()
        logger.info("Sync complete: %d activities stored", synced)
        return {"activities_synced": synced}

    async def _upsert_activity(self, raw: dict) -> None:
        activity_id = str(raw["activityId"])

        activity = Activity(
            activity_id=activity_id,
            name=raw.get("activityName"),
            start_time=_parse_dt(raw.get("startTimeLocal")),
            stop_time=_parse_dt(raw.get("endTimeLocal")),
            sport="running",
            sub_sport=_nested(raw, "activityType", "typeKey"),
            elapsed_time=raw.get("duration"),
            moving_time=raw.get("movingDuration"),
            distance=raw.get("distance"),
            calories=_int(raw.get("calories")),
            avg_hr=_int(raw.get("averageHR")),
            max_hr=_int(raw.get("maxHR")),
            avg_speed=raw.get("averageSpeed"),
            max_speed=raw.get("maxSpeed"),
            ascent=raw.get("elevationGain"),
            descent=raw.get("elevationLoss"),
            max_altitude=raw.get("maxElevation"),
            avg_altitude=raw.get("averageElevation"),
            avg_cadence=_int(raw.get("averageRunningCadenceInStepsPerMinute")),
            max_cadence=_int(raw.get("maxRunningCadenceInStepsPerMinute")),
            training_effect=raw.get("aerobicTrainingEffect"),
            anaerobic_training_effect=raw.get("anaerobicTrainingEffect"),
        )
        await self._dao.upsert_activity(activity)

        run_metrics = RunMetrics(
            activity_id=activity_id,
            avg_vertical_oscillation=raw.get("avgVerticalOscillation"),
            avg_vertical_ratio=raw.get("avgVerticalRatio"),
            avg_ground_contact_time=raw.get("avgGroundContactTime"),
            avg_stance_time_percent=raw.get("avgGroundContactBalance"),
            avg_stride_length=raw.get("avgStrideLength"),
            avg_running_cadence=raw.get("averageRunningCadenceInStepsPerMinute"),
            max_running_cadence=raw.get("maxRunningCadenceInStepsPerMinute"),
            vo2max=raw.get("vO2MaxValue"),
        )
        await self._dao.upsert_run_metrics(run_metrics)
        await self._dao.flush()

        splits_data = await self._client.get_activity_splits(activity_id)
        laps = _parse_laps(activity_id, splits_data)
        if laps:
            await self._dao.upsert_laps(laps)


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def _int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _nested(d: dict, *keys: str) -> Optional[str]:
    for key in keys:
        if not isinstance(d, dict):
            return None
        d = d.get(key)  # type: ignore[assignment]
    return d  # type: ignore[return-value]


def _parse_laps(activity_id: str, splits_data: dict) -> list[ActivityLap]:
    laps = []
    for lap_raw in splits_data.get("lapDTOs", []):
        lap = ActivityLap(
            activity_id=activity_id,
            lap_index=lap_raw.get("lapIndex", 0),
            start_time=_parse_dt(
                lap_raw.get("startTimeGMT", "").replace("T", " ").split(".")[0]
                if lap_raw.get("startTimeGMT")
                else None
            ),
            elapsed_time=lap_raw.get("elapsedDuration") or lap_raw.get("duration"),
            moving_time=lap_raw.get("movingDuration"),
            distance=lap_raw.get("distance"),
            avg_speed=lap_raw.get("averageSpeed"),
            max_speed=lap_raw.get("maxSpeed"),
            calories=_int(lap_raw.get("calories")),
            avg_hr=_int(lap_raw.get("averageHR")),
            max_hr=_int(lap_raw.get("maxHR")),
            avg_cadence=_int(lap_raw.get("averageRunCadence")),
            max_cadence=_int(lap_raw.get("maxRunCadence")),
            ascent=lap_raw.get("totalAscent"),
            descent=lap_raw.get("totalDescent"),
        )
        laps.append(lap)
    return laps
