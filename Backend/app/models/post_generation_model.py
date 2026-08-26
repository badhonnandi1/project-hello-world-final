import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
    text,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores approved AI-generated posts.
class PostGeneration(Base):
    __tablename__ = "post_generations"

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('content_plan', 'voice_interview')",
            name="ck_post_generations_source_type_allowed",
        ),
        CheckConstraint(
            "privacy_status IN ('allow', 'warn')",
            name="ck_post_generations_privacy_status_allowed",
        ),
    )

    post_id = Column(
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

    source_type = Column(
        String(50),
        nullable=False,
    )

    source_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    content = Column(
        Text,
        nullable=False,
    )

    platform = Column(
        String(100),
        nullable=False,
    )

    privacy_status = Column(
        String(20),
        nullable=False,
        default="allow",
        server_default=text("'allow'"),
    )

    content = Column(Text, nullable=False)
    platform = Column(String(100), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


    # This relationship connects the generated post back to its owner.
    user = relationship(
          "User",
          back_populates="post_generations",
    ) 
    user = relationship("User")

    @property
    def id(self):
        return self.post_id
