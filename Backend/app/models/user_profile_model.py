import uuid

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores a user's application profile and links it to one login account.
class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('creator', 'reviewer', 'admin')",
            name="ck_users_role_allowed",
        ),
        CheckConstraint(
            "subscription_tier IN ('free', 'premium')",
            name="ck_users_subscription_tier_allowed",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    user_auth_id = Column(
        Integer,
        ForeignKey("user_auth.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    email = Column(String(255), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="creator", server_default=text("'creator'"))
    subscription_tier = Column(
        String(50),
        nullable=False,
        default="free",
        server_default=text("'free'"),
    )
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # This relationship connects the profile back to the login account.
    auth = relationship("UserAuth", back_populates="user_profile")

    # These relationships connect the profile to the app content owned by the user.
    interview_sessions = relationship(
        "InterviewSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    writing_samples = relationship(
        "WritingSample",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    knowledge_vault_items = relationship(
        "KnowledgeVaultItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audience_opportunities = relationship(
        "AudienceOpportunity",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    voice_profile = relationship(
        "VoiceProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    
    voice_interviews = relationship(
        "VoiceInterview",
        back_populates="user",
        cascade="all, delete-orphan",
    )
