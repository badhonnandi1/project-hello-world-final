import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores one generated voice profile for a user.
class VoiceProfile(Base):
    __tablename__ = "voice_profiles"

    profile_id = Column(
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
        unique=True,
        index=True,
    )
    tone = Column(Text, nullable=True)
    vocabulary_level = Column(Text, nullable=True)
    sentence_style = Column(Text, nullable=True)
    storytelling_preference = Column(Text, nullable=True)
    emoji_preference = Column(Text, nullable=True)
    cta_style = Column(Text, nullable=True)
    topics_to_avoid = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    generated_at = Column(DateTime(timezone=True), nullable=True)
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # This relationship connects the one voice profile back to its user.
    user = relationship("User", back_populates="voice_profile")
