import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import engine, Base
from api.models import Car, Review, ServiceReview, Service, VehicleClass, BookingRequest


def create_tables():
    """Create tables based on current models."""
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created")


if __name__ == "__main__":
    create_tables()
