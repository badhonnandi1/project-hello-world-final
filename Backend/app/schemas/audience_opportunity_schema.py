from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


OpportunityType = Literal[
    "question",
    "objection",
    "misconception",
    "pain_point",
    "negative_feedback",
    "other",
]
OpportunityStatus = Literal["New", "Reviewed", "Answered", "Converted to Content"]
OpportunityPriority = Literal["low", "medium", "high"]


# This class validates the strict JSON returned by Groq before we save it.
class AudienceOpportunityAIAnalysis(BaseModel):
    type: OpportunityType
    audience_concern: str
    suggested_reply: str
    suggested_topic: str
    suggested_hook: str
    priority: OpportunityPriority

    @field_validator(
        "audience_concern",
        "suggested_reply",
        "suggested_topic",
        "suggested_hook",
    )
    @classmethod
    def text_must_not_be_empty(cls, value):
        if not value or not value.strip():
            raise ValueError("This field cannot be empty.")

        return value.strip()


# This class describes the comment, question, or objection sent by the user.
class AudienceOpportunityCreate(BaseModel):
    source_text: str = Field(..., min_length=1)
    source_platform: str | None = None

    @field_validator("source_text")
    @classmethod
    def source_text_must_not_be_empty(cls, value):
        if not value or not value.strip():
            raise ValueError("Source text cannot be empty.")

        return value.strip()

    @field_validator("source_platform")
    @classmethod
    def clean_source_platform(cls, value):
        if value is None:
            return None

        cleaned_value = value.strip()
        return cleaned_value or None


# This class describes the fields a user can edit after the AI analysis.
class AudienceOpportunityUpdate(BaseModel):
    source_text: str | None = None
    source_platform: str | None = None
    type: OpportunityType | None = None
    audience_concern: str | None = None
    suggested_reply: str | None = None
    suggested_topic: str | None = None
    suggested_hook: str | None = None
    priority: OpportunityPriority | None = None
    status: OpportunityStatus | None = None

    @field_validator(
        "source_text",
        "audience_concern",
        "suggested_reply",
        "suggested_topic",
        "suggested_hook",
    )
    @classmethod
    def provided_text_must_not_be_empty(cls, value):
        if value is None:
            return None

        if not value.strip():
            raise ValueError("This field cannot be empty.")

        return value.strip()

    @field_validator("source_platform")
    @classmethod
    def clean_update_source_platform(cls, value):
        if value is None:
            return None

        cleaned_value = value.strip()
        return cleaned_value or None


# This class describes safe opportunity data sent back to the frontend.
class AudienceOpportunityResponse(BaseModel):
    id: UUID
    source_text: str
    source_platform: str | None = None
    type: str
    audience_concern: str
    suggested_reply: str
    suggested_topic: str
    suggested_hook: str
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
