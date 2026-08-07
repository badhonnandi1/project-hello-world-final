from fastapi import HTTPException, status

from app.models.user_profile_model import User


PROFILE_NOT_FOUND_MESSAGE = "Profile not found."


# This function finds the app profile linked to the logged-in authentication account.
def get_my_profile(db, authenticated_account):
    profile = db.query(User).filter(User.user_auth_id == authenticated_account.id).first()

    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=PROFILE_NOT_FOUND_MESSAGE)

    return profile


# This function creates or updates the logged-in user's app profile.
def save_my_profile(db, authenticated_account, profile_data):
    full_name = profile_data.full_name.strip()
    email = profile_data.email.strip().lower()

    if not full_name or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request data.")

    existing_email_owner = (
        db.query(User)
        .filter(User.email == email, User.user_auth_id != authenticated_account.id)
        .first()
    )
    if existing_email_owner:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")

    profile = db.query(User).filter(User.user_auth_id == authenticated_account.id).first()

    if profile:
        profile.full_name = full_name
        profile.email = email
    else:
        profile = User(
            user_auth_id=authenticated_account.id,
            full_name=full_name,
            email=email,
            role="creator",
            subscription_tier="free",
            is_active=True,
        )
        db.add(profile)

    db.commit()
    db.refresh(profile)

    return profile
