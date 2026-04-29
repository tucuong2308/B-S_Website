"""Create database indexes on listings (lon, lat, type_id, published_at) for faster queries"""
import sys
sys.path.insert(0, 'c:\\Users\\LENOVO\\Desktop\\Server')

from app.database import engine
from sqlalchemy import text
import time

print("=" * 70)
print("Creating database indexes for faster geo queries...")
print("=" * 70)

indexes = [
    ("idx_listings_lon_lat", "CREATE INDEX IF NOT EXISTS idx_listings_lon_lat ON listings (longitude, latitude)"),
    ("idx_listings_published_at", "CREATE INDEX IF NOT EXISTS idx_listings_published_at ON listings (published_at)"),
    ("idx_listings_type_id", "CREATE INDEX IF NOT EXISTS idx_listings_type_id ON listings (type_id)"),
]

with engine.connect() as conn:
    for idx_name, sql in indexes:
        try:
            print(f"\n⏳ Creating {idx_name}...")
            start = time.time()
            conn.execute(text(sql))
            conn.commit()
            elapsed = time.time() - start
            print(f"✓ {idx_name} created in {elapsed:.2f}s")
        except Exception as e:
            print(f"✗ {idx_name} failed: {e}")

print("\n" + "=" * 70)
print("Done! Database indexes created.")
print("Note: This may take a while if the listings table is large.")
print("=" * 70)
