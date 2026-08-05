import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores one answer inside a guided interview session.
class InterviewAnswer(Base):
    __tablename__ = "interview_answers"
    __table_args__ = (
        CheckConstraint(
            "category IN ('background', 'audience', 'goals', 'style')",
            name="ck_interview_answers_category_allowed",
        ),
        CheckConstraint(
            "input_type IN ('text', 'voice')",
            name="ck_interview_answers_input_type_allowed",
        ),
        UniqueConstraint("session_id", "order_index", name="uq_interview_answer_session_order"),
    )

    answer_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("interview_sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_text = Column(Text, nullable=False)
    category = Column(String(20), nullable=False)
    answer_text = Column(Text, nullable=True)
    input_type = Column(String(10), nullable=False, default="text", server_default=text("'text'"))
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # This relationship connects an answer back to its interview session.
    session = relationship("InterviewSession", back_populates="answers")
