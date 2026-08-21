import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores AI-generated viral topic suggestions for a user.
# Each row represents one "generation session" where the AI created
# a batch of topic ideas based on the user's interview profile.
class ViralTopic(Base):
    __tablename__ = "viral_topics"

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

    # We store the AI's full response as a JSON string.
    # This contains an array of topic objects, each with title, hook, platform, etc.
    topics_data = Column(Text, nullable=False)

    # We snapshot the profession used for generation, so the user can see
    # which profile was used even if they update their interview later.
    profession_snapshot = Column(String(255), nullable=True)
    audience_snapshot = Column(String(500), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship back to the user who owns these topics.
    user = relationship("User", backref="viral_topics")