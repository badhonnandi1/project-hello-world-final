from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.voice_interview_controller import (
    create_voice_interview,
    get_latest_voice_interview,
    transcribe_voice,
    update_voice_interview,
)
from app.db import get_db
from app.schemas.voice_interview_schema import (
    VoiceInterviewCreate,
    VoiceInterviewResponse,
    VoiceInterviewUpdate,
)


router = APIRouter(
    prefix="/voice-interviews",
    tags=["Voice Interview"],
)

bearer_scheme = HTTPBearer()


def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


# -------------------------------
# TRANSCRIBE
# -------------------------------

@router.post("/transcribe")
def transcribe_voice_interview(
    audio: UploadFile = File(...),
    authenticated_account=Depends(get_authenticated_account),
):
    transcript = transcribe_voice(audio)

    return {
        "transcript": transcript
    }


# -------------------------------
# SAVE
# -------------------------------

@router.post(
    "",
    response_model=VoiceInterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    interview_data: VoiceInterviewCreate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return create_voice_interview(
        db,
        authenticated_account,
        interview_data,
    )


# ---------------------------------------------------------
# GET LATEST INTERVIEW
# ---------------------------------------------------------

@router.get(
    "/latest",
    response_model=VoiceInterviewResponse | None,
)
def get_latest_interview(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_latest_voice_interview(
        db,
        authenticated_account,
    )

# EDIT EXISTING INTERVIEW
# ---------------------------------------------------------

@router.put(
    "/{interview_id}",
    response_model=VoiceInterviewResponse,
)
def edit_interview(
    interview_id: UUID,
    interview_data: VoiceInterviewUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return update_voice_interview(
        db,
        authenticated_account,
        interview_id,
        interview_data,
    )

