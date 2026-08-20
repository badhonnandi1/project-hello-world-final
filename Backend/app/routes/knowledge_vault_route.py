from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.knowledge_vault_controller import (
    create_knowledge_item,
    delete_knowledge_item,
    get_knowledge_item,
    list_knowledge_items,
    update_knowledge_item,
)
from app.db import get_db
from app.schemas.knowledge_vault_schema import (
    KnowledgeVaultCreate,
    KnowledgeVaultResponse,
    KnowledgeVaultUpdate,
    StoryAngleRequest,
    StoryAngleResponse,
)
from app.services.story_angle_service import build_story_angle


router = APIRouter(prefix="/knowledge-vault", tags=["Knowledge Vault"])
bearer_scheme = HTTPBearer()


# This function reuses the existing JWT authentication logic for protected routes.
def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


# This API endpoint creates a Knowledge Vault item for the logged-in user.
@router.post("/create", response_model=KnowledgeVaultResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    item_data: KnowledgeVaultCreate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return create_knowledge_item(db, authenticated_account, item_data)


# This API endpoint lists the logged-in user's Knowledge Vault items.
@router.get("/get", response_model=list[KnowledgeVaultResponse])
def list_items(
    search: str | None = Query(default=None),
    category: str | None = Query(default=None),
    confidentiality_level: str | None = Query(default=None),
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return list_knowledge_items(db, authenticated_account, search, category, confidentiality_level)


# This API endpoint returns one owned Knowledge Vault item.
@router.get("/get/{item_id}", response_model=KnowledgeVaultResponse)
def read_item(
    item_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_knowledge_item(db, authenticated_account, item_id)


# This API endpoint updates one owned Knowledge Vault item.
@router.put("/update/{item_id}", response_model=KnowledgeVaultResponse)
def update_item(
    item_id: UUID,
    item_data: KnowledgeVaultUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return update_knowledge_item(db, authenticated_account, item_id, item_data)


# This API endpoint deletes one owned Knowledge Vault item.
@router.delete("/delete/{item_id}")
def delete_item(
    item_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return delete_knowledge_item(db, authenticated_account, item_id)


# This API endpoint retrieves vault sources and turns them into a content angle.
@router.post("/story-angle", response_model=StoryAngleResponse)
def create_story_angle(
    request: StoryAngleRequest,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return build_story_angle(db, authenticated_account, request)
