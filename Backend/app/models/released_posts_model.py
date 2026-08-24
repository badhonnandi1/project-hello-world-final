import uuid
from sqlalchemy import Column, DateTime, ForeignKey, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class ReleasedPost(Base):
    __tablename__ = "released_posts"

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
    content_plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content_plans.content_plan_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("post_generations.post_id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    released_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=func.now(),
    )

    user = relationship("User")
    content_plan = relationship("ContentPlan", foreign_keys=[content_plan_id])
    post_generation = relationship("PostGeneration", foreign_keys=[post_id])
