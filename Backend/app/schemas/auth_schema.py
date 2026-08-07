from pydantic import BaseModel, ConfigDict


# This class describes the data needed to register a new user.
class RegisterRequest(BaseModel):
    user_name: str
    password: str
    phone_number: str


# This class describes the data needed to log in.
class LoginRequest(BaseModel):
    user_name: str
    password: str


# This class describes the user data that is safe to send back to the frontend.
class UserResponse(BaseModel):
    id: int
    user_name: str
    phone_number: str

    model_config = ConfigDict(from_attributes=True)


# This class describes the JWT response sent after a successful login.
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
