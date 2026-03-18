from __future__ import annotations

from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

try:
    from .database import Base
except ImportError:
    from database import Base


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # JSON array of image URLs
    images = Column(JSON, nullable=False, default=list)

    # Optional main image url
    thumbnail = Column(String(500), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    reviews = relationship("Review", back_populates="car", cascade="all, delete-orphan")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    car_id = Column(Integer, ForeignKey("cars.id", ondelete="CASCADE"), nullable=False, index=True)

    author_name = Column(String(120), nullable=True)
    rating = Column(Integer, nullable=False)  # 1..5
    text = Column(Text, nullable=False)

    is_approved = Column(Boolean, nullable=False, default=False)

    ip_hash = Column(String(64), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    car = relationship("Car", back_populates="reviews")


class ServiceReview(Base):
    __tablename__ = "service_reviews"

    id = Column(Integer, primary_key=True, index=True)

    author_name = Column(String(120), nullable=True)
    rating = Column(Integer, nullable=False)  # 1..5
    text = Column(Text, nullable=False)

    is_approved = Column(Boolean, nullable=False, default=False)

    ip_hash = Column(String(64), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Базовая цена услуги
    price_from = Column(Integer, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    bookings = relationship("BookingRequest", back_populates="service")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class VehicleClass(Base):
    __tablename__ = "vehicle_classes"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # коэффициент для расчета стоимости
    # 100 = обычная цена
    # 150 = +50%
    price_multiplier = Column(Integer, nullable=False, default=100)

    is_active = Column(Boolean, nullable=False, default=True)

    bookings = relationship("BookingRequest", back_populates="vehicle_class")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BookingRequest(Base):
    __tablename__ = "booking_requests"

    id = Column(Integer, primary_key=True, index=True)

    service_id = Column(Integer, ForeignKey("services.id"), nullable=False, index=True)
    vehicle_class_id = Column(Integer, ForeignKey("vehicle_classes.id"), nullable=False, index=True)

    service_date = Column(DateTime(timezone=False), nullable=False)

    contact = Column(String(255), nullable=False)
    comment = Column(Text, nullable=True)

    status = Column(String(50), nullable=False, default="new")

    # рассчитанная стоимость заявки
    estimated_price = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    service = relationship("Service", back_populates="bookings")
    vehicle_class = relationship("VehicleClass", back_populates="bookings")