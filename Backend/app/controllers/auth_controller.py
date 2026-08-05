from fastapi import HTTPException, status
from jwt.exceptions import PyJWTError

from app.models.user_model import UserAuth
from app.security import create_access_token, decode_access_token, hash_password, verify_password


# This function creates a new user account after checking for duplicate values.
def register_user(db, registration_data):
    existing_username = (
        db.query(UserAuth)
        .filter(UserAuth.user_name == registration_data.user_name)
        .first()
    )
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")

    existing_phone = (
        db.query(UserAuth)
        .filter(UserAuth.phone_number == registration_data.phone_number)
        .first()
    )
    if existing_phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already exists")

    new_user = UserAuth(
        user_name=registration_data.user_name,
        password=hash_password(registration_data.password),
        phone_number=registration_data.phone_number,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# This function checks login details and returns a JWT when they are valid.
def login_user(db, login_data):
    user = db.query(UserAuth).filter(UserAuth.user_name == login_data.user_name).first()

    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token = create_access_token(user.id)

    return {"access_token": access_token, "token_type": "bearer"}


# This function reads the JWT, finds the matching user, and returns that user.
def get_logged_in_user(db, token):
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        user = db.query(UserAuth).filter(UserAuth.id == int(user_id)).first()
    except (PyJWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    return user
