from datetime import datetime
from pydantic import BaseModel


class SubscriptionStatusResponse(BaseModel):
    subscription_tier: str
    viral_topics_used: int
    viral_topics_limit: int
    content_plans_used: int
    content_plans_limit: int
    can_use_viral_topics: bool
    can_use_content_plans: bool
    last_usage_reset: datetime

    class Config:
        from_attributes = True


class SubscriptionUpgradeResponse(BaseModel):
    message: str
    new_tier: str


class SubscriptionDowngradeResponse(BaseModel):
    message: str
    new_tier: str

class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str

class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str