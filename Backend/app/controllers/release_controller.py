import uuid
import requests
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user_profile_model import User
from app.models.post_generation_model import PostGeneration
from app.models.content_plan_model import ContentPlan
from app.models.released_posts_model import ReleasedPost
from app.models.user_social_account_model import UserSocialAccount
from app.services import zernio_service


def resolve_application_user(db: Session, authenticated_account):
    user = db.query(User).filter(User.user_auth_id == authenticated_account.id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User profile not created."
        )
    return user


def get_user_connections(db: Session, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    
    # 1. Query Zernio REST API for live connected profiles
    live_details = zernio_service.get_connected_account_details()
    
    # 2. Query UserSocialAccount table for user's configured profiles
    db_accounts = (
        db.query(UserSocialAccount)
        .filter(UserSocialAccount.user_id == current_user.id)
        .order_by(UserSocialAccount.created_at.desc())
        .all()
    )
    
    results = []
    seen_platforms = set()
    
    # Include live Zernio API accounts if available
    for item in live_details:
        plat = item.get("platform", "social").lower()
        seen_platforms.add(plat)
        results.append({
            "platform": plat,
            "display_name": item.get("display_name") or f"{plat.capitalize()} Profile",
            "username": item.get("username") or f"@{plat}_user",
            "account_id": item.get("account_id") or f"zernio_{plat}_id",
        })
        
    # Include user's DB / mock accounts
    for acc in db_accounts:
        plat = acc.platform.lower()
        if plat not in seen_platforms:
            seen_platforms.add(plat)
            results.append({
                "platform": plat,
                "display_name": f"{acc.platform.capitalize()} ({acc.zernio_account_id[:16]})",
                "username": f"@{acc.platform.lower()}_user",
                "account_id": acc.zernio_account_id,
            })
            
    return results


def mock_connect_account(db: Session, authenticated_account, platform: str, dummy_account_id: str = None):
    current_user = resolve_application_user(db, authenticated_account)
    platform_clean = platform.lower().strip()

    if not dummy_account_id:
        dummy_account_id = f"zernio_{platform_clean}_{current_user.id.hex[:8]}"

    existing = (
        db.query(UserSocialAccount)
        .filter(
            UserSocialAccount.user_id == current_user.id,
            UserSocialAccount.platform == platform_clean,
        )
        .first()
    )

    if existing:
        existing.zernio_account_id = dummy_account_id
        db.commit()
        db.refresh(existing)
        return existing

    new_acc = UserSocialAccount(
        user_id=current_user.id,
        platform=platform_clean,
        zernio_account_id=dummy_account_id,
    )
    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)
    return new_acc


def get_latest_generation(db: Session, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    latest = (
        db.query(PostGeneration)
        .filter(PostGeneration.user_id == current_user.id)
        .order_by(PostGeneration.created_at.desc())
        .first()
    )
    return latest


def get_backlogged_plans(db: Session, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)
    
    released_plan_ids_subquery = (
        db.query(ReleasedPost.content_plan_id)
        .filter(
            ReleasedPost.user_id == current_user.id,
            ReleasedPost.content_plan_id.isnot(None),
        )
        .subquery()
    )

    backlogged = (
        db.query(ContentPlan)
        .filter(
            ContentPlan.user_id == current_user.id,
            ~ContentPlan.content_plan_id.in_(released_plan_ids_subquery),
        )
        .order_by(ContentPlan.created_at.desc())
        .all()
    )
    return backlogged


def publish_latest_post(db: Session, authenticated_account):
    current_user = resolve_application_user(db, authenticated_account)

    # 1. Fetch latest post generation
    latest = (
        db.query(PostGeneration)
        .filter(PostGeneration.user_id == current_user.id)
        .order_by(PostGeneration.created_at.desc())
        .first()
    )

    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No post generation found to publish."
        )

    # Read intended platform from latest generation (default to "linkedin")
    target_platform = getattr(latest, "platform", None) or "linkedin"

    user_accounts = (
        db.query(UserSocialAccount)
        .filter(UserSocialAccount.user_id == current_user.id)
        .all()
    )

    # Publish exclusively to target platform
    zernio_service.publish_to_socials(
        text_content=latest.content,
        target_platform=target_platform,
        user_accounts=user_accounts
    )

    released = ReleasedPost(
        user_id=current_user.id,
        post_id=latest.post_id,
    )
    db.add(released)
    db.commit()
    db.refresh(released)
    return released


def publish_backlogged_posts(db: Session, authenticated_account, plan_ids: list):
    current_user = resolve_application_user(db, authenticated_account)

    if not plan_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No plan IDs provided for publishing."
        )

    user_accounts = (
        db.query(UserSocialAccount)
        .filter(UserSocialAccount.user_id == current_user.id)
        .all()
    )

    plans = (
        db.query(ContentPlan)
        .filter(
            ContentPlan.user_id == current_user.id,
            ContentPlan.content_plan_id.in_(plan_ids),
        )
        .all()
    )

    if not plans:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matching backlogged content plans found."
        )

    released_records = []
    for plan in plans:
        # Read intended platform from plan (default to "linkedin")
        target_platform = getattr(plan, "platform", None) or "linkedin"

        zernio_service.publish_to_socials(
            text_content=plan.content_text,
            target_platform=target_platform,
            user_accounts=user_accounts
        )

        released = ReleasedPost(
            user_id=current_user.id,
            content_plan_id=plan.content_plan_id,
        )
        db.add(released)
        released_records.append(released)

    db.commit()
    for r in released_records:
        db.refresh(r)

    return released_records
