import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores one saved knowledge item for a user.
class KnowledgeVaultItem(Base):
    __tablename__ = "knowledge_vault_items"

    item_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    item_date = Column(Date, nullable=True)
    confidentiality_level = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # This relationship connects a knowledge item back to its owner.
    user = relationship("User", back_populates="knowledge_vault_items")
