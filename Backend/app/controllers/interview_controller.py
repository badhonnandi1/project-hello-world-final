from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user_profile_model import User
from app.schemas.interview_schema import InterviewAnswerUpdate
from app.services import interview_service

INTERVIEW_NOT_FOUND_MESSAGE = "Interview session not found."
ANSWER_NOT_FOUND_MESSAGE = "Interview answer not found or you do not have permission to update it."
PROFILE_MISSING_MESSAGE = "Your application user profile has not been created yet."


def resolve_application_user(db: Session, authenticated_account):
    user_profile = (
        db.query(User)
        .filter(User.user_auth_id == authenticated_account.id)
        .first()
    )

    if not user_profile:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=PROFILE_MISSING_MESSAGE)

    return user_profile


def start_interview_session(db: Session, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    return interview_service.start_interview_session(db, current_user.id)


def get_current_interview_session(db: Session, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    session = interview_service.get_current_interview_session(db, current_user.id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=INTERVIEW_NOT_FOUND_MESSAGE
        )
    return session


def update_interview_answer(
    db: Session, authenticated_account, answer_id: UUID, answer_data: InterviewAnswerUpdate
):
    current_user = resolve_application_user(db, authenticated_account)
    answer = interview_service.update_interview_answer(
        db, answer_id, current_user.id, answer_data
    )
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=ANSWER_NOT_FOUND_MESSAGE
        )
    return answer
