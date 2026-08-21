from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# This schema defines what the frontend receives when topics are generated.
class ViralTopicResponse(BaseModel):
    id: UUID
    user_id: UUID
    topics_data: str  # JSON string containing the array of topics
    profession_snapshot: Optional[str] = None
    audience_snapshot: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# This schema defines what the frontend sends when requesting generation.
# Currently empty because the backend reads the user's interview automatically,
# but we keep it here for future extensibility (e.g., custom niche override).
class ViralTopicGenerateRequest(BaseModel):
    custom_niche: Optional[str] = None  # User can optionally override their interview niche