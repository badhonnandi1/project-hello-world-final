import uuid

from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# These are the archetypes currently supported by the system.
ALLOWED_STYLE_ARCHETYPES = (
    "Analytical Leader",
    "Educational Expert",
    "Story-Driven Founder",
    "Concise Operator",
    "Community Builder",
)


# This model stores one archetype and its percentage
# inside a saved Writing Style Preset.
class StylePresetArchetype(Base):
    __tablename__ = "style_preset_archetypes"

    __table_args__ = (
        UniqueConstraint(
            "preset_id",
            "archetype",
            name="uq_style_preset_archetype",
        ),
        CheckConstraint(
            "percentage >= 0 AND percentage <= 100",
            name="ck_style_preset_archetype_percentage",
        ),
        CheckConstraint(
            "archetype IN "
            "('Analytical Leader', "
            "'Educational Expert', "
            "'Story-Driven Founder', "
            "'Concise Operator', "
            "'Community Builder')",
            name="ck_style_preset_archetype_allowed",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )

    preset_id = Column(
        UUID(as_uuid=True),
        ForeignKey("style_presets.preset_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    archetype = Column(
        String(100),
        nullable=False,
    )

    percentage = Column(
        Integer,
        nullable=False,
    )

    # This relationship connects the archetype back to its preset.
    preset = relationship(
        "StylePreset",
        back_populates="archetypes",
    )