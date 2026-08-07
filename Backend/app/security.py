import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash


ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

password_hash = PasswordHash.recommended()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from Backend/.env")


# This function creates a secure hash from the user's password.
def hash_password(password):
    return password_hash.hash(password)


# This function checks whether a plain password matches the stored password hash.
def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


# This function creates a JWT access token that stores only the user ID and expiration time.
def create_access_token(user_id):
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire_time}

    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


# This function decodes a JWT access token so the controller can read the user ID.
def decode_access_token(token):
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
