from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Activity(Base):
    """Base activity row — schema mirrors GarminDB's activities table."""

    __tablename__ = "activities"

    activity_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    stop_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sport: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sub_sport: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    elapsed_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    moving_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    distance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    calories: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    avg_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    avg_speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    ascent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    descent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_altitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_altitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    avg_cadence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_cadence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    training_effect: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    anaerobic_training_effect: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    run_metrics: Mapped[Optional["RunMetrics"]] = relationship(
        back_populates="activity", uselist=False, cascade="all, delete-orphan"
    )
    laps: Mapped[List["ActivityLap"]] = relationship(
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivityLap.lap_index",
    )


class RunMetrics(Base):
    """Running-specific metrics; one-to-one with Activity."""

    __tablename__ = "run_metrics"

    activity_id: Mapped[str] = mapped_column(
        String, ForeignKey("activities.activity_id", ondelete="CASCADE"), primary_key=True
    )
    avg_vertical_oscillation: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_vertical_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_ground_contact_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_stance_time_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_stride_length: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    avg_running_cadence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_running_cadence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vo2max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    activity: Mapped["Activity"] = relationship(back_populates="run_metrics")


class ActivityLap(Base):
    """Per-lap split data."""

    __tablename__ = "activity_laps"

    activity_id: Mapped[str] = mapped_column(
        String, ForeignKey("activities.activity_id", ondelete="CASCADE"), primary_key=True
    )
    lap_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    elapsed_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    moving_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    distance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    avg_speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_speed: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    calories: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    avg_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_hr: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    avg_cadence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_cadence: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    ascent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    descent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    activity: Mapped["Activity"] = relationship(back_populates="laps")
