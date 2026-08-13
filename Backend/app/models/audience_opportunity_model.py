import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores one audience question, objection, or content opportunity.
class AudienceOpportunity(Base):
    __tablename__ = "audience_opportunities"
    __table_args__ = (
        CheckConstraint(
            "type IN ('question', 'objection', 'misconception', 'pain_point', 'negative_feedback', 'other')",
            name="ck_audience_opportunities_type_allowed",
        ),
        CheckConstraint(
            "status IN ('New', 'Reviewed', 'Answered', 'Converted to Content')",
            name="ck_audience_opportunities_status_allowed",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high')",
            name="ck_audience_opportunities_priority_allowed",
        ),
    )

    id = Column(
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
    source_text = Column(Text, nullable=False)
    source_platform = Column(String(100), nullable=True)
    type = Column(String(30), nullable=False)
    audience_concern = Column(Text, nullable=False)
    suggested_reply = Column(Text, nullable=False)
    suggested_topic = Column(Text, nullable=False)
    suggested_hook = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False)
    status = Column(
        String(30),
        nullable=False,
        default="New",
        server_default=text("'New'"),
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # This relationship connects the opportunity back to its owner.
    user = relationship("User", back_populates="audience_opportunities")
