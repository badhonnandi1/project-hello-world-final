from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# Data needed when creating a new Privacy Guardrail rule.
class PrivacyGuardrailCreate(BaseModel):
    rule_name: str = Field(min_length=1, max_length=255)
    rule_type: str
    rule_value: str = Field(min_length=1)
    severity: str = "medium"
    action: str = "warn"


# Data that can be edited after creation.
class PrivacyGuardrailUpdate(BaseModel):
    rule_name: str | None = Field(default=None, min_length=1, max_length=255)
    rule_type: str | None = None
    rule_value: str | None = Field(default=None, min_length=1)
    severity: str | None = None
    action: str | None = None


# Data returned to the frontend.
class PrivacyGuardrailResponse(BaseModel):
    rule_id: UUID
    user_id: UUID
    rule_name: str
    rule_type: str
    rule_value: str
    severity: str
    action: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------
# Data sent when checking text against Privacy Guardrails.
# ---------------------------------------------------------
class PrivacyGuardrailCheckRequest(BaseModel):
    text: str = Field(
        min_length=1,
        description="The generated or demo text that should be checked.",
    )


# ---------------------------------------------------------
# One rule violation found during checking.
# ---------------------------------------------------------
class PrivacyGuardrailViolation(BaseModel):
    rule_id: UUID
    rule_name: str
    rule_type: str
    rule_value: str
    severity: str
    action: str


# ---------------------------------------------------------
# Final result returned after checking all active rules.
# ---------------------------------------------------------
class PrivacyGuardrailCheckResponse(BaseModel):
    passed: bool
    decision: str
    violations: list[PrivacyGuardrailViolation]  