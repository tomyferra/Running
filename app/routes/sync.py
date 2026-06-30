from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.client.garmin_client import GarminClient
from app.controllers.sync_controller import SyncController
from app.dao.activity_dao import ActivityDAO
from app.db.database import get_db
from app.models.schemas import SyncRequest, SyncResponse
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["sync"])

_shared_client = GarminClient()


def _build_controller(db: AsyncSession = Depends(get_db)) -> SyncController:
    dao = ActivityDAO(db)
    service = SyncService(dao, _shared_client)
    return SyncController(service)


@router.post("", response_model=SyncResponse, summary="Sync activities from Garmin Connect")
async def sync_activities(
    body: SyncRequest,
    controller: SyncController = Depends(_build_controller),
):
    """
    Downloads running activities from Garmin Connect for the last `days` days
    and stores them in the local database.

    - **days**: how many days back to sync (default 30, max practical ~365)
    """
    return await controller.sync(days=body.days)
