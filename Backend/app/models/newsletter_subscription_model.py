import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model connects one application user to one newsletter creator.
class NewsletterSubscription(Base):
    __tablename__ = "newsletter_subscriptions"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'paused')",
            name="ck_newsletter_subscriptions_status_allowed",
        ),
        UniqueConstraint(
            "subscriber_user_id",
            "creator_id",
            name="uq_newsletter_subscriptions_subscriber_creator",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    subscriber_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    creator_id = Column(
        UUID(as_uuid=True),
        ForeignKey("newsletter_creators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(20),
        nullable=False,
        default="active",
        server_default=text("'active'"),
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    subscriber = relationship("User")
    creator = relationship("NewsletterCreator", back_populates="subscriptions")
