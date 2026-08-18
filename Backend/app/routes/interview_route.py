from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers import interview_controller
from app.controllers.auth_controller import get_logged_in_user
from app.db import get_db
from app.schemas.interview_schema import (
    InterviewAnswerResponse,
    InterviewAnswerUpdate,
    InterviewSessionResponse,
)

router = APIRouter(prefix="/interview", tags=["interview"])
bearer_scheme = HTTPBearer()


def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


@router.post("/start", response_model=InterviewSessionResponse)
def start_interview(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return interview_controller.start_interview_session(db, authenticated_account)


@router.get("/current", response_model=InterviewSessionResponse)
def get_current_interview(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return interview_controller.get_current_interview_session(db, authenticated_account)


@router.put("/answer/{answer_id}", response_model=InterviewSessionResponse)
def update_answer(
    answer_id: UUID,
    answer_data: InterviewAnswerUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return interview_controller.update_interview_answer(
        db, authenticated_account, answer_id, answer_data
    )
