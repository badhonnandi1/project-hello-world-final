from datetime import datetime
from typing import Any, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ContentPlanCreateRequest(BaseModel):
 title: str = Field(..., min_length=1,max_length=255)
 content_text: str = Field(..., min_length=1,max_length=10000)
 platform: str = Field(..., min_length=1,max_length=100)
 scheduled_for: Optional[datetime] = None


class ContentPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content_plan_id: UUID
    user_id: UUID
    title: str
    content_text: str
    platform: str
    status: str
    scheduled_for: Optional[datetime] = None
    created_at: datetime
    