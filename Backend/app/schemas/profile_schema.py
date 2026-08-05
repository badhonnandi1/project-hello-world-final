from uuid import UUID

from pydantic import BaseModel, ConfigDict


# This class describes the profile information the user can save.
class ProfileSaveRequest(BaseModel):
    full_name: str
    email: str


# This class describes the profile information that is safe to send to the frontend.
class ProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    subscription_tier: str

    model_config = ConfigDict(from_attributes=True)
