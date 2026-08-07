from sqlalchemy import text
from app.db import engine

with engine.connect() as conn:
    conn.execute(text("DELETE FROM writing_analysis"))
    conn.execute(text("DELETE FROM writing_samples"))
    conn.commit()
    print("Cleaned up test data. Tables are empty again.")