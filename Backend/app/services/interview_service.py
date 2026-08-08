from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.interview_session_model import InterviewSession
from app.models.interview_answer_model import InterviewAnswer
from app.schemas.interview_schema import InterviewAnswerUpdate

INITIAL_QUESTIONS = [
    {"question": "Tell me about yourself.", "category": "background"},
    {"question": "What are your target audience ?", "category": "audience"},
    {"question": "what are your goals ?", "category": "goals"},
    {"question": "what is your preferred writing style ?", "category": "style"},
    {"question": "What tones do you usually prefer in your writing?", "category": "style"},
    {"question": "Who are your biggest inspirations?", "category": "background"},
]

def start_interview_session(db: Session, user_id: UUID) -> InterviewSession:
    # Check if there is an in_progress session, if so return it
    existing_session = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id, InterviewSession.status == "in_progress")
        .first()
    )
    if existing_session:
        return existing_session

    new_session = InterviewSession(user_id=user_id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Create default answers
    answers = []
    for index, q in enumerate(INITIAL_QUESTIONS):
        answer = InterviewAnswer(
            session_id=new_session.session_id,
            question_text=q["question"],
            category=q["category"],
            order_index=index,
        )
        answers.append(answer)

    db.add_all(answers)
    db.commit()
    db.refresh(new_session)

    return new_session

def get_current_interview_session(db: Session, user_id: UUID) -> InterviewSession:
    return (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id, InterviewSession.status == "in_progress")
        .first()
    )

def update_interview_answer(
    db: Session, answer_id: UUID, user_id: UUID, answer_data: InterviewAnswerUpdate
) -> InterviewAnswer:
    answer = (
        db.query(InterviewAnswer)
        .join(InterviewSession)
        .filter(InterviewAnswer.answer_id == answer_id, InterviewSession.user_id == user_id)
        .first()
    )
    if not answer:
        return None

    answer.answer_text = answer_data.answer_text
    db.commit()
    db.refresh(answer)

    # Check if all questions are answered in the session
    session = db.query(InterviewSession).filter(InterviewSession.session_id == answer.session_id).first()
    if session:
        all_answered = all(ans.answer_text is not None and ans.answer_text.strip() != "" for ans in session.answers)
        if all_answered:
            session.status = "completed"
            session.completed_at = datetime.now(timezone.utc)
            db.commit()

    return answer
