from typing import List

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.campaign_controller import (
    create_campaign,
    get_user_campaigns,
    handle_campaign_chat,
)
from app.db import get_db
from app.schemas.campaign_schema import (
    CampaignChatRequest,
    CampaignChatResponse,
    CampaignCreate,
    CampaignResponse,
)

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])
bearer_scheme = HTTPBearer()


def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


@router.post("/chat", response_model=CampaignChatResponse, status_code=status.HTTP_200_OK)
def chat_with_campaign_ai(
    chat_data: CampaignChatRequest,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return handle_campaign_chat(db, authenticated_account, chat_data)


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_new_campaign(
    campaign_data: CampaignCreate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return create_campaign(db, authenticated_account, campaign_data)


@router.get("", response_model=List[CampaignResponse], status_code=status.HTTP_200_OK)
def list_campaigns(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_user_campaigns(db, authenticated_account)
