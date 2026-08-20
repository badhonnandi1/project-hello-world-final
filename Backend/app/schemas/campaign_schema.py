from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CampaignPostCreate(BaseModel):
    content: str
    platform: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = "draft"


class CampaignPostResponse(BaseModel):
    id: UUID
    campaign_id: UUID
    content: str
    platform: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignCreate(BaseModel):
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    posting_frequency: Optional[str] = None
    status: Optional[str] = "active"
    posts: List[CampaignPostCreate] = Field(default_factory=list)


class CampaignResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    posting_frequency: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    posts: List[CampaignPostResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ChatMessage(BaseModel):
    role: str
    content: str


class CampaignChatRequest(BaseModel):
    messages: List[ChatMessage]
    current_form: Optional[Dict[str, Optional[str]]] = None


class CampaignChatResponse(BaseModel):
    reply_text: str
    extracted_data: Dict[str, Optional[str]] = Field(default_factory=dict)
    generated_posts: List[Dict[str, Optional[str]]] = Field(default_factory=list)
