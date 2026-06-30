from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, computed_field


def _speed_to_pace(speed_m_s: Optional[float]) -> Optional[str]:
    if not speed_m_s or speed_m_s <= 0:
        return None
    pace_sec = 1000 / speed_m_s
    m, s = divmod(int(pace_sec), 60)
    return f"{m}:{s:02d} /km"


def _seconds_to_hhmmss(seconds: Optional[float]) -> Optional[str]:
    if seconds is None:
        return None
    total = int(seconds)
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


# ---------------------------------------------------------------------------
# Run metrics
# ---------------------------------------------------------------------------


class RunMetricsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    avg_vertical_oscillation: Optional[float] = None
    avg_vertical_ratio: Optional[float] = None
    avg_ground_contact_time: Optional[float] = None
    avg_stance_time_percent: Optional[float] = None
    avg_stride_length: Optional[float] = None
    avg_running_cadence: Optional[float] = None
    max_running_cadence: Optional[float] = None
    vo2max: Optional[float] = None


# ---------------------------------------------------------------------------
# Lap
# ---------------------------------------------------------------------------


class LapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lap_index: int
    start_time: Optional[datetime] = None
    elapsed_time_s: Optional[float] = None
    moving_time_s: Optional[float] = None
    distance_m: Optional[float] = None
    avg_speed_ms: Optional[float] = None
    max_speed_ms: Optional[float] = None
    calories: Optional[int] = None
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_cadence: Optional[int] = None
    max_cadence: Optional[int] = None
    ascent_m: Optional[float] = None
    descent_m: Optional[float] = None

    @computed_field
    @property
    def distance_km(self) -> Optional[float]:
        return round(self.distance_m / 1000, 3) if self.distance_m else None

    @computed_field
    @property
    def avg_pace(self) -> Optional[str]:
        return _speed_to_pace(self.avg_speed_ms)

    @computed_field
    @property
    def elapsed_time(self) -> Optional[str]:
        return _seconds_to_hhmmss(self.elapsed_time_s)


# ---------------------------------------------------------------------------
# Activity list item
# ---------------------------------------------------------------------------


class ActivitySummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: str
    name: Optional[str] = None
    start_time: Optional[datetime] = None
    elapsed_time_s: Optional[float] = None
    moving_time_s: Optional[float] = None
    distance_m: Optional[float] = None
    avg_speed_ms: Optional[float] = None
    max_speed_ms: Optional[float] = None
    calories: Optional[int] = None
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_cadence: Optional[int] = None
    max_cadence: Optional[int] = None
    ascent: Optional[float] = None
    descent: Optional[float] = None
    max_altitude: Optional[float] = None
    avg_altitude: Optional[float] = None
    training_effect: Optional[float] = None
    anaerobic_training_effect: Optional[float] = None

    @computed_field
    @property
    def distance_km(self) -> Optional[float]:
        return round(self.distance_m / 1000, 3) if self.distance_m else None

    @computed_field
    @property
    def avg_pace(self) -> Optional[str]:
        return _speed_to_pace(self.avg_speed_ms)

    @computed_field
    @property
    def elapsed_time(self) -> Optional[str]:
        return _seconds_to_hhmmss(self.elapsed_time_s)

    @computed_field
    @property
    def moving_time(self) -> Optional[str]:
        return _seconds_to_hhmmss(self.moving_time_s)


# ---------------------------------------------------------------------------
# Activity detail (includes laps + run metrics)
# ---------------------------------------------------------------------------


class ActivityDetailResponse(ActivitySummaryResponse):
    run_metrics: Optional[RunMetricsResponse] = None
    laps: List[LapResponse] = []


# ---------------------------------------------------------------------------
# Aggregate stats
# ---------------------------------------------------------------------------


class RunningStatsResponse(BaseModel):
    total_runs: int
    total_distance_km: float
    total_time: str
    avg_pace: Optional[str]
    avg_hr: Optional[float]
    total_elevation_gain_m: float
    longest_run_km: Optional[float]
    fastest_avg_pace: Optional[str]


# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------


class SyncRequest(BaseModel):
    days: int = 30


class SyncResponse(BaseModel):
    status: str
    message: str
    activities_synced: Optional[int] = None


# ---------------------------------------------------------------------------
# Pagination wrapper
# ---------------------------------------------------------------------------


class PaginatedActivities(BaseModel):
    total: int
    offset: int
    limit: int
    items: List[ActivitySummaryResponse]
