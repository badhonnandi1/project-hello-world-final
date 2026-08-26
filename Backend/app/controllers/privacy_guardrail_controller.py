from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.privacy_guardrail_model import PrivacyGuardrail
from app.models.user_profile_model import User
from app.schemas.privacy_guardrail_schema import (
    PrivacyGuardrailCreate,
    PrivacyGuardrailUpdate,
)


def resolve_application_user(db, authenticated_account):
    """
    Resolves the UUID-based application user profile
    for the logged-in authentication account.
    """

    user_profile = (
        db.query(User)
        .filter(
            User.user_auth_id == authenticated_account.id
        )
        .first()
    )

    if not user_profile:
        raise HTTPException(
            status_code=409,
            detail="Your application user profile has not been created yet.",
        )

    return user_profile


# ---------------------------------------------------------
# CREATE
# ---------------------------------------------------------

def create_privacy_guardrail(
    db: Session,
    authenticated_account,
    guardrail_data: PrivacyGuardrailCreate,
):
    """
    Creates a new Privacy Guardrail belonging to the
    currently authenticated application user.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    # Remove unnecessary whitespace from user input.
    rule_name = guardrail_data.rule_name.strip()
    rule_value = guardrail_data.rule_value.strip()

    # Make sure the important text fields are not empty.
    if not rule_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rule name cannot be empty.",
        )

    if not rule_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rule value cannot be empty.",
        )

    new_guardrail = PrivacyGuardrail(
        user_id=current_user.id,
        rule_name=rule_name,
        rule_type=guardrail_data.rule_type,
        rule_value=rule_value,
        severity=guardrail_data.severity,
        action=guardrail_data.action,
    )

    db.add(new_guardrail)
    db.commit()
    db.refresh(new_guardrail)

    return new_guardrail


# ---------------------------------------------------------
# GET ALL
# ---------------------------------------------------------

def get_privacy_guardrails(
    db: Session,
    authenticated_account,
):
    """
    Returns all Privacy Guardrail rules belonging to
    the currently authenticated user.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    guardrails = (
        db.query(PrivacyGuardrail)
        .filter(
            PrivacyGuardrail.user_id == current_user.id
        )
        .order_by(
            PrivacyGuardrail.created_at.desc()
        )
        .all()
    )

    return guardrails


# ---------------------------------------------------------
# GET ONE
# ---------------------------------------------------------

