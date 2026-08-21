from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.newsletter_schema import NewsletterCreatorSummaryResponse


SubscriptionStatus = Literal["active", "paused"]


# Subscription creation is path-driven, so its request has no body schema.
class NewsletterSubscriptionUpdate(BaseModel):
    status: SubscriptionStatus

    model_config = ConfigDict(extra="forbid")


# This response identifies only the current user's row and safe public creator data.
class NewsletterSubscriptionResponse(BaseModel):
    id: UUID
    creator_id: UUID
    status: SubscriptionStatus
    created_at: datetime
    updated_at: datetime
    creator: NewsletterCreatorSummaryResponse

    model_config = ConfigDict(from_attributes=True)


class NewsletterSubscriptionMessageResponse(BaseModel):
    message: str
