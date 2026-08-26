import uuid

from sqlalchemy import (
    Boolean,
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


# This model stores a user's Privacy Guardrail rules.
class PrivacyGuardrail(Base):
    __tablename__ = "privacy_guardrails"

    __table_args__ = (
        CheckConstraint(
            "rule_type IN ('confidential', 'forbidden_phrase', 'prohibited_topic', 'competitor')",
            name="ck_privacy_guardrails_rule_type_allowed",
        ),
        CheckConstraint(
            "severity IN ('low', 'medium', 'high')",
            name="ck_privacy_guardrails_severity_allowed",
        ),
        CheckConstraint(
            "action IN ('warn', 'block')",
            name="ck_privacy_guardrails_action_allowed",
        ),
    )

    rule_id = Column(
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

    rule_name = Column(
        String(255),
        nullable=False,
    )

    rule_type = Column(
        String(50),
        nullable=False,
    )

    rule_value = Column(
        Text,
        nullable=False,
    )

    severity = Column(
        String(20),
        nullable=False,
        default="medium",
        server_default=text("'medium'"),
    )

    action = Column(
        String(20),
        nullable=False,
        default="warn",
        server_default=text("'warn'"),
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

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

    # This relationship connects the rule back to its owner.
    user = relationship(
        "User",
        back_populates="privacy_guardrails",
    )