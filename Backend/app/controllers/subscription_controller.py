import os
import stripe
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user_profile_model import User


# Subscription limits configuration
FREE_TIER_LIMITS = {
    "viral_topics": 3,
    "content_plans": 10,
}

PREMIUM_TIER_LIMITS = {
    "viral_topics": 999999,
    "content_plans": 999999,
}


def resolve_application_user(db: Session, authenticated_account):
    """Find the user profile linked to the authenticated account."""
    user_profile = (
        db.query(User)
        .filter(User.user_auth_id == authenticated_account.id)
        .first()
    )
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your application user profile has not been created yet.",
        )
    return user_profile


def get_subscription_status(db: Session, authenticated_account):
    """Get current subscription tier and usage statistics."""
    user = resolve_application_user(db, authenticated_account)

    # Determine limits based on tier
    limits = FREE_TIER_LIMITS if user.subscription_tier == "free" else PREMIUM_TIER_LIMITS

    return {
        "subscription_tier": user.subscription_tier,
        "viral_topics_used": user.viral_topics_used_this_month,
        "viral_topics_limit": limits["viral_topics"],
        "content_plans_used": user.content_plans_used_this_month,
        "content_plans_limit": limits["content_plans"],
        "can_use_viral_topics": user.viral_topics_used_this_month < limits["viral_topics"],
        "can_use_content_plans": user.content_plans_used_this_month < limits["content_plans"],
        "last_usage_reset": user.last_usage_reset,
    }


def upgrade_to_premium(db: Session, authenticated_account):
    """
  
    In production, this would be triggered by a successful payment webhook.
    """
    user = resolve_application_user(db, authenticated_account)

    if user.subscription_tier == "premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a Premium member.",
        )

    user.subscription_tier = "premium"
    db.commit()
    db.refresh(user)

    return {
        "message": "Welcome to Premium! All features are now unlocked.",
        "new_tier": user.subscription_tier,
    }


def downgrade_to_free(db: Session, authenticated_account):
    """
    Mock downgrade: Sets user tier to free and resets usage counters.
    Useful for testing the subscription flow.
    """
    user = resolve_application_user(db, authenticated_account)

    user.subscription_tier = "free"
    user.viral_topics_used_this_month = 0
    user.content_plans_used_this_month = 0
    user.last_usage_reset = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)

    return {
        "message": "Downgraded to Free tier. Usage counters reset.",
        "new_tier": user.subscription_tier,
    }


def check_and_increment_usage(db: Session, user, feature_name: str):
    """
    Called by other controllers before performing a paid action.
    Returns True if allowed, raises 403 if limit exceeded.
    """
    limits = FREE_TIER_LIMITS if user.subscription_tier == "free" else PREMIUM_TIER_LIMITS

    if feature_name == "viral_topics":
        if user.viral_topics_used_this_month >= limits["viral_topics"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free tier limit reached ({limits['viral_topics']}/month). Please upgrade to Premium for unlimited generations.",
            )
        user.viral_topics_used_this_month += 1

    elif feature_name == "content_plans":
        if user.content_plans_used_this_month >= limits["content_plans"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Free tier limit reached ({limits['content_plans']}/month). Please upgrade to Premium for unlimited plans.",
            )
        user.content_plans_used_this_month += 1

    db.commit()
    db.refresh(user)
    return True

def create_checkout_session(db: Session, authenticated_account):
    """
    Create a Stripe Checkout Session for upgrading to Premium.
    Returns a URL that the frontend will redirect to.
    """
    user = resolve_application_user(db, authenticated_account)

    if user.subscription_tier == "premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a Premium member.",
        )

    # Configure Stripe with your secret key
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    try:
        # Create the checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "GhostWriter AI Premium",
                            "description": "Unlimited viral topics, content plans, and AI features",
                        },
                        "unit_amount": 999,  # $9.99 in cents
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            # Change ?success=true to ?stripe_success=true and remove /subscription
            success_url=f"{frontend_url}/?stripe_success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/subscription?canceled=true",
            metadata={
                "user_id": str(user.id),
                "user_auth_id": str(user.user_auth_id),
            },
        )

        return {
            "checkout_url": session.url,
            "session_id": session.id,
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}",
        )


def verify_payment(db: Session, authenticated_account, session_id: str):
    """
    Verify a Stripe payment and upgrade user to premium.
    Called by frontend after successful checkout redirect.
    """
    user = resolve_application_user(db, authenticated_account)
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    try:
        # Retrieve the session from Stripe to verify payment
        session = stripe.checkout.Session.retrieve(session_id)

        # Check if payment was successful
        if session.payment_status != "paid":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment not completed. Status: {session.payment_status}",
            )

        # ⬇️ FIX: Safely get metadata from the StripeObject
        # Newer Stripe versions return StripeObjects, not dicts, so we use getattr()
        metadata_user_id = getattr(session.metadata, "user_id", None) if session.metadata else None

        # Verify the session belongs to this user
        if metadata_user_id != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This payment session does not belong to you.",
            )

        # Upgrade the user
        user.subscription_tier = "premium"
        db.commit()
        db.refresh(user)

        return {
            "message": "Payment verified! Welcome to Premium.",
            "new_tier": user.subscription_tier,
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}",
        )