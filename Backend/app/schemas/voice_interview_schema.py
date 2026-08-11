from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# Data needed when creating a new Voice Interview.
class VoiceInterviewCreate(BaseModel):
    transcript: str


# Data that can be edited after creation.
class VoiceInterviewUpdate(BaseModel):
    transcript: str


# Data returned to the frontend.
class VoiceInterviewResponse(BaseModel):
    interview_id: UUID
    user_id: UUID
    transcript: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)