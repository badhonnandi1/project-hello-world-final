from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.controllers.auth_controller import get_logged_in_user
from app.controllers.privacy_guardrail_controller import (
    create_privacy_guardrail,
    delete_privacy_guardrail,
    get_privacy_guardrail,
    get_privacy_guardrails,
    toggle_privacy_guardrail,
    update_privacy_guardrail,
    check_privacy_guardrails,
)
from app.db import get_db
from app.schemas.privacy_guardrail_schema import (
    PrivacyGuardrailCreate,
    PrivacyGuardrailResponse,
    PrivacyGuardrailUpdate,
    PrivacyGuardrailCheckRequest,
    PrivacyGuardrailCheckResponse,

)


router = APIRouter(
    prefix="/privacy-guardrails",
    tags=["Privacy Guardrails"],
)

bearer_scheme = HTTPBearer()


# ---------------------------------------------------------
# AUTHENTICATED USER
# ---------------------------------------------------------

def get_authenticated_account(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    return get_logged_in_user(
        db,
        credentials.credentials,
    )


# ---------------------------------------------------------
# CREATE
# ---------------------------------------------------------

@router.post(
    "",
    response_model=PrivacyGuardrailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_guardrail(
    guardrail_data: PrivacyGuardrailCreate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return create_privacy_guardrail(
        db,
        authenticated_account,
        guardrail_data,
    )


# ---------------------------------------------------------
# GET ALL
# ---------------------------------------------------------

@router.get(
    "",
    response_model=list[PrivacyGuardrailResponse],
)
def get_all_guardrails(
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_privacy_guardrails(
        db,
        authenticated_account,
    )
# ---------------------------------------------------------
# CHECK TEXT AGAINST ACTIVE PRIVACY GUARDRAILS
# ---------------------------------------------------------

@router.post(
    "/check",
    response_model=PrivacyGuardrailCheckResponse,
)
def check_text_against_guardrails(
    check_data: PrivacyGuardrailCheckRequest,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return check_privacy_guardrails(
        db,
        authenticated_account,
        check_data.text,
    )

# ---------------------------------------------------------
# GET ONE
# ---------------------------------------------------------

@router.get(
    "/{rule_id}",
    response_model=PrivacyGuardrailResponse,
)
def get_one_guardrail(
    rule_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return get_privacy_guardrail(
        db,
        authenticated_account,
        rule_id,
    )


# ---------------------------------------------------------
# UPDATE
# ---------------------------------------------------------

@router.put(
    "/{rule_id}",
    response_model=PrivacyGuardrailResponse,
)
def update_guardrail(
    rule_id: UUID,
    guardrail_data: PrivacyGuardrailUpdate,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return update_privacy_guardrail(
        db,
        authenticated_account,
        rule_id,
        guardrail_data,
    )


# ---------------------------------------------------------
# TOGGLE ACTIVE / DISABLED
# ---------------------------------------------------------

@router.patch(
    "/{rule_id}/toggle",
    response_model=PrivacyGuardrailResponse,
)
def toggle_guardrail(
    rule_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return toggle_privacy_guardrail(
        db,
        authenticated_account,
        rule_id,
    )


# ---------------------------------------------------------
# DELETE
# ---------------------------------------------------------

@router.delete(
    "/{rule_id}",
)
def delete_guardrail(
    rule_id: UUID,
    authenticated_account=Depends(get_authenticated_account),
    db: Session = Depends(get_db),
):
    return delete_privacy_guardrail(
        db,
        authenticated_account,
        rule_id,
    )

