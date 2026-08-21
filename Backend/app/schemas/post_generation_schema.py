from typing import List, Optional
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field


# =========================================================
# GENERATION REQUEST
# =========================================================
# Frontend sends generation choices.
#
# Privacy rules are NOT sent here.
# Backend loads active privacy rules from database.
# =========================================================

class PostGenerationRequest(BaseModel):

    source_type: str = Field(
        ...,
        description="Source type: content_plan or voice_interview",
    )

    source_id: UUID = Field(
        ...,
        description="Selected source ID",
    )

    style_preset_id: Optional[UUID] = Field(
        default=None,
        description="Optional writing style preset ID",
    )

    knowledge_item_ids: Optional[List[UUID]] = Field(
        default=None,
        description="Selected knowledge vault item IDs",
    )

    post_length: str = Field(
        default="medium",
        description="Desired post length",
    )

    include_hashtags: bool = Field(
        default=True,
        description="Generate hashtags or not",
    )

    include_cta: bool = Field(
        default=True,
        description="Generate CTA or not",
    )


# =========================================================
# REGENERATION REQUEST
# =========================================================
# Used when user clicks regenerate.
#
# We do not save the previous generation.
# It exists only temporarily in frontend.
# =========================================================

class PostRegenerationRequest(BaseModel):

    source_type: str = Field(
        ...,
        description="Source type: content_plan or voice_interview",
    )

    source_id: UUID = Field(
        ...,
        description="Selected source ID",
    )

    previous_content: str = Field(
        ...,
        description="Previous generated content",
    )

    previous_violations: Optional[List[str]] = Field(
        default=None,
        description="Privacy issues found in previous generation",
    )

    style_preset_id: Optional[UUID] = Field(
        default=None,
        description="Optional writing style preset ID",
    )

    knowledge_item_ids: Optional[List[UUID]] = Field(
        default=None,
        description="Selected knowledge vault item IDs",
    )

    post_length: str = Field(
        default="medium",
    )

    include_hashtags: bool = Field(
        default=True,
    )

    include_cta: bool = Field(
        default=True,
    )


# =========================================================
# SAVE DRAFT REQUEST
# =========================================================
# Used after user reviews/edits the generated post.
#
# IMPORTANT:
# Backend performs privacy checking again.
# Frontend decision is never trusted.
# =========================================================

class SavePostGenerationRequest(BaseModel):

    source_type: str = Field(
        ...,
        description="Source type: content_plan or voice_interview",
    )

    source_id: UUID = Field(
        ...,
        description="Original source ID",
    )

    content: str = Field(
        ...,
        description="Final edited post content",
    )

    platform: str = Field(
        ...,
        description="Publishing platform",
    )


# =========================================================
# PRIVACY VIOLATION RESPONSE
# =========================================================

class PrivacyViolationResponse(BaseModel):

    rule_name: str

    rule_type: str

    matched_value: str

    severity: str

    action: str


# =========================================================
# GENERATION RESPONSE
# =========================================================
# Returned after:
#
# Gemini
# +
# Privacy Guardrail checking
#
# Used by generate and regenerate.
# =========================================================

class PostGenerationResponse(BaseModel):

    generated_post: str

    platform: str

    privacy_decision: str

    violations: List[PrivacyViolationResponse] = []


# =========================================================
# SAVED POST RESPONSE
# =========================================================
# Returned after successful save.
# =========================================================

class SavedPostGenerationResponse(BaseModel):

    post_id: UUID

    source_type: str

    source_id: UUID

    content: str

    platform: str

    privacy_status: str
    created_at: datetime
    updated_at: datetime