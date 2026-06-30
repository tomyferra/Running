from datetime import date
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.activity_controller import ActivityController
from app.dao.activity_dao import ActivityDAO
from app.db.database import get_db
from app.models.schemas import (
    ActivityDetailResponse,
    LapResponse,
    PaginatedActivities,
    RunningStatsResponse,
)
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activities", tags=["activities"])


def _build_controller(db: AsyncSession = Depends(get_db)) -> ActivityController:
    dao = ActivityDAO(db)
    service = ActivityService(dao)
    return ActivityController(service)


Controller = Annotated[ActivityController, Depends(_build_controller)]


@router.get("", response_model=PaginatedActivities, summary="List running activities")
async def list_activities(
    controller: Controller,
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(20, ge=1, le=100, description="Page size (max 100)"),
    start_date: Optional[date] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    min_distance_km: Optional[float] = Query(None, ge=0, description="Minimum distance in km"),
):
    return await controller.list_activities(
        offset=offset,
        limit=limit,
        start_date=start_date,
        end_date=end_date,
        min_distance_km=min_distance_km,
    )


@router.get("/stats", response_model=RunningStatsResponse, summary="Aggregate running stats")
async def get_stats(
    controller: Controller,
    start_date: Optional[date] = Query(None, description="From date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="To date (YYYY-MM-DD)"),
):
    return await controller.get_stats(start_date=start_date, end_date=end_date)


@router.get(
    "/{activity_id}",
    response_model=ActivityDetailResponse,
    summary="Get activity detail with laps and run metrics",
)
async def get_activity(activity_id: str, controller: Controller):
    return await controller.get_activity(activity_id)


@router.get(
    "/{activity_id}/laps",
    response_model=list[LapResponse],
    summary="Get lap splits for an activity",
)
async def get_laps(activity_id: str, controller: Controller):
    return await controller.get_laps(activity_id)
