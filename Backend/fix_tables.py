from sqlalchemy import text
from app.db import engine

with engine.connect() as conn:
    id_type = conn.execute(text(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_name='users' AND column_name='id'"
    )).scalar()
    n1 = conn.execute(text("SELECT COUNT(*) FROM writing_samples")).scalar()
    n2 = conn.execute(text("SELECT COUNT(*) FROM writing_analysis")).scalar()

    print("users.id type:", id_type)
    print("writing_samples rows:", n1, "| writing_analysis rows:", n2)

    if n1 == 0 and n2 == 0:
        conn.execute(text("DROP TABLE IF EXISTS writing_analysis"))
        conn.execute(text("DROP TABLE IF EXISTS writing_samples"))
        conn.commit()
        print("Old writing tables dropped. Restart the server to rebuild them correctly.")
    else:
        print("Tables NOT empty - do nothing, tell me the counts first.")