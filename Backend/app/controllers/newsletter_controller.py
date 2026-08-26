from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.models.newsletter_model import Newsletter, NewsletterCreator
from app.models.newsletter_subscription_model import NewsletterSubscription
from app.models.user_profile_model import User
from app.schemas.newsletter_schema import (
    NewsletterCreatorDirectoryResponse,
    PublishedNewsletterPreview,
)
from app.services.newsletter_delivery_service import (
    deliver_newsletter,
    generate_newsletter_content,
)


PROFILE_MISSING_MESSAGE = "Your application user profile has not been created yet."
CREATOR_NOT_FOUND_MESSAGE = "Newsletter creator profile not found."
NEWSLETTER_NOT_FOUND_MESSAGE = "Newsletter not found."


# This function resolves the UUID application profile linked to the authenticated account.
def resolve_application_user(db, authenticated_account):
    current_user = (
        db.query(User)
        .filter(User.user_auth_id == authenticated_account.id)
        .first()
    )
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=PROFILE_MISSING_MESSAGE,
        )

    return current_user


def get_creator_for_user(db, user_id, lock=False):
    query = db.query(NewsletterCreator).filter(NewsletterCreator.user_id == user_id)
    if lock:
        query = query.with_for_update()

    creator = query.first()
    if not creator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=CREATOR_NOT_FOUND_MESSAGE,
        )

    return creator


def commit_and_refresh(db, item, failure_message):
    try:
        db.commit()
        db.refresh(item)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=failure_message,
        )

    return item


# This function creates at most one creator profile for the current application user.
def join_newsletter_creators(db, authenticated_account, creator_data):
    current_user = resolve_application_user(db, authenticated_account)
    existing_creator = (
        db.query(NewsletterCreator)
        .filter(NewsletterCreator.user_id == current_user.id)
        .first()
    )
    if existing_creator:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already joined the newsletter creator directory.",
        )

    creator = NewsletterCreator(
        user_id=current_user.id,
        display_name=creator_data.display_name,
        bio=creator_data.bio,
        topic=creator_data.topic,
        is_active=True,
    )
    db.add(creator)

    try:
        db.commit()
        db.refresh(creator)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already joined the newsletter creator directory.",
        )
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The creator profile could not be created.",
        )

    return creator


def get_my_newsletter_creator(db, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    return get_creator_for_user(db, current_user.id)


def update_my_newsletter_creator(db, authenticated_account, creator_data):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id)

    for field_name, value in creator_data.model_dump(exclude_unset=True).items():
        setattr(creator, field_name, value)

    return commit_and_refresh(
        db,
        creator,
        "The creator profile could not be updated.",
    )


def build_published_preview(newsletter):
    preview_text = " ".join((newsletter.generated_content or "").split())
    if len(preview_text) > 240:
        preview_text = preview_text[:237].rstrip() + "..."

    return PublishedNewsletterPreview(
        id=newsletter.id,
        title=newsletter.title,
        generated_content_preview=preview_text,
        published_at=newsletter.published_at,
    )


def build_directory_creator(db, creator):
    published_newsletters = (
        db.query(Newsletter)
        .filter(
            Newsletter.creator_id == creator.id,
            Newsletter.status == "Published",
            Newsletter.published_at.isnot(None),
            Newsletter.generated_content.isnot(None),
        )
        .order_by(Newsletter.published_at.desc())
        .all()
    )

    return NewsletterCreatorDirectoryResponse(
        id=creator.id,
        display_name=creator.display_name,
        bio=creator.bio,
        topic=creator.topic,
        is_active=creator.is_active,
        newsletters=[build_published_preview(item) for item in published_newsletters],
    )


# This function returns only active creators and safe published previews.
def list_newsletter_creators(db, authenticated_account):
    resolve_application_user(db, authenticated_account)
    creators = (
        db.query(NewsletterCreator)
        .filter(NewsletterCreator.is_active.is_(True))
        .order_by(NewsletterCreator.display_name.asc())
        .all()
    )
    return [build_directory_creator(db, creator) for creator in creators]


def get_newsletter_creator_directory_entry(db, authenticated_account, creator_id):
    resolve_application_user(db, authenticated_account)
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
            detail=CREATOR_NOT_FOUND_MESSAGE,
        )

    return build_directory_creator(db, creator)


def get_owned_newsletter(db, creator_id, newsletter_id, lock=False):
    query = db.query(Newsletter).filter(
        Newsletter.id == newsletter_id,
        Newsletter.creator_id == creator_id,
    )
    if lock:
        query = query.with_for_update()

    newsletter = query.first()
    if not newsletter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=NEWSLETTER_NOT_FOUND_MESSAGE,
        )

    return newsletter


def create_newsletter(db, authenticated_account, newsletter_data):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id)
    newsletter = Newsletter(
        creator_id=creator.id,
        title=newsletter_data.title,
        source_content=newsletter_data.source_content,
        status="Draft",
    )
    db.add(newsletter)
    return commit_and_refresh(db, newsletter, "The newsletter could not be created.")


def list_owned_newsletters(db, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id)
    return (
        db.query(Newsletter)
        .filter(Newsletter.creator_id == creator.id)
        .order_by(Newsletter.updated_at.desc())
        .all()
    )


def get_newsletter(db, authenticated_account, newsletter_id):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id)
    return get_owned_newsletter(db, creator.id, newsletter_id)


def update_newsletter(db, authenticated_account, newsletter_id, newsletter_data):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id)
    newsletter = get_owned_newsletter(db, creator.id, newsletter_id)

    if newsletter.status == "Published":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Published newsletters cannot be edited.",
        )

    update_data = newsletter_data.model_dump(exclude_unset=True)
    content_changed = any(
        getattr(newsletter, field_name) != value
        for field_name, value in update_data.items()
    )
    for field_name, value in update_data.items():
        setattr(newsletter, field_name, value)

    if content_changed:
        newsletter.status = "Draft"
        newsletter.generated_content = None
        newsletter.published_at = None
        newsletter.emailed_at = None

    return commit_and_refresh(db, newsletter, "The newsletter could not be updated.")


def delete_newsletter(db, authenticated_account, newsletter_id):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id)
    newsletter = get_owned_newsletter(db, creator.id, newsletter_id)

    try:
        db.delete(newsletter)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The newsletter could not be deleted.",
        )

    return {"message": "Newsletter deleted successfully."}


def generate_newsletter(db, authenticated_account, newsletter_id):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id)
    newsletter = get_owned_newsletter(db, creator.id, newsletter_id)

    if newsletter.status == "Published":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Published newsletters cannot be regenerated.",
        )

    generated = generate_newsletter_content(newsletter.title, newsletter.source_content)
    newsletter.generated_content = generated.body
    newsletter.status = "Generated"
    newsletter.published_at = None
    newsletter.emailed_at = None
    commit_and_refresh(db, newsletter, "The generated newsletter could not be saved.")

    return {"newsletter": newsletter, "subject": generated.subject}


# This function locks and rechecks a newsletter before its one delivery attempt succeeds.
def publish_newsletter(db, authenticated_account, newsletter_id):
    current_user = resolve_application_user(db, authenticated_account)
    creator = get_creator_for_user(db, current_user.id, lock=True)
    newsletter = get_owned_newsletter(db, creator.id, newsletter_id, lock=True)

    if newsletter.emailed_at is not None:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This newsletter has already been published and emailed.",
        )
    if not creator.is_active:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Activate your creator profile before publishing.",
        )
    if newsletter.status != "Generated" or not newsletter.generated_content:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Generate a newsletter preview before publishing.",
        )

    try:
        final_content = generate_newsletter_content(
            newsletter.title,
            newsletter.source_content,
        )
        subscriber_rows = (
            db.query(User.email)
            .join(
                NewsletterSubscription,
                NewsletterSubscription.subscriber_user_id == User.id,
            )
            .filter(
                NewsletterSubscription.creator_id == creator.id,
                NewsletterSubscription.status == "active",
            )
            .with_for_update(of=NewsletterSubscription)
            .all()
        )
        delivery_count = deliver_newsletter(
            final_content.subject,
            final_content.body,
            [row.email for row in subscriber_rows],
        )
    except HTTPException:
        db.rollback()
        raise

    completed_at = datetime.now(timezone.utc)
    newsletter.generated_content = final_content.body
    newsletter.status = "Published"
    newsletter.published_at = completed_at
    newsletter.emailed_at = completed_at
    commit_and_refresh(db, newsletter, "The newsletter publication could not be recorded.")

    return {"newsletter": newsletter, "delivery_count": delivery_count}
