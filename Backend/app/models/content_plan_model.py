import uuid
from sqlalchemy.dialects.postgresql import  UUID
from sqlalchemy import Column, DateTime, ForeignKey, Text, func, text, String, CheckConstraint
from sqlalchemy.orm import relationship
from app.db import Base
from sqlalchemy import String



class ContentPlan(Base):
    __tablename__ = "content_plans"

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'scheduled', 'published')",
            name="ck_content_plans_status_allowed",
        ),
    )

    content_plan_id = Column(
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
    title = Column(String(255), nullable=False)
    content_text = Column(Text, nullable=False)
    platform = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="draft")
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # One-way relationship: the plan knows its user.
  
    user = relationship("User")