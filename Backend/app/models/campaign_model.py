import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Campaign(Base):
    __tablename__ = "campaigns"

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
    name = Column(String(255), nullable=False)
    start_date = Column(String(100), nullable=True)
    end_date = Column(String(100), nullable=True)
    posting_frequency = Column(String(100), nullable=True)
    status = Column(
        String(50),
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

    user = relationship("User", back_populates="campaigns")
    posts = relationship("CampaignPost", back_populates="campaign", cascade="all, delete-orphan")


class CampaignPost(Base):
    __tablename__ = "campaign_posts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    platform = Column(String(100), nullable=True)
    scheduled_time = Column(String(100), nullable=True)
    status = Column(
        String(50),
        nullable=False,
        default="draft",
        server_default=text("'draft'"),
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    campaign = relationship("Campaign", back_populates="posts")
