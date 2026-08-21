from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


# This class describes the data needed to create a Knowledge Vault item.
class KnowledgeVaultCreate(BaseModel):
    title: str
    content: str
    category: str | None = None
    tags: list[str] = Field(default_factory=list)
    item_date: date | None = None
    confidentiality_level: str = "private"


# This class describes the fields that can be updated later.
class KnowledgeVaultUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    item_date: date | None = None
    confidentiality_level: str | None = None


# This class describes the safe Knowledge Vault item data sent to the frontend.
class KnowledgeVaultResponse(BaseModel):
    item_id: UUID
    title: str
    content: str
    category: str | None = None
    tags: list[str] | None = None
    item_date: date | None = None
    confidentiality_level: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# This class describes the topic brief used by the RAG story angle builder.
class StoryAngleRequest(BaseModel):
    topic: str = Field(..., min_length=2, max_length=180)
    audience: str | None = Field(default=None, max_length=180)
    goal: str | None = Field(default=None, max_length=180)
    category: str | None = None
    confidentiality_level: str | None = None
    max_sources: int = Field(default=4, ge=1, le=6)

    @field_validator("topic")
    @classmethod
    def topic_must_not_be_empty(cls, value):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise ValueError("Topic cannot be empty.")

        return cleaned_value

    @field_validator("audience", "goal", "category", "confidentiality_level")
    @classmethod
    def clean_optional_text(cls, value):
        if value is None:
            return None

        cleaned_value = value.strip()
        return cleaned_value or None


# This class describes one Knowledge Vault item retrieved for the RAG result.
class StoryAngleSource(BaseModel):
    item_id: UUID
    title: str
    category: str | None = None
    tags: list[str] | None = None
    confidentiality_level: str | None = None
    snippet: str
    match_score: float
    match_reasons: list[str] = Field(default_factory=list)


# This class describes the generated content angle returned to the frontend.
class GeneratedStoryAngle(BaseModel):
    title: str
    hook: str
    angle: str
    outline: list[str] = Field(default_factory=list)
    cta: str
    source_usage: list[str] = Field(default_factory=list)
    draft_seed: str


# This class describes the full RAG response.
class StoryAngleResponse(BaseModel):
    topic: str
    retrieval_mode: str
    generation_mode: str
    source_count: int
    sources: list[StoryAngleSource]
    answer: GeneratedStoryAngle
