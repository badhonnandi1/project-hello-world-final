from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.interview_answer_model import InterviewAnswer
from app.models.interview_session_model import InterviewSession
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

    # Check for an existing in_progress session
    existing_session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "in_progress",
        )
        .first()
    )

    if existing_session:
        # Check if there are unanswered questions
        unanswered = [ans for ans in existing_session.answers if not ans.answer_text]
        if not unanswered and existing_session.answers:
            # If all existing questions are answered, process turn to get next question or complete
            last_ans = existing_session.answers[-1]
            turn_result = interview_service.process_interview_turn(
                db, current_user.id, existing_session, last_ans.answer_text or ""
            )

            extracted = turn_result.get("extracted_data", {})
            for field, val in extracted.items():
                if hasattr(existing_session, field) and val:
                    setattr(existing_session, field, val)

            if turn_result.get("is_complete"):
                existing_session.status = "completed"
                existing_session.completed_at = datetime.now(timezone.utc)
            elif turn_result.get("next_question"):
                next_index = len(existing_session.answers)
                new_q = InterviewAnswer(
                    session_id=existing_session.session_id,
                    question_text=turn_result["next_question"],
                    category="background",
                    order_index=next_index,
                )
                db.add(new_q)
            db.commit()
            db.refresh(existing_session)
        return existing_session

    # Create a new in_progress session
    new_session = InterviewSession(user_id=current_user.id, status="in_progress")
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Generate initial conversational question
    initial_question = interview_service.generate_initial_question(db, current_user.id, new_session)

    # Save as first InterviewAnswer row
    first_answer = InterviewAnswer(
        session_id=new_session.session_id,
        question_text=initial_question,
        category="background",
        order_index=0,
    )
    db.add(first_answer)
    db.commit()
    db.refresh(new_session)

    return new_session


def get_current_interview_session(db: Session, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "in_progress",
        )
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=INTERVIEW_NOT_FOUND_MESSAGE
        )
    return session


def update_interview_answer(
    db: Session, authenticated_account, answer_id: UUID, answer_data: InterviewAnswerUpdate
):
    current_user = resolve_application_user(db, authenticated_account)

    answer = (
        db.query(InterviewAnswer)
        .join(InterviewSession)
        .filter(
            InterviewAnswer.answer_id == answer_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )

    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=ANSWER_NOT_FOUND_MESSAGE
        )

    # Save user answer
    answer.answer_text = answer_data.answer_text
    db.commit()

    session = db.query(InterviewSession).filter(InterviewSession.session_id == answer.session_id).first()

    # Process interview turn with Gemini AI service
    turn_result = interview_service.process_interview_turn(
        db, current_user.id, session, answer_data.answer_text
    )

    extracted = turn_result.get("extracted_data", {})
    for field, val in extracted.items():
        if hasattr(session, field) and val:
            setattr(session, field, val)

    is_complete = turn_result.get("is_complete", False)
    next_question = turn_result.get("next_question")

    if is_complete:
        session.status = "completed"
        session.completed_at = datetime.now(timezone.utc)
    else:
        if next_question:
            next_index = len(session.answers)
            new_answer = InterviewAnswer(
                session_id=session.session_id,
                question_text=next_question,
                category="background",
                order_index=next_index,
            )
            db.add(new_answer)

    db.commit()
    db.refresh(session)
    return session
