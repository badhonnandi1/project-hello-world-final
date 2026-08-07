import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores a writing sample submitted by a user.
class WritingSample(Base):
    __tablename__ = "writing_samples"
    __table_args__ = (
        CheckConstraint(
            "source IN ('paste', 'upload')",
            name="ck_writing_samples_source_allowed",
        ),
    )

    sample_id = Column(
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
    content_text = Column(Text, nullable=False)
    source = Column(String(20), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # These relationships connect the sample to its owner and one optional analysis.
    user = relationship("User", back_populates="writing_samples")
    analysis = relationship(
        "WritingAnalysis",
        back_populates="sample",
        uselist=False,
        cascade="all, delete-orphan",
    )