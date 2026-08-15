import os
from pathlib import Path
from app.routes.writing_sample_route import router as writing_sample_router

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
import app.models
from app.models.user_model import UserAuth
from app.routes.auth_route import router as auth_router
from app.routes.audience_opportunity_route import router as audience_opportunity_router
from app.routes.knowledge_vault_route import router as knowledge_vault_router
from app.routes.profile_route import router as profile_router
from app.routes.interview_route import router as interview_router
from app.routes.voice_interview_route import router as voice_interview_router
from app.routes.content_plan_route import router as content_plan_router
from app.routes.writing_style_preset_route import (
    router as writing_style_preset_router,
)
from app.routes.campaign_route import router as campaign_router


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
app.include_router(audience_opportunity_router)
app.include_router(knowledge_vault_router)
app.include_router(profile_router)
app.include_router(writing_sample_router)
app.include_router(interview_router)
app.include_router(voice_interview_router)
app.include_router(content_plan_router)
app.include_router(writing_style_preset_router)
app.include_router(campaign_router)

# This API endpoint confirms that the authentication API is running.
@app.get("/")
def read_root():
    return {"message": "GhostWriter authentication API is running"}
