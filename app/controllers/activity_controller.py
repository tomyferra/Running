"""
Activity controller — translates HTTP concerns into service calls
and maps service exceptions to HTTP responses.
"""

from datetime import date
from typing import Optional

from fastapi import HTTPException, status

from app.models.schemas import (
    ActivityDetailResponse,
    LapResponse,
    PaginatedActivities,
    RunningStatsResponse,
)
from app.services.activity_service import ActivityNotFoundError, ActivityService


class ActivityController:
    def __init__(self, service: ActivityService) -> None:
        self._service = service

    async def list_activities(
        self,
        offset: int,
        limit: int,
        start_date: Optional[date],
        end_date: Optional[date],
        min_distance_km: Optional[float],
    ) -> PaginatedActivities:
        return await self._service.list_activities(
            offset=offset,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            min_distance_km=min_distance_km,
        )

    async def get_activity(self, activity_id: str) -> ActivityDetailResponse:
        try:
            return await self._service.get_activity(activity_id)
        except ActivityNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Activity {activity_id} not found.",
            )

    async def get_laps(self, activity_id: str) -> list[LapResponse]:
        try:
            return await self._service.get_laps(activity_id)
        except ActivityNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Activity {activity_id} not found.",
            )

    async def get_stats(
        self,
        start_date: Optional[date],
        end_date: Optional[date],
    ) -> RunningStatsResponse:
        return await self._service.get_stats(start_date=start_date, end_date=end_date)