def get_privacy_guardrail(
    db: Session,
    authenticated_account,
    rule_id,
):
    """
    Returns one Privacy Guardrail belonging to the
    currently authenticated user.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    guardrail = (
        db.query(PrivacyGuardrail)
        .filter(
            PrivacyGuardrail.rule_id == rule_id,
            PrivacyGuardrail.user_id == current_user.id,
        )
        .first()
    )

    if not guardrail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Privacy guardrail not found.",
        )

    return guardrail


# ---------------------------------------------------------
# UPDATE
# ---------------------------------------------------------

def update_privacy_guardrail(
    db: Session,
    authenticated_account,
    rule_id,
    guardrail_data: PrivacyGuardrailUpdate,
):
    """
    Updates an existing Privacy Guardrail belonging
    to the currently authenticated user.
    """

    guardrail = get_privacy_guardrail(
        db,
        authenticated_account,
        rule_id,
    )

    # Only update fields that were actually provided.
    if guardrail_data.rule_name is not None:
        rule_name = guardrail_data.rule_name.strip()

        if not rule_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rule name cannot be empty.",
            )

        guardrail.rule_name = rule_name

    if guardrail_data.rule_type is not None:
        guardrail.rule_type = guardrail_data.rule_type

    if guardrail_data.rule_value is not None:
        rule_value = guardrail_data.rule_value.strip()

        if not rule_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rule value cannot be empty.",
            )

        guardrail.rule_value = rule_value

    if guardrail_data.severity is not None:
        guardrail.severity = guardrail_data.severity

    if guardrail_data.action is not None:
        guardrail.action = guardrail_data.action

    db.commit()
    db.refresh(guardrail)

    return guardrail


# ---------------------------------------------------------
# TOGGLE ACTIVE / DISABLED
# ---------------------------------------------------------

def toggle_privacy_guardrail(
    db: Session,
    authenticated_account,
    rule_id,
):
    """
    Enables or disables a Privacy Guardrail.
    """

    guardrail = get_privacy_guardrail(
        db,
        authenticated_account,
        rule_id,
    )

    guardrail.is_active = not guardrail.is_active

    db.commit()
    db.refresh(guardrail)

    return guardrail


# ---------------------------------------------------------
# DELETE
# ---------------------------------------------------------

def delete_privacy_guardrail(
    db: Session,
    authenticated_account,
    rule_id,
):
    """
    Permanently deletes a Privacy Guardrail belonging
    to the currently authenticated user.
    """

    guardrail = get_privacy_guardrail(
        db,
        authenticated_account,
        rule_id,
    )

    db.delete(guardrail)
    db.commit()

    return {
        "message": "Privacy guardrail deleted successfully."
    }


def check_privacy_guardrails(
    db,
    authenticated_account,
    text,
):
    """
    Checks the provided text against all active Privacy Guardrail
    rules belonging to the logged-in user.

    The text does not need to be saved in the database.
    """

    # ---------------------------------------------------------
    # 1. Resolve the logged-in user's application profile.
    # ---------------------------------------------------------
    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    # ---------------------------------------------------------
    # 2. Make sure the text is not empty.
    # ---------------------------------------------------------
    cleaned_text = text.strip()

    if not cleaned_text:
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty.",
        )

    # ---------------------------------------------------------
    # 3. Get only this user's active guardrail rules.
    # ---------------------------------------------------------
    active_rules = (
        db.query(PrivacyGuardrail)
        .filter(
            PrivacyGuardrail.user_id == current_user.id,
            PrivacyGuardrail.is_active.is_(True),
        )
        .all()
    )

    # ---------------------------------------------------------
    # 4. Prepare the text for case-insensitive matching.
    # ---------------------------------------------------------
    normalized_text = cleaned_text.casefold()

    violations = []

    # ---------------------------------------------------------
    # 5. Check every active rule.
    # ---------------------------------------------------------
    for rule in active_rules:

        normalized_rule_value = rule.rule_value.strip().casefold()

        # Ignore an invalid/empty rule value just in case.
        if not normalized_rule_value:
            continue

        matched = False

        # -----------------------------------------------------
        # CONFIDENTIAL
        #
        # Example:
        # Rule value: Project Phoenix
        # Text: "Project Phoenix launches next month."
        # -----------------------------------------------------
        if rule.rule_type == "confidential":
            matched = normalized_rule_value in normalized_text

        # -----------------------------------------------------
        # FORBIDDEN PHRASE
        #
        # Example:
        # Rule value: guaranteed returns
        # Text: "We promise guaranteed returns."
        # -----------------------------------------------------
        elif rule.rule_type == "forbidden_phrase":
            matched = normalized_rule_value in normalized_text

        # -----------------------------------------------------
        # COMPETITOR
        #
        # Example:
        # Rule value: Competitor ABC
        # Text: "Unlike Competitor ABC..."
        # -----------------------------------------------------
        elif rule.rule_type == "competitor":
            matched = normalized_rule_value in normalized_text

        # -----------------------------------------------------
        # PROHIBITED TOPIC
        #
        # First version:
        # Check whether the configured topic/keyword appears
        # directly in the text.
        #
        # Example:
        # Rule value: politics
        # Text: "Our company does not discuss politics."
        # -----------------------------------------------------
        elif rule.rule_type == "prohibited_topic":
            matched = normalized_rule_value in normalized_text

        # -----------------------------------------------------
        # 6. Store a violation when the rule matched.
        # -----------------------------------------------------
        if matched:
            violations.append(
                {
                    "rule_id": rule.rule_id,
                    "rule_name": rule.rule_name,
                    "rule_type": rule.rule_type,
                    "rule_value": rule.rule_value,
                    "severity": rule.severity,
                    "action": rule.action,
                }
            )

    # ---------------------------------------------------------
    # 7. Determine the final decision.
    #
    # No violations        -> allow
    # Any "block" violation -> block
    # Otherwise             -> warn
    # ---------------------------------------------------------
    if not violations:
        decision = "allow"

    elif any(
        violation["action"] == "block"
        for violation in violations
    ):
        decision = "block"

    else:
        decision = "warn"

    # ---------------------------------------------------------
    # 8. Return the final guardrail result.
    # ---------------------------------------------------------
    return {
        "passed": decision == "allow",
        "decision": decision,
        "violations": violations,
    }