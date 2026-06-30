import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    garmin_email: str
    garmin_password: str

    fullname: str = "Tomas Ferrari"

    db_dir: str = "./data/garmin"
    database_name: str = "garmin_activities.db"

    api_title: str = "Garmin Running API"
    api_version: str = "1.0.0"
    debug: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def database_url(self) -> str:
        return f"sqlite+aiosqlite:///{os.path.join(self.db_dir, self.database_name)}"

    @property
    def garth_home(self) -> str:
        return os.path.join(self.db_dir, "garth_tokens")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
