from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user, login_user, register_user
from app.db import get_db
from app.schemas.auth_schema import LoginRequest, RegisterRequest, TokenResponse, UserResponse


router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer()


# This API endpoint receives registration data and asks the controller to create a user.
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(registration_data: RegisterRequest, db: Session = Depends(get_db)):
    return register_user(db, registration_data)


# This API endpoint receives login data and asks the controller to create a token.
@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, login_data)


# This API endpoint reads a Bearer token and asks the controller for the logged-in user.
@router.get("/me", response_model=UserResponse)
def read_logged_in_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)
