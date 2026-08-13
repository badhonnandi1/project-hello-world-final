from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.audience_opportunity_controller import (
    create_opportunity,
    delete_opportunity,
    get_opportunity,
    list_opportunities,
    reanalyze_opportunity,
    update_opportunity,
)
from app.db import get_db
from app.schemas.audience_opportunity_schema import (
    AudienceOpportunityCreate,
    AudienceOpportunityResponse,
    AudienceOpportunityUpdate,
)


router = APIRouter(prefix="/api/opportunities", tags=["Audience Opportunities"])
bearer_scheme = HTTPBearer()


# This function reuses the existing JWT authentication logic for protected routes.
def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


# This API endpoint creates and analyzes an audience opportunity.
@router.post("/analyze", response_model=AudienceOpportunityResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    opportunity_data: AudienceOpportunityCreate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return create_opportunity(db, authenticated_account, opportunity_data)


# This API endpoint lists the logged-in user's opportunities.
@router.get("", response_model=list[AudienceOpportunityResponse])
def list_items(
    status: str | None = Query(default=None),
    type: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return list_opportunities(db, authenticated_account, status, type, priority)


# This API endpoint returns one owned opportunity.
@router.get("/get/{opportunity_id}", response_model=AudienceOpportunityResponse)
def read_item(
    opportunity_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_opportunity(db, authenticated_account, opportunity_id)


# This API endpoint updates one owned opportunity.
@router.patch("/update/{opportunity_id}", response_model=AudienceOpportunityResponse)
def update_item(
    opportunity_id: UUID,
    opportunity_data: AudienceOpportunityUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return update_opportunity(db, authenticated_account, opportunity_id, opportunity_data)


# This API endpoint deletes one owned opportunity.
@router.delete("/delete/{opportunity_id}")
def delete_item(
    opportunity_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return delete_opportunity(db, authenticated_account, opportunity_id)


# This API endpoint asks Groq to analyze the same source text again.
@router.post("/{opportunity_id}/reanalyze", response_model=AudienceOpportunityResponse)
def reanalyze_item(
    opportunity_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return reanalyze_opportunity(db, authenticated_account, opportunity_id)
