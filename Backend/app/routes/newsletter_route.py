from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.newsletter_controller import (
    create_newsletter,
    delete_newsletter,
    generate_newsletter,
    get_my_newsletter_creator,
    get_newsletter,
    get_newsletter_creator_directory_entry,
    join_newsletter_creators,
    list_newsletter_creators,
    list_owned_newsletters,
    publish_newsletter,
    update_my_newsletter_creator,
    update_newsletter,
)
from app.db import get_db
from app.schemas.newsletter_schema import (
    NewsletterCreate,
    NewsletterCreatorCreate,
    NewsletterCreatorDirectoryResponse,
    NewsletterCreatorResponse,
    NewsletterCreatorUpdate,
    NewsletterGenerateResponse,
    NewsletterMessageResponse,
    NewsletterPublishResponse,
    NewsletterResponse,
    NewsletterUpdate,
)


router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer()


# This dependency applies the project's existing Bearer JWT behavior to every route.
def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(db, credentials.credentials)


@router.post(
    "/newsletter-creators/join",
    response_model=NewsletterCreatorResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Newsletter Creators"],
)
def join_creator_directory(
    creator_data: NewsletterCreatorCreate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return join_newsletter_creators(db, authenticated_account, creator_data)


@router.get(
    "/newsletter-creators/me",
    response_model=NewsletterCreatorResponse,
    tags=["Newsletter Creators"],
)
def read_my_creator_profile(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_my_newsletter_creator(db, authenticated_account)


@router.patch(
    "/newsletter-creators/update/me",
    response_model=NewsletterCreatorResponse,
    tags=["Newsletter Creators"],
)
def update_my_creator_profile(
    creator_data: NewsletterCreatorUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return update_my_newsletter_creator(db, authenticated_account, creator_data)


@router.get(
    "/newsletter-creators",
    response_model=list[NewsletterCreatorDirectoryResponse],
    tags=["Newsletter Directory"],
)
def read_creator_directory(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return list_newsletter_creators(db, authenticated_account)


@router.get(
    "/newsletter-creators/get/{creator_id}",
    response_model=NewsletterCreatorDirectoryResponse,
    tags=["Newsletter Directory"],
)
def read_creator_directory_entry(
    creator_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_newsletter_creator_directory_entry(
        db,
        authenticated_account,
        creator_id,
    )


@router.post(
    "/newsletters/create",
    response_model=NewsletterResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Newsletters"],
)
def create_owned_newsletter(
    newsletter_data: NewsletterCreate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return create_newsletter(db, authenticated_account, newsletter_data)


@router.get(
    "/newsletters/get",
    response_model=list[NewsletterResponse],
    tags=["Newsletters"],
)
def read_owned_newsletters(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return list_owned_newsletters(db, authenticated_account)


@router.get(
    "/newsletters/get/{newsletter_id}",
    response_model=NewsletterResponse,
    tags=["Newsletters"],
)
def read_owned_newsletter(
    newsletter_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_newsletter(db, authenticated_account, newsletter_id)


@router.patch(
    "/newsletters/update/{newsletter_id}",
    response_model=NewsletterResponse,
    tags=["Newsletters"],
)
def update_owned_newsletter(
    newsletter_id: UUID,
    newsletter_data: NewsletterUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return update_newsletter(
        db,
        authenticated_account,
        newsletter_id,
        newsletter_data,
    )


@router.delete(
    "/newsletters/delete/{newsletter_id}",
    response_model=NewsletterMessageResponse,
    tags=["Newsletters"],
)
def delete_owned_newsletter(
    newsletter_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return delete_newsletter(db, authenticated_account, newsletter_id)


@router.post(
    "/newsletters/generate/{newsletter_id}",
    response_model=NewsletterGenerateResponse,
    tags=["Newsletters"],
)
def generate_owned_newsletter(
    newsletter_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return generate_newsletter(db, authenticated_account, newsletter_id)


@router.post(
    "/newsletters/publish/{newsletter_id}",
    response_model=NewsletterPublishResponse,
    tags=["Newsletters"],
)
def publish_owned_newsletter(
    newsletter_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return publish_newsletter(db, authenticated_account, newsletter_id)
