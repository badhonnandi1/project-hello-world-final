import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.models.user_model import UserAuth
from app.routes.auth_route import router as auth_router


ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

# This database block creates the user_auth table automatically when the app starts.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GhostWriter Authentication API")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


# This API endpoint confirms that the authentication API is running.
@app.get("/")
def read_root():
    return {"message": "GhostWriter authentication API is running"}
