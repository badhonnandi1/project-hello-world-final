from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
