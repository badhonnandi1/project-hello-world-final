from fastapi import HTTPException, status
from sqlalchemy import Text, cast, or_

from app.models.knowledge_vault_item_model import KnowledgeVaultItem
from app.models.user_profile_model import User


ALLOWED_CONFIDENTIALITY_LEVELS = {"public", "private", "internal"}
PROFILE_MISSING_MESSAGE = "Your application user profile has not been created yet."
NOT_FOUND_MESSAGE = "Knowledge item not found."


# This function checks whether a confidentiality level is allowed.
def validate_confidentiality_level(confidentiality_level):
    if confidentiality_level and confidentiality_level not in ALLOWED_CONFIDENTIALITY_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request data.",
        )


# This function checks that required text fields are not empty.
def validate_required_text(title=None, content=None):
    if title is not None and not title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request data.")

    if content is not None and not content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request data.")


# This function resolves the UUID-based app user profile for the logged-in account.
def resolve_application_user(db, authenticated_account):
    user_profile = (
        db.query(User)
        .filter(User.user_auth_id == authenticated_account.id)
        .first()
    )

    if not user_profile:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=PROFILE_MISSING_MESSAGE)

    return user_profile


# This function creates a Knowledge Vault item owned by the logged-in user.
def create_knowledge_item(db, authenticated_account, item_data):
    current_user = resolve_application_user(db, authenticated_account)
    validate_required_text(title=item_data.title, content=item_data.content)
    validate_confidentiality_level(item_data.confidentiality_level)

    new_item = KnowledgeVaultItem(
        user_id=current_user.id,
        title=item_data.title.strip(),
        content=item_data.content.strip(),
        category=item_data.category,
        tags=item_data.tags,
        item_date=item_data.item_date,
        confidentiality_level=item_data.confidentiality_level,
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return new_item


# This function returns only Knowledge Vault items owned by the logged-in user.
def list_knowledge_items(
    db,
    authenticated_account,
    search=None,
    category=None,
    confidentiality_level=None,
):
    current_user = resolve_application_user(db, authenticated_account)
    validate_confidentiality_level(confidentiality_level)

    query = db.query(KnowledgeVaultItem).filter(KnowledgeVaultItem.user_id == current_user.id)

    # This search/filter block keeps the query scoped to the current user's own items.
    if search:
        search_text = f"%{search.strip()}%"
        query = query.filter(
            or_(
                KnowledgeVaultItem.title.ilike(search_text),
                KnowledgeVaultItem.content.ilike(search_text),
                KnowledgeVaultItem.category.ilike(search_text),
                cast(KnowledgeVaultItem.tags, Text).ilike(search_text),
            )
        )

    if category:
        query = query.filter(KnowledgeVaultItem.category == category)

    if confidentiality_level:
        query = query.filter(KnowledgeVaultItem.confidentiality_level == confidentiality_level)

    return query.order_by(KnowledgeVaultItem.created_at.desc()).all()


# This function finds one item while hiding whether another user owns it.
def get_knowledge_item(db, authenticated_account, item_id):
    current_user = resolve_application_user(db, authenticated_account)

    # This ownership filter prevents one user from accessing another user's item.
    item = (
        db.query(KnowledgeVaultItem)
        .filter(
            KnowledgeVaultItem.item_id == item_id,
            KnowledgeVaultItem.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_MESSAGE)

    return item


# This function updates only provided fields on an owned Knowledge Vault item.
def update_knowledge_item(db, authenticated_account, item_id, item_data):
    item = get_knowledge_item(db, authenticated_account, item_id)
    update_data = item_data.model_dump(exclude_unset=True)

    validate_required_text(
        title=update_data.get("title"),
        content=update_data.get("content"),
    )
    validate_confidentiality_level(update_data.get("confidentiality_level"))

    for field_name, value in update_data.items():
        if field_name in {"title", "content"} and value is not None:
            value = value.strip()
        setattr(item, field_name, value)

    db.commit()
    db.refresh(item)

    return item


# This function deletes an owned Knowledge Vault item.
def delete_knowledge_item(db, authenticated_account, item_id):
    item = get_knowledge_item(db, authenticated_account, item_id)

    db.delete(item)
    db.commit()

    return {"message": "Knowledge item deleted successfully"}
