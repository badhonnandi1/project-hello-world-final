import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores one saved Writing Style Preset belonging to a user.
class StylePreset(Base):
    __tablename__ = "style_presets"

    preset_id = Column(
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

    preset_name = Column(
        String(255),
        nullable=False,
    )

    preview_topic = Column(
        String(500),
        nullable=True,
    )

    preview_content = Column(
        Text,
        nullable=True,
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

    # This relationship connects the preset back to its owner.
    user = relationship(
        "User",
        back_populates="style_presets",
    )

    # This relationship connects the preset to its selected archetypes.
    archetypes = relationship(
        "StylePresetArchetype",
        back_populates="preset",
        cascade="all, delete-orphan",
    )