from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class InterviewAnswerUpdate(BaseModel):
    answer_text: str


class InterviewAnswerResponse(BaseModel):
    answer_id: UUID
    session_id: UUID
    question_text: str
    category: str
    answer_text: Optional[str] = None
    input_type: str
    order_index: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewSessionResponse(BaseModel):
    session_id: UUID
    user_id: UUID
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    answers: List[InterviewAnswerResponse] = []

    model_config = ConfigDict(from_attributes=True)
