import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores one guided interview session for a user.
class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'completed')",
            name="ck_interview_sessions_status_allowed",
        ),
    )

    session_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(20),
        nullable=False,
        default="in_progress",
        server_default=text("'in_progress'"),
    )
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # These relationships connect the session to its owner and ordered answers.
    user = relationship("User", back_populates="interview_sessions")
    answers = relationship(
        "InterviewAnswer",
        back_populates="session",
        order_by="InterviewAnswer.order_index",
        cascade="all, delete-orphan",
    )
