from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.content_plan_controller import (
    create_content_plan,
    get_my_content_plans,
    get_my_content_plan,
    update_content_plan,
    delete_content_plan,
)
from app.db import get_db
from app.schemas.content_plan_schema import (
    ContentPlanCreateRequest,
    ContentPlanResponse,
)

router = APIRouter(prefix="/content-plans", tags=["content-plans"])
bearer_scheme = HTTPBearer()


# ── CREATE ────────────────────────────────────────────────
@router.post("", response_model=ContentPlanResponse, status_code=status.HTTP_201_CREATED)
def create_content_plan_endpoint(
    request: ContentPlanCreateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return create_content_plan(db, user, request)



@router.get("", response_model=list[ContentPlanResponse])
def list_content_plans_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    week_start: Optional[date] = None,   
    week_end: Optional[date] = None,     
):
    user = get_logged_in_user(db, credentials.credentials)
    # Map the public API names (week_start) → controller names (start_date)
    return get_my_content_plans(db, user, start_date=week_start, end_date=week_end)


# ── GET ONE ───────────────────────────────────────────────
@router.get("/{content_plan_id}", response_model=ContentPlanResponse)
def get_content_plan_endpoint(
    content_plan_id: UUID,               # path param: /content-plans/<uuid>
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return get_my_content_plan(db, user, content_plan_id)


# ── UPDATE ────────────────────────────────────────────────
@router.put("/{content_plan_id}", response_model=ContentPlanResponse)
def update_content_plan_endpoint(
    content_plan_id: UUID,
    request: ContentPlanCreateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return update_content_plan(db, user, content_plan_id, request)


# ── DELETE ────────────────────────────────────────────────
@router.delete("/{content_plan_id}")
def delete_content_plan_endpoint(
    content_plan_id: UUID,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return delete_content_plan(db, user, content_plan_id)