from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.writing_sample_controller import analyze_writing_sample
from app.db import get_db
from app.schemas.writing_sample_schema import WritingAnalysisResponse, WritingSampleAnalyzeRequest

router = APIRouter(prefix="/writing-samples", tags=["Writing Samples"])
bearer_scheme = HTTPBearer()


@router.post("/analyze", response_model=WritingAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_sample(
    request: WritingSampleAnalyzeRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return analyze_writing_sample(db, user, request)