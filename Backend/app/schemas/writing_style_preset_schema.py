from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


# Data for one archetype and its percentage.
class StylePresetArchetypeData(BaseModel):
    archetype: str
    percentage: int = Field(ge=0, le=100)


# Data needed when creating a new Writing Style Preset.
class StylePresetCreate(BaseModel):
    preset_name: str
    preview_topic: str | None = None
    preview_content: str | None = None
    archetypes: list[StylePresetArchetypeData]

    # The selected archetype percentages must add up to exactly 100%.
    @model_validator(mode="after")
    def validate_total_percentage(self):
        total = sum(
            archetype.percentage
            for archetype in self.archetypes
        )

        if total != 100:
            raise ValueError(
                "Archetype percentages must add up to exactly 100%."
            )

        if not self.archetypes:
            raise ValueError(
                "At least one archetype must be selected."
            )

        return self


# Data that can be edited after a preset has been created.
class StylePresetUpdate(BaseModel):
    preset_name: str | None = None
    preview_topic: str | None = None
    preview_content: str | None = None
    archetypes: list[StylePresetArchetypeData] | None = None

    # If archetypes are being changed, their percentages must total 100%.
    @model_validator(mode="after")
    def validate_total_percentage(self):
        if self.archetypes is not None:

            if not self.archetypes:
                raise ValueError(
                    "At least one archetype must be selected."
                )

            total = sum(
                archetype.percentage
                for archetype in self.archetypes
            )

            if total != 100:
                raise ValueError(
                    "Archetype percentages must add up to exactly 100%."
                )

        return self


# Data returned to the frontend for one archetype.
class StylePresetArchetypeResponse(BaseModel):
    id: UUID
    archetype: str
    percentage: int

    model_config = ConfigDict(from_attributes=True)


# Data returned to the frontend for a complete saved preset.
class StylePresetResponse(BaseModel):
    preset_id: UUID
    user_id: UUID
    preset_name: str
    preview_topic: str | None = None
    preview_content: str | None = None
    archetypes: list[StylePresetArchetypeResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------
# Data needed to generate a temporary rule-based preview.
# ---------------------------------------------------------

class StylePresetPreviewRequest(BaseModel):
    topic: str
    archetypes: list[StylePresetArchetypeData]

    # The preview also requires the percentages to total 100%.
    @model_validator(mode="after")
    def validate_total_percentage(self):
        if not self.topic.strip():
            raise ValueError(
                "Preview topic cannot be empty."
            )

        if not self.archetypes:
            raise ValueError(
                "At least one archetype must be selected."
            )

        total = sum(
            archetype.percentage
            for archetype in self.archetypes
        )

        if total != 100:
            raise ValueError(
                "Archetype percentages must add up to exactly 100%."
            )

        return self


# ---------------------------------------------------------
# Data returned after generating a temporary preview.
# ---------------------------------------------------------

class StylePresetPreviewArchetypeResponse(BaseModel):
    archetype: str
    percentage: int


class StylePresetPreviewResponse(BaseModel):
    topic: str
    preview_content: str
    archetypes: list[StylePresetPreviewArchetypeResponse]