import uuid

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores the public newsletter identity for one application user.
class NewsletterCreator(Base):
    __tablename__ = "newsletter_creators"

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
        unique=True,
        index=True,
    )
    display_name = Column(String(255), nullable=False)
    bio = Column(Text, nullable=False)
    topic = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User")
    newsletters = relationship(
        "Newsletter",
        back_populates="creator",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    subscriptions = relationship(
        "NewsletterSubscription",
        back_populates="creator",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# This model stores a creator-owned newsletter through its publication lifecycle.
class Newsletter(Base):
    __tablename__ = "newsletters"
    __table_args__ = (
        CheckConstraint(
            "status IN ('Draft', 'Generated', 'Published')",
            name="ck_newsletters_status_allowed",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    creator_id = Column(
        UUID(as_uuid=True),
        ForeignKey("newsletter_creators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    source_content = Column(Text, nullable=False)
    generated_content = Column(Text, nullable=True)
    status = Column(
        String(20),
        nullable=False,
        default="Draft",
        server_default=text("'Draft'"),
    )
    published_at = Column(DateTime(timezone=True), nullable=True)
    emailed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    creator = relationship("NewsletterCreator", back_populates="newsletters")
