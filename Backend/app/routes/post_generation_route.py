from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session


from app.db import get_db


from app.controllers.auth_controller import (
    get_logged_in_user,
)


from app.controllers.post_generation_controller import (

    # Resource loading
    get_available_content_plans,
    get_available_voice_interviews,
    get_available_knowledge_items,
    get_available_style_presets,

    # AI generation
    generate_post,
    regenerate_post,

    # Saving
    save_post_generation,

    # History
    get_saved_post_generations,
    delete_saved_post,
)


from app.schemas.post_generation_schema import (

    PostGenerationRequest,
    PostRegenerationRequest,
    SavePostGenerationRequest,

    PostGenerationResponse,
    SavedPostGenerationResponse,

)



router = APIRouter(
    prefix="/post-generation",
    tags=["Post Generation"],
)



bearer_scheme = HTTPBearer()



# =========================================================
# AUTHENTICATED USER
# =========================================================

def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):

    return get_logged_in_user(
        db,
        credentials.credentials,
    )



# =========================================================
# RESOURCE SELECTION
# =========================================================
#
# These endpoints provide data for React.
#
# User sees:
# title/name
#
# Backend receives:
# UUID
#
# =========================================================



# ---------------------------------------------------------
# CONTENT PLANS
# ---------------------------------------------------------

@router.get(
    "/content-plans",
)
def get_content_plans(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return get_available_content_plans(
        db,
        authenticated_account,
    )





# ---------------------------------------------------------
# VOICE INTERVIEWS
# ---------------------------------------------------------

@router.get(
    "/voice-interviews",
)
def get_voice_interviews(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return get_available_voice_interviews(
        db,
        authenticated_account,
    )





# ---------------------------------------------------------
# KNOWLEDGE VAULT ITEMS
# ---------------------------------------------------------

@router.get(
    "/knowledge-items",
)
def get_knowledge_items(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return get_available_knowledge_items(
        db,
        authenticated_account,
    )





# ---------------------------------------------------------
# STYLE PRESETS
# ---------------------------------------------------------

@router.get(
    "/style-presets",
)
def get_style_presets(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return get_available_style_presets(
        db,
        authenticated_account,
    )





# =========================================================
# GENERATE POST
# =========================================================


@router.post(
    "/generate",
    response_model=PostGenerationResponse,
)
def create_generated_post(
    generation_data: PostGenerationRequest,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return generate_post(
        db,
        authenticated_account,
        generation_data,
    )





# =========================================================
# REGENERATE POST
# =========================================================


@router.post(
    "/regenerate",
    response_model=PostGenerationResponse,
)
def regenerate_generated_post(
    regeneration_data: PostRegenerationRequest,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return regenerate_post(
        db,
        authenticated_account,
        regeneration_data,
    )





# =========================================================
# SAVE GENERATED POST
# =========================================================


@router.post(
    "/save",
    response_model=SavedPostGenerationResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_generated_post(
    save_data: SavePostGenerationRequest,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return save_post_generation(
        db,
        authenticated_account,
        save_data,
    )





# =========================================================
# SAVED POST HISTORY
# =========================================================
#
# Returns all posts generated and saved by user.
#
# Example:
#
# Dashboard:
#
# My Generated Posts
#
# 1. Leadership lessons
# 2. Startup journey
#
# =========================================================


@router.get(
    "/my-posts",
    response_model=list[SavedPostGenerationResponse],
)
def get_my_saved_posts(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):

    return get_saved_post_generations(
        db,
        authenticated_account,
    )

@router.delete("/{post_id}")
def delete_post(
    post_id:UUID,
    authenticated_account=Depends(get_authenticated_account),
    db:Session=Depends(get_db)
):

    return delete_saved_post(
        db,
        authenticated_account,
        post_id
    )