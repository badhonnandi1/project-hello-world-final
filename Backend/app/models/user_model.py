from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.db import Base


class UserAuth(Base):
    __tablename__ = "user_auth"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_name = Column(String, nullable=False, unique=True)
    # This column stores the hashed password, never the plain-text password.
    password = Column(String, nullable=False)
    phone_number = Column(String, nullable=False, unique=True)

    # This relationship links one login account to one optional application profile.
    user_profile = relationship(
        "User",
        back_populates="auth",
        uselist=False,
        cascade="all, delete-orphan",
    )
