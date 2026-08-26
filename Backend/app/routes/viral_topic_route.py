from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.controllers.auth_controller import get_logged_in_user
from app.controllers.viral_topic_controller import (
    generate_viral_topics,
    get_user_viral_topics,
    get_single_viral_topic,
    delete_viral_topic,
)
from app.schemas.viral_topic_schema import (
    ViralTopicGenerateRequest,
    ViralTopicResponse,
)

# Create the router with a prefix and tags for Swagger grouping
router = APIRouter(prefix="/viral-topics", tags=["viral-topics"])

# Bearer scheme for JWT authentication
bearer_scheme = HTTPBearer()


# POST /viral-topics/generate
# Generates new viral topics using AI based on the user's interview data.
@router.post(
    "/generate",
    response_model=ViralTopicResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_topics_endpoint(
    request: ViralTopicGenerateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return generate_viral_topics(db, user, request)


# GET /viral-topics
# Returns all previously generated viral topics for the logged-in user.
@router.get("", response_model=list[ViralTopicResponse])
def list_viral_topics_endpoint(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return get_user_viral_topics(db, user)


# GET /viral-topics/{topic_id}
# Returns a specific viral topic generation by ID.
@router.get("/{topic_id}", response_model=ViralTopicResponse)
def get_viral_topic_endpoint(
    topic_id: UUID,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return get_single_viral_topic(db, user, topic_id)


# DELETE /viral-topics/{topic_id}
# Deletes a specific viral topic generation.
@router.delete("/{topic_id}")
def delete_viral_topic_endpoint(
    topic_id: UUID,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = get_logged_in_user(db, credentials.credentials)
    return delete_viral_topic(db, user, topic_id)