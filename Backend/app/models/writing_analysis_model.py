import uuid
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy import Column, DateTime, Float, ForeignKey, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


# This model stores the analysis results for one writing sample.
class WritingAnalysis(Base):
    __tablename__ = "writing_analysis"

    analysis_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    sample_id = Column(
        UUID(as_uuid=True),
        ForeignKey("writing_samples.sample_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    hook_style = Column(Text, nullable=True)
    tone = Column(Text, nullable=True)
    vocabulary_level = Column(Text, nullable=True)
    avg_sentence_length = Column(Float, nullable=True)
    paragraph_structure = Column(Text, nullable=True)
    emoji_usage = Column(Text, nullable=True)
    storytelling_style = Column(Text, nullable=True)
    cta_pattern = Column(Text, nullable=True)
    
    analysis_profile = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # This relationship connects the analysis back to its writing sample.
    sample = relationship("WritingSample", back_populates="analysis")
