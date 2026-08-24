from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class ReleasedPostResponse(BaseModel):
    id: UUID
    user_id: UUID
    content_plan_id: Optional[UUID] = None
    post_id: Optional[UUID] = None
    released_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostGenerationResponse(BaseModel):
    post_id: UUID
    user_id: UUID
    content: str
    platform: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReleaseBackloggedRequest(BaseModel):
    plan_ids: List[UUID]


class SocialAccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    platform: str
    zernio_account_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccountDetailsResponse(BaseModel):
    platform: str
    display_name: Optional[str] = None
    username: Optional[str] = None
    account_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MockConnectRequest(BaseModel):
    platform: str
    dummy_account_id: Optional[str] = None
