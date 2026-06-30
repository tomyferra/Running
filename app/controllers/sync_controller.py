"""
Sync controller — maps sync service results/errors to HTTP responses.
"""

import logging

from fastapi import HTTPException, status

from app.client.garmin_client import GarminAuthError, GarminClientError, GarminRateLimitError
from app.models.schemas import SyncResponse
from app.services.sync_service import SyncAlreadyRunningError, SyncService

logger = logging.getLogger(__name__)


class SyncController:
    def __init__(self, service: SyncService) -> None:
        self._service = service

    async def sync(self, days: int) -> SyncResponse:
        try:
            result = await self._service.sync(days=days)
            return SyncResponse(
                status="success",
                message=f"Synced {result['activities_synced']} running activities.",
                activities_synced=result["activities_synced"],
            )
        except SyncAlreadyRunningError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A sync is already in progress. Try again later.",
            )
        except GarminAuthError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            )
        except GarminRateLimitError as exc:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(exc),
            )
        except GarminClientError as exc:
            logger.exception("Garmin Connect error during sync")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            )
        except Exception:
            logger.exception("Unexpected error during sync")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Sync failed due to an unexpected error.",
            )
