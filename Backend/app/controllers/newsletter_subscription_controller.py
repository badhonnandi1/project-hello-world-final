from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import joinedload

from app.controllers.newsletter_controller import resolve_application_user
from app.models.newsletter_model import NewsletterCreator
from app.models.newsletter_subscription_model import NewsletterSubscription


SUBSCRIPTION_NOT_FOUND_MESSAGE = "Newsletter subscription not found."


def get_owned_subscription(db, subscriber_user_id, subscription_id):
    subscription = (
        db.query(NewsletterSubscription)
        .options(joinedload(NewsletterSubscription.creator))
        .filter(
            NewsletterSubscription.id == subscription_id,
            NewsletterSubscription.subscriber_user_id == subscriber_user_id,
        )
        .first()
    )
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SUBSCRIPTION_NOT_FOUND_MESSAGE,
        )

    return subscription


# This function subscribes the authenticated application user through the path creator ID.
def create_newsletter_subscription(db, authenticated_account, creator_id):
    current_user = resolve_application_user(db, authenticated_account)
    creator = (
        db.query(NewsletterCreator)
        .filter(
            NewsletterCreator.id == creator_id,
            NewsletterCreator.is_active.is_(True),
        )
        .first()
    )
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Newsletter creator profile not found.",
        )
    if creator.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot subscribe to your own newsletter.",
        )

    existing_subscription = (
        db.query(NewsletterSubscription)
        .filter(
            NewsletterSubscription.subscriber_user_id == current_user.id,
            NewsletterSubscription.creator_id == creator.id,
        )
        .first()
    )
    if existing_subscription:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already subscribed to this creator.",
        )

    subscription = NewsletterSubscription(
        subscriber_user_id=current_user.id,
        creator_id=creator.id,
        status="active",
    )
    db.add(subscription)

    try:
        db.commit()
        db.refresh(subscription)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already subscribed to this creator.",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The newsletter subscription could not be created.",
        )

    return get_owned_subscription(db, current_user.id, subscription.id)


def list_newsletter_subscriptions(db, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    return (
        db.query(NewsletterSubscription)
        .options(joinedload(NewsletterSubscription.creator))
        .filter(NewsletterSubscription.subscriber_user_id == current_user.id)
        .order_by(NewsletterSubscription.updated_at.desc())
        .all()
    )


def update_newsletter_subscription(
    db,
    authenticated_account,
    subscription_id,
    subscription_data,
):
    current_user = resolve_application_user(db, authenticated_account)
    subscription = get_owned_subscription(db, current_user.id, subscription_id)
    subscription.status = subscription_data.status

    try:
        db.commit()
        db.refresh(subscription)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The newsletter subscription could not be updated.",
        )

    return subscription


def delete_newsletter_subscription(db, authenticated_account, subscription_id):
    current_user = resolve_application_user(db, authenticated_account)
    subscription = get_owned_subscription(db, current_user.id, subscription_id)

    try:
        db.delete(subscription)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The newsletter subscription could not be deleted.",
        )

    return {"message": "Newsletter subscription deleted successfully."}
