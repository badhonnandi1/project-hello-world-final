from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


NewsletterStatus = Literal["Draft", "Generated", "Published"]


def clean_required_text(value, field_label):
    cleaned_value = value.strip()
    if not cleaned_value:
        raise ValueError(f"{field_label} cannot be blank.")

    return cleaned_value


# This request creates the authenticated user's one creator profile.
class NewsletterCreatorCreate(BaseModel):
    display_name: str = Field(..., max_length=255)
    bio: str = Field(..., max_length=2000)
    topic: str = Field(..., max_length=255)

    model_config = ConfigDict(extra="forbid")

    @field_validator("display_name", "bio", "topic")
    @classmethod
    def required_creator_text_must_not_be_blank(cls, value, info):
        return clean_required_text(value, info.field_name.replace("_", " ").capitalize())


# This request allows changes only to editable creator-profile fields.
class NewsletterCreatorUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=2000)
    topic: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("display_name", "bio", "topic")
    @classmethod
    def provided_creator_text_must_not_be_blank(cls, value, info):
        if value is None:
            return None

        return clean_required_text(value, info.field_name.replace("_", " ").capitalize())

    @model_validator(mode="after")
    def update_must_contain_a_field(self):
        if not self.model_fields_set:
            raise ValueError("At least one creator field is required.")
        if any(getattr(self, field_name) is None for field_name in self.model_fields_set):
            raise ValueError("Creator fields cannot be null.")

        return self


# This is safe creator identity data that never includes an owner UUID or email.
class NewsletterCreatorSummaryResponse(BaseModel):
    id: UUID
    display_name: str
    bio: str
    topic: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# This response is used by the creator for their own profile controls.
class NewsletterCreatorResponse(NewsletterCreatorSummaryResponse):
    created_at: datetime
    updated_at: datetime


# This request creates a Draft and deliberately has no ownership or status fields.
class NewsletterCreate(BaseModel):
    title: str = Field(..., max_length=255)
    source_content: str

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "source_content")
    @classmethod
    def required_newsletter_text_must_not_be_blank(cls, value, info):
        return clean_required_text(value, info.field_name.replace("_", " ").capitalize())


# This request allows editing only the authored inputs of an unpublished newsletter.
class NewsletterUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    source_content: str | None = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("title", "source_content")
    @classmethod
    def provided_newsletter_text_must_not_be_blank(cls, value, info):
        if value is None:
            return None

        return clean_required_text(value, info.field_name.replace("_", " ").capitalize())

    @model_validator(mode="after")
    def update_must_contain_a_field(self):
        if not self.model_fields_set:
            raise ValueError("At least one newsletter field is required.")
        if any(getattr(self, field_name) is None for field_name in self.model_fields_set):
            raise ValueError("Newsletter fields cannot be null.")

        return self


# This response contains the full authored content only for its owning creator.
class NewsletterResponse(BaseModel):
    id: UUID
    title: str
    source_content: str
    generated_content: str | None = None
    status: NewsletterStatus
    published_at: datetime | None = None
    emailed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# This schema validates the strict structured output returned by Gemini.
class GeneratedNewsletterContent(BaseModel):
    subject: str = Field(..., max_length=255)
    body: str

    model_config = ConfigDict(extra="forbid")

    @field_validator("subject")
    @classmethod
    def subject_must_be_safe_and_nonempty(cls, value):
        cleaned_value = " ".join(value.split())
        if not cleaned_value:
            raise ValueError("Subject cannot be blank.")

        return cleaned_value

    @field_validator("body")
    @classmethod
    def body_must_not_be_blank(cls, value):
        return clean_required_text(value, "Body")


# This response includes the ephemeral generated subject for preview only.
class NewsletterGenerateResponse(BaseModel):
    newsletter: NewsletterResponse
    subject: str


# Public previews expose only shortened generated text and publication metadata.
class PublishedNewsletterPreview(BaseModel):
    id: UUID
    title: str
    generated_content_preview: str
    published_at: datetime


# Public directory responses include no application-user or delivery data.
class NewsletterCreatorDirectoryResponse(NewsletterCreatorSummaryResponse):
    newsletters: list[PublishedNewsletterPreview] = Field(default_factory=list)


# This response reports a publish result without exposing recipients.
class NewsletterPublishResponse(BaseModel):
    newsletter: NewsletterResponse
    delivery_count: int = Field(..., ge=0)


class NewsletterMessageResponse(BaseModel):
    message: str
