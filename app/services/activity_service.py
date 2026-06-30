"""
Activity service — business logic and data mapping.

Converts raw ORM entities into response schemas and handles
domain-level concerns (pagination, stats formatting).
"""

from datetime import date
from typing import Optional

from app.dao.activity_dao import ActivityDAO
from app.models.schemas import (
    ActivityDetailResponse,
    ActivitySummaryResponse,
    LapResponse,
    PaginatedActivities,
    RunMetricsResponse,
    RunningStatsResponse,
    _seconds_to_hhmmss,
    _speed_to_pace,
)


class ActivityNotFoundError(Exception):
    pass


class ActivityService:
    def __init__(self, dao: ActivityDAO) -> None:
        self._dao = dao

    async def list_activities(
        self,
        offset: int = 0,
        limit: int = 20,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        min_distance_km: Optional[float] = None,
    ) -> PaginatedActivities:
        min_distance_m = min_distance_km * 1000 if min_distance_km else None
        activities, total = await self._dao.list_activities(
            offset=offset,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            min_distance_m=min_distance_m,
        )
        items = [_to_summary(a) for a in activities]
        return PaginatedActivities(total=total, offset=offset, limit=limit, items=items)

    async def get_activity(self, activity_id: str) -> ActivityDetailResponse:
        activity = await self._dao.get_by_id(activity_id)
        if not activity:
            raise ActivityNotFoundError(activity_id)
        return _to_detail(activity)

    async def get_laps(self, activity_id: str) -> list[LapResponse]:
        if not await self._dao.exists(activity_id):
            raise ActivityNotFoundError(activity_id)
        laps = await self._dao.get_laps(activity_id)
        return [_to_lap(lap) for lap in laps]

    async def get_stats(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> RunningStatsResponse:
        raw = await self._dao.aggregate_stats(start_date=start_date, end_date=end_date)

        total_distance_m: float = raw["total_distance"] or 0.0
        total_time_s: float = raw["total_time"] or 0.0
        longest_run_m: Optional[float] = raw["longest_run"]
        fastest_speed: Optional[float] = raw["fastest_speed"]
        avg_hr: Optional[float] = raw["avg_hr"]

        total_speed = total_distance_m / total_time_s if total_time_s else None

        return RunningStatsResponse(
            total_runs=raw["total_runs"] or 0,
            total_distance_km=round(total_distance_m / 1000, 2),
            total_time=_seconds_to_hhmmss(total_time_s) or "0:00",
            avg_pace=_speed_to_pace(total_speed),
            avg_hr=round(avg_hr, 1) if avg_hr else None,
            total_elevation_gain_m=round(raw["total_ascent"] or 0, 1),
            longest_run_km=round(longest_run_m / 1000, 2) if longest_run_m else None,
            fastest_avg_pace=_speed_to_pace(fastest_speed),
        )


# ---------------------------------------------------------------------------
# Mapping helpers
# ---------------------------------------------------------------------------


def _to_summary(a) -> ActivitySummaryResponse:
    return ActivitySummaryResponse(
        activity_id=a.activity_id,
        name=a.name,
        start_time=a.start_time,
        elapsed_time_s=a.elapsed_time,
        moving_time_s=a.moving_time,
        distance_m=a.distance,
        avg_speed_ms=a.avg_speed,
        max_speed_ms=a.max_speed,
        calories=a.calories,
        avg_hr=a.avg_hr,
        max_hr=a.max_hr,
        avg_cadence=a.avg_cadence,
        max_cadence=a.max_cadence,
        ascent=a.ascent,
        descent=a.descent,
        max_altitude=a.max_altitude,
        avg_altitude=a.avg_altitude,
        training_effect=a.training_effect,
        anaerobic_training_effect=a.anaerobic_training_effect,
    )


def _to_lap(lap) -> LapResponse:
    return LapResponse(
        lap_index=lap.lap_index,
        start_time=lap.start_time,
        elapsed_time_s=lap.elapsed_time,
        moving_time_s=lap.moving_time,
        distance_m=lap.distance,
        avg_speed_ms=lap.avg_speed,
        max_speed_ms=lap.max_speed,
        calories=lap.calories,
        avg_hr=lap.avg_hr,
        max_hr=lap.max_hr,
        avg_cadence=lap.avg_cadence,
        max_cadence=lap.max_cadence,
        ascent_m=lap.ascent,
        descent_m=lap.descent,
    )


def _to_detail(a) -> ActivityDetailResponse:
    run_metrics = None
    if a.run_metrics:
        rm = a.run_metrics
        run_metrics = RunMetricsResponse(
            avg_vertical_oscillation=rm.avg_vertical_oscillation,
            avg_vertical_ratio=rm.avg_vertical_ratio,
            avg_ground_contact_time=rm.avg_ground_contact_time,
            avg_stance_time_percent=rm.avg_stance_time_percent,
            avg_stride_length=rm.avg_stride_length,
            avg_running_cadence=rm.avg_running_cadence,
            max_running_cadence=rm.max_running_cadence,
            vo2max=rm.vo2max,
        )

    base = _to_summary(a).model_dump()
    return ActivityDetailResponse(
        **base,
        run_metrics=run_metrics,
        laps=[_to_lap(lap) for lap in a.laps],
    )
