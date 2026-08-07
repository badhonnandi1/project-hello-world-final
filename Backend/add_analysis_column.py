"""One-time script: adds the analysis_profile JSONB column to writing_analysis."""
from sqlalchemy import text

from app.db import engine

SQL = """
ALTER TABLE writing_analysis
ADD COLUMN IF NOT EXISTS analysis_profile JSONB;
"""

with engine.connect() as connection:
    connection.execute(text(SQL))
    connection.commit()

print("OK: analysis_profile column is ready.")