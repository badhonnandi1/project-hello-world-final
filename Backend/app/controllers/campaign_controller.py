from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.campaign_model import Campaign, CampaignPost
from app.models.user_profile_model import User
from app.schemas.campaign_schema import (
    CampaignChatRequest,
    CampaignChatResponse,
    CampaignCreate,
)
from app.services.campaign_ai_service import process_campaign_chat

PROFILE_MISSING_MESSAGE = "Your application user profile has not been created yet."


def resolve_application_user(db: Session, authenticated_account):
    user_profile = (
        db.query(User)
        .filter(User.user_auth_id == authenticated_account.id)
        .first()
    )
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=PROFILE_MISSING_MESSAGE
        )
    return user_profile


def handle_campaign_chat(
    db: Session, authenticated_account, chat_data: CampaignChatRequest
) -> CampaignChatResponse:
    user = resolve_application_user(db, authenticated_account)

    messages_list = [msg.model_dump() for msg in chat_data.messages]
    ai_result = process_campaign_chat(
        messages=messages_list, current_form=chat_data.current_form
    )

    return CampaignChatResponse(
        reply_text=ai_result["reply_text"],
        extracted_data=ai_result.get("extracted_data", {}),
        generated_posts=ai_result.get("generated_posts", []),
    )


def create_campaign(db: Session, authenticated_account, campaign_data: CampaignCreate):
    user = resolve_application_user(db, authenticated_account)

    new_campaign = Campaign(
        user_id=user.id,
        name=campaign_data.name,
        start_date=campaign_data.start_date,
        end_date=campaign_data.end_date,
        posting_frequency=campaign_data.posting_frequency,
        status=campaign_data.status or "active",
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    # Save posts if any were passed
    if campaign_data.posts:
        for p in campaign_data.posts:
            post_obj = CampaignPost(
                campaign_id=new_campaign.id,
                content=p.content,
                platform=p.platform,
                scheduled_time=p.scheduled_time,
                status=p.status or "draft",
            )
            db.add(post_obj)
        db.commit()
        db.refresh(new_campaign)

    return new_campaign


def get_user_campaigns(db: Session, authenticated_account):
    user = resolve_application_user(db, authenticated_account)

    campaigns = (
        db.query(Campaign)
        .options(joinedload(Campaign.posts))
        .filter(Campaign.user_id == user.id)
        .order_by(Campaign.created_at.desc())
        .all()
    )
    return campaigns
