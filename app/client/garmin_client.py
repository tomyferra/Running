"""
Thin wrapper around the garminconnect library.

Handles authentication (with token caching) and data retrieval from
Garmin Connect. All network calls are wrapped in asyncio.to_thread so
the async callers never block the event loop.
"""

import asyncio
import logging
import os
from typing import Any

from garminconnect import (
    Garmin,
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
    GarminConnectTooManyRequestsError,
)

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GarminClientError(Exception):
    pass


class GarminAuthError(GarminClientError):
    pass


class GarminRateLimitError(GarminClientError):
    pass


class GarminClient:
    def __init__(self) -> None:
        self._api: Garmin | None = None
        self._token_dir = settings.garth_home

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_api(self) -> Garmin:
        os.makedirs(self._token_dir, exist_ok=True)
        return Garmin(
            email=settings.garmin_email,
            password=settings.garmin_password,
            is_cn=False,
        )

    def _login_sync(self) -> None:
        api = self._build_api()
        token_file = os.path.join(self._token_dir, "oauth2_token.json")

        if os.path.exists(token_file):
            try:
                api.garth.load(self._token_dir)
                api.display_name  # lightweight call to validate token
                logger.info("Loaded cached Garmin token")
                self._api = api
                return
            except Exception:
                logger.info("Cached token invalid – re-authenticating")

        try:
            api.login()
            api.garth.dump(self._token_dir)
            logger.info("Garmin authentication successful")
        except GarminConnectAuthenticationError as exc:
            raise GarminAuthError(
                "Authentication failed. Check GARMIN_EMAIL / GARMIN_PASSWORD."
            ) from exc
        except GarminConnectConnectionError as exc:
            raise GarminClientError("Cannot reach Garmin Connect.") from exc
        except GarminConnectTooManyRequestsError as exc:
            raise GarminRateLimitError("Garmin Connect rate limit hit.") from exc

        self._api = api

    async def _ensure_authenticated(self) -> Garmin:
        if self._api is None:
            await asyncio.to_thread(self._login_sync)
        return self._api  # type: ignore[return-value]

    def _safe_call(self, fn, *args, **kwargs) -> Any:
        try:
            return fn(*args, **kwargs)
        except GarminConnectAuthenticationError as exc:
            raise GarminAuthError("Session expired – re-authentication required.") from exc
        except GarminConnectTooManyRequestsError as exc:
            raise GarminRateLimitError("Garmin Connect rate limit hit.") from exc
        except GarminConnectConnectionError as exc:
            raise GarminClientError("Cannot reach Garmin Connect.") from exc

    # ------------------------------------------------------------------
    # Public API (all async)
    # ------------------------------------------------------------------

    async def get_activities(self, start: int = 0, limit: int = 100) -> list[dict]:
        api = await self._ensure_authenticated()
        activities = await asyncio.to_thread(
            self._safe_call, api.get_activities, start, limit
        )
        return [a for a in (activities or []) if _is_running(a)]

    async def get_activities_by_date(self, start_date: str, end_date: str) -> list[dict]:
        api = await self._ensure_authenticated()
        activities = await asyncio.to_thread(
            self._safe_call,
            api.get_activities_by_date,
            start_date,
            end_date,
            "running",
        )
        return activities or []

    async def get_activity_splits(self, activity_id: str) -> dict:
        api = await self._ensure_authenticated()
        return await asyncio.to_thread(
            self._safe_call, api.get_activity_splits, int(activity_id)
        ) or {}

    async def get_activity_hr_in_timezones(self, activity_id: str) -> dict:
        api = await self._ensure_authenticated()
        return await asyncio.to_thread(
            self._safe_call, api.get_activity_hr_in_timezones, int(activity_id)
        ) or {}


def _is_running(activity: dict) -> bool:
    sport = (activity.get("activityType") or {}).get("typeKey", "")
    return "running" in sport.lower()
