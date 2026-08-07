from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WritingSampleAnalyzeRequest(BaseModel):
    content_text: str = Field(..., min_length=1)


class WritingAnalysisResponse(BaseModel):
    # If your other schemas use `class Config: orm_mode = True`, use that instead.
    model_config = ConfigDict(from_attributes=True)

    analysis_id: UUID
    sample_id: UUID
    hook_style: Optional[str] = None
    tone: Optional[str] = None
    vocabulary_level: Optional[str] = None
    avg_sentence_length: Optional[float] = None
    paragraph_structure: Optional[str] = None
    emoji_usage: Optional[str] = None
    storytelling_style: Optional[str] = None
    cta_pattern: Optional[str] = None
    analysis_profile: Optional[Any] = None
    created_at: datetime