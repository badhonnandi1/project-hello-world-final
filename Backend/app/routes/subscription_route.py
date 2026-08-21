from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.controllers.auth_controller import get_logged_in_user
from app.controllers.subscription_controller import (
    get_subscription_status,
    upgrade_to_premium,
    downgrade_to_free,
    create_checkout_session, 
    verify_payment,           
)
from app.schemas.subscription_schema import (
    SubscriptionStatusResponse,
    SubscriptionUpgradeResponse,
    SubscriptionDowngradeResponse,
    CheckoutSessionResponse,
)

router = APIRouter(prefix="/subscription", tags=["subscription"])
bearer_scheme = HTTPBearer()


# GET /subscription/status
@router.get("/status", response_model=SubscriptionStatusResponse)
def get_status_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return get_subscription_status(db, user)


# POST /subscription/upgrade
@router.post("/upgrade", response_model=SubscriptionUpgradeResponse)
def upgrade_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return upgrade_to_premium(db, user)


# POST /subscription/downgrade
@router.post("/downgrade", response_model=SubscriptionDowngradeResponse)
def downgrade_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return downgrade_to_free(db, user)

# POST /subscription/create-checkout
@router.post("/create-checkout", response_model=CheckoutSessionResponse)
def create_checkout_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return create_checkout_session(db, user)


# POST /subscription/verify-payment
@router.post("/verify-payment", response_model=SubscriptionUpgradeResponse)
def verify_payment_endpoint(
    session_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return verify_payment(db, user, session_id)