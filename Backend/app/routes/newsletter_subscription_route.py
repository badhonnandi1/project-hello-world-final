from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.newsletter_subscription_controller import (
    create_newsletter_subscription,
    delete_newsletter_subscription,
    list_newsletter_subscriptions,
    update_newsletter_subscription,
)
from app.db import get_db
from app.schemas.newsletter_subscription_schema import (
    NewsletterSubscriptionMessageResponse,
    NewsletterSubscriptionResponse,
    NewsletterSubscriptionUpdate,
)


router = APIRouter(prefix="/api/newsletter-subscriptions", tags=["Newsletter Subscriptions"])
bearer_scheme = HTTPBearer()


def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


@router.post(
    "/create/{creator_id}",
    response_model=NewsletterSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subscription(
    creator_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return create_newsletter_subscription(db, authenticated_account, creator_id)


@router.get("/get", response_model=list[NewsletterSubscriptionResponse])
def read_subscriptions(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return list_newsletter_subscriptions(db, authenticated_account)


@router.patch(
    "/update/{subscription_id}",
    response_model=NewsletterSubscriptionResponse,
)
def update_subscription(
    subscription_id: UUID,
    subscription_data: NewsletterSubscriptionUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return update_newsletter_subscription(
        db,
        authenticated_account,
        subscription_id,
        subscription_data,
    )


@router.delete(
    "/delete/{subscription_id}",
    response_model=NewsletterSubscriptionMessageResponse,
)
def delete_subscription(
    subscription_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return delete_newsletter_subscription(db, authenticated_account, subscription_id)
