from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.writing_style_preset_controller import (
    create_style_preset,
    delete_style_preset,
    generate_style_preset_preview,
    get_style_preset,
    list_style_presets,
    update_style_preset,
)
from app.db import get_db
from app.schemas.writing_style_preset_schema import (
    StylePresetCreate,
    StylePresetPreviewRequest,
    StylePresetPreviewResponse,
    StylePresetResponse,
    StylePresetUpdate,
)


router = APIRouter(
    prefix="/writing-style-presets",
    tags=["Writing Style Preset"],
)

bearer_scheme = HTTPBearer()


# =========================================================
# AUTHENTICATION
# =========================================================

def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(
        db,
        credentials.credentials,
    )


# =========================================================
# RULE-BASED PREVIEW
# =========================================================

@router.post(
    "/preview",
    response_model=StylePresetPreviewResponse,
)
def preview_style_preset(
    preview_data: StylePresetPreviewRequest,
):
    """
    Generates a temporary rule-based preview.

    Nothing is saved to the database.
    """

    return generate_style_preset_preview(
        preview_data
    )


# =========================================================
# CREATE
# =========================================================

@router.post(
    "",
    response_model=StylePresetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_preset(
    preset_data: StylePresetCreate,
    authenticated_account=Depends(
        get_authenticated_account
    ),
    db: Session = Depends(get_db),
):
    """
    Permanently saves a new Writing Style Preset.
    """

    return create_style_preset(
        db,
        authenticated_account,
        preset_data,
    )


# =========================================================
# GET ALL
# =========================================================

@router.get(
    "",
    response_model=list[StylePresetResponse],
)
def get_presets(
    authenticated_account=Depends(
        get_authenticated_account
    ),
    db: Session = Depends(get_db),
):
    """
    Returns all Writing Style Presets owned by
    the logged-in user.
    """

    return list_style_presets(
        db,
        authenticated_account,
    )


# =========================================================
# GET ONE
# =========================================================

@router.get(
    "/{preset_id}",
    response_model=StylePresetResponse,
)
def get_preset(
    preset_id: UUID,
    authenticated_account=Depends(
        get_authenticated_account
    ),
    db: Session = Depends(get_db),
):
    """
    Returns one saved Writing Style Preset.
    """

    return get_style_preset(
        db,
        authenticated_account,
        preset_id,
    )


# =========================================================
# UPDATE
# =========================================================

@router.put(
    "/{preset_id}",
    response_model=StylePresetResponse,
)
def update_preset(
    preset_id: UUID,
    preset_data: StylePresetUpdate,
    authenticated_account=Depends(
        get_authenticated_account
    ),
    db: Session = Depends(get_db),
):
    """
    Updates an existing Writing Style Preset.
    """

    return update_style_preset(
        db,
        authenticated_account,
        preset_id,
        preset_data,
    )


# =========================================================
# DELETE
# =========================================================

@router.delete(
    "/{preset_id}",
)
def delete_preset(
    preset_id: UUID,
    authenticated_account=Depends(
        get_authenticated_account
    ),
    db: Session = Depends(get_db),
):
    """
    Deletes an existing Writing Style Preset and
    its associated archetype records.
    """

    return delete_style_preset(
        db,
        authenticated_account,
        preset_id,
    )