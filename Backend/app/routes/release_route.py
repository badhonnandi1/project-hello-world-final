from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.controllers.auth_controller import get_logged_in_user
from app.controllers import release_controller

from app.schemas.release_schema import (
    AccountDetailsResponse,
    MockConnectRequest,
    PostGenerationResponse,
    ReleaseBackloggedRequest,
    ReleasedPostResponse,
    SocialAccountResponse,
)
from app.schemas.content_plan_schema import ContentPlanResponse

router = APIRouter(prefix="/release", tags=["Release"])
bearer_scheme = HTTPBearer()


def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


@router.get("/connections", response_model=List[AccountDetailsResponse])

def get_user_connections_endpoint(
    db: Session = Depends(get_db),
    account=Depends(get_authenticated_account),
):
    return release_controller.get_user_connections(db, account)


@router.post("/mock-connect", response_model=SocialAccountResponse)
def mock_connect_account_endpoint(
    body: MockConnectRequest,
    db: Session = Depends(get_db),
    account=Depends(get_authenticated_account),
):
    return release_controller.mock_connect_account(
        db, account, body.platform, body.dummy_account_id
    )


@router.get("/latest-generation", response_model=PostGenerationResponse)
def get_latest_generation_endpoint(
    db: Session = Depends(get_db),
    account=Depends(get_authenticated_account),
):
    latest = release_controller.get_latest_generation(db, account)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No post generation found.",
        )
    return latest


@router.get("/backlogged-plans", response_model=List[ContentPlanResponse])
def get_backlogged_plans_endpoint(
    db: Session = Depends(get_db),
    account=Depends(get_authenticated_account),
):
    return release_controller.get_backlogged_plans(db, account)


@router.post("/publish-latest", response_model=ReleasedPostResponse)
def publish_latest_post_endpoint(
    db: Session = Depends(get_db),
    account=Depends(get_authenticated_account),
):
    return release_controller.publish_latest_post(db, account)


@router.post("/publish-backlogged", response_model=List[ReleasedPostResponse])
def publish_backlogged_posts_endpoint(
    body: ReleaseBackloggedRequest,
    db: Session = Depends(get_db),
    account=Depends(get_authenticated_account),
):
    return release_controller.publish_backlogged_posts(db, account, body.plan_ids)
