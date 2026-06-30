"""
Activity DAO — raw database operations via SQLAlchemy.

This layer owns all SQL; callers receive ORM objects or scalars.
"""

from datetime import date
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import Activity, ActivityLap, RunMetrics


class ActivityDAO:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    async def get_by_id(self, activity_id: str) -> Optional[Activity]:
        stmt = (
            select(Activity)
            .where(Activity.activity_id == activity_id)
            .options(
                selectinload(Activity.run_metrics),
                selectinload(Activity.laps),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_activities(
        self,
        offset: int = 0,
        limit: int = 20,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        min_distance_m: Optional[float] = None,
    ) -> tuple[list[Activity], int]:
        stmt = select(Activity).where(Activity.sport == "running")

        if start_date:
            stmt = stmt.where(Activity.start_time >= start_date)
        if end_date:
            stmt = stmt.where(Activity.start_time <= end_date)
        if min_distance_m is not None:
            stmt = stmt.where(Activity.distance >= min_distance_m)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total: int = (await self._session.execute(count_stmt)).scalar_one()

        stmt = stmt.order_by(Activity.start_time.desc()).offset(offset).limit(limit)
        rows = (await self._session.execute(stmt)).scalars().all()
        return list(rows), total

    async def get_laps(self, activity_id: str) -> list[ActivityLap]:
        stmt = (
            select(ActivityLap)
            .where(ActivityLap.activity_id == activity_id)
            .order_by(ActivityLap.lap_index)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def aggregate_stats(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        stmt = select(
            func.count(Activity.activity_id).label("total_runs"),
            func.sum(Activity.distance).label("total_distance"),
            func.sum(Activity.elapsed_time).label("total_time"),
            func.avg(Activity.avg_hr).label("avg_hr"),
            func.sum(Activity.ascent).label("total_ascent"),
            func.max(Activity.distance).label("longest_run"),
            func.max(Activity.avg_speed).label("fastest_speed"),
        ).where(Activity.sport == "running")

        if start_date:
            stmt = stmt.where(Activity.start_time >= start_date)
        if end_date:
            stmt = stmt.where(Activity.start_time <= end_date)

        row = (await self._session.execute(stmt)).mappings().one()
        return dict(row)

    async def exists(self, activity_id: str) -> bool:
        stmt = select(Activity.activity_id).where(Activity.activity_id == activity_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------

    async def upsert_activity(self, activity: Activity) -> None:
        await self._session.merge(activity)

    async def upsert_run_metrics(self, metrics: RunMetrics) -> None:
        await self._session.merge(metrics)

    async def upsert_laps(self, laps: list[ActivityLap]) -> None:
        for lap in laps:
            await self._session.merge(lap)

    async def flush(self) -> None:
        await self._session.flush()

    async def commit(self) -> None:
        await self._session.commit()
