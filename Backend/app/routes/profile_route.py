from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.profile_controller import get_my_profile, save_my_profile
from app.db import get_db
from app.schemas.profile_schema import ProfileResponse, ProfileSaveRequest


router = APIRouter(prefix="/profile", tags=["Profile"])
bearer_scheme = HTTPBearer()


# This function reuses the existing JWT login check for profile routes.
def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


# This API endpoint returns the logged-in user's saved app profile.
@router.get("/me", response_model=ProfileResponse)
def read_my_profile(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_my_profile(db, authenticated_account)


# This API endpoint creates or updates the logged-in user's app profile.
@router.put("/me", response_model=ProfileResponse)
def save_profile(
    profile_data: ProfileSaveRequest,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return save_my_profile(db, authenticated_account, profile_data)
