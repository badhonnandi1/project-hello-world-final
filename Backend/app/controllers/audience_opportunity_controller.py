import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.models.audience_opportunity_model import AudienceOpportunity
from app.models.interview_session_model import InterviewSession
from app.models.user_profile_model import User
from app.schemas.audience_opportunity_schema import AudienceOpportunityAIAnalysis
from app.services.explore_ai_service import filter_similar_opportunities



ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(ENV_PATH)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "openai/gpt-oss-20b"

ALLOWED_TYPES = {"question","objection","misconception","pain_point","negative_feedback","other"}
ALLOWED_STATUSES = {"New", "Reviewed", "Answered", "Converted to Content"}
ALLOWED_PRIORITIES = {"low", "medium", "high"}

PROFILE_MISSING_MESSAGE = "Your application user profile has not been created yet."
NOT_FOUND_MESSAGE = "Opportunity not found."
GROQ_ERROR_MESSAGE = "AI analysis failed. Please check your Groq setup or try again in a moment."


# This function resolves the UUID-based app user profile for the logged-in account.
def resolve_application_user(db, authenticated_account):
    user_profile = (
                    db.query(User).filter(User.user_auth_id == authenticated_account.id).first()
                )

    if not user_profile:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=PROFILE_MISSING_MESSAGE)

    return user_profile


# This function asks Groq to classify the audience text and return strict JSON.
def analyze_source_text(source_text):
    groq_api_key = os.getenv("GROQ_API_KEY")

    if not groq_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Groq API key is missing. Add GROQ_API_KEY to Backend/.env and restart the backend.",
        )

    request_payload = {
        "model": GROQ_MODEL,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You analyze audience comments for a creator. Return only valid JSON with exactly "
                    "these keys: type, audience_concern, suggested_reply, suggested_topic, "
                    "suggested_hook, priority. The type must be one of question, objection, "
                    "misconception, pain_point, negative_feedback, other. The priority must be one "
                    "of low, medium, high. Keep every value practical, clear, and beginner-friendly."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Analyze this audience text and identify the best reply and content opportunity:\n\n"
                    f"{source_text}"
                ),
            },
        ],
    }

    try:
        response = requests.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json",
            },
            json=request_payload,
            timeout=40,
        )
        response.raise_for_status()
        response_data = response.json()

        message_content = response_data["choices"][0]["message"]["content"]
        ai_payload = json.loads(message_content)

        return AudienceOpportunityAIAnalysis.model_validate(ai_payload)
    except (requests.RequestException, KeyError, IndexError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=GROQ_ERROR_MESSAGE,
        )
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI analysis returned an unexpected format. Please try again.",
        )


# This function checks filter values before they are used in a database query.
def validate_filters(status_filter=None, type_filter=None, priority_filter=None):
    if status_filter and status_filter not in ALLOWED_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter.")

    if type_filter and type_filter not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid type filter.")

    if priority_filter and priority_filter not in ALLOWED_PRIORITIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid priority filter.")


# This function creates an opportunity after the AI fields are validated.
def create_opportunity(db, authenticated_account, opportunity_data):
    current_user = resolve_application_user(db, authenticated_account)
    analysis = analyze_source_text(opportunity_data.source_text)

    new_opportunity = AudienceOpportunity(
        user_id=current_user.id,
        source_text=opportunity_data.source_text,
        source_platform=opportunity_data.source_platform,
        type=analysis.type,
        audience_concern=analysis.audience_concern,
        suggested_reply=analysis.suggested_reply,
        suggested_topic=analysis.suggested_topic,
        suggested_hook=analysis.suggested_hook,
        priority=analysis.priority,
        status="New",
    )

    db.add(new_opportunity)
    db.commit()
    db.refresh(new_opportunity)

    return new_opportunity


# This function returns only opportunities owned by the logged-in user.
def list_opportunities(
    db,
    authenticated_account,
    status_filter=None,
    type_filter=None,
    priority_filter=None,
):
    current_user = resolve_application_user(db, authenticated_account)
    validate_filters(status_filter, type_filter, priority_filter)

    query = db.query(AudienceOpportunity).filter(AudienceOpportunity.user_id == current_user.id)

    if status_filter:
        query = query.filter(AudienceOpportunity.status == status_filter)

    if type_filter:
        query = query.filter(AudienceOpportunity.type == type_filter)

    if priority_filter:
        query = query.filter(AudienceOpportunity.priority == priority_filter)

    return query.order_by(AudienceOpportunity.created_at.desc()).all()


# This function finds one opportunity while hiding whether another user owns it.
def get_opportunity(db, authenticated_account, opportunity_id):
    current_user = resolve_application_user(db, authenticated_account)

    opportunity = (
        db.query(AudienceOpportunity)
        .filter(
            AudienceOpportunity.id == opportunity_id,
            AudienceOpportunity.user_id == current_user.id,
        )
        .first()
    )

    if not opportunity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_MESSAGE)

    return opportunity


# This function updates only provided fields on an owned opportunity.
def update_opportunity(db, authenticated_account, opportunity_id, opportunity_data):
    opportunity = get_opportunity(db, authenticated_account, opportunity_id)
    update_data = opportunity_data.model_dump(exclude_unset=True)

    for field_name, value in update_data.items():
        if value is None and field_name != "source_platform":
            continue

        setattr(opportunity, field_name, value)

    db.commit()
    db.refresh(opportunity)

    return opportunity


# This function deletes an owned opportunity.
def delete_opportunity(db, authenticated_account, opportunity_id):
    opportunity = get_opportunity(db, authenticated_account, opportunity_id)

    db.delete(opportunity)
    db.commit()

    return {"message": "Opportunity deleted successfully."}


# This function runs Groq again using the original source text and refreshes the AI fields.
def reanalyze_opportunity(db, authenticated_account, opportunity_id):
    opportunity = get_opportunity(db, authenticated_account, opportunity_id)
    analysis = analyze_source_text(opportunity.source_text)

    opportunity.type = analysis.type
    opportunity.audience_concern = analysis.audience_concern
    opportunity.suggested_reply = analysis.suggested_reply
    opportunity.suggested_topic = analysis.suggested_topic
    opportunity.suggested_hook = analysis.suggested_hook
    opportunity.priority = analysis.priority

    db.commit()
    db.refresh(opportunity)

    return opportunity


# This function fetches an anonymous feed of community opportunities semantically matched to the user's target audience.
def get_explore_feed(db, authenticated_account, offset: int = 0, limit: int = 10):
    # Step 1: Resolve current user profile
    current_user = resolve_application_user(db, authenticated_account)

    # Step 2: Fetch user's most recently completed InterviewSession to extract target_audience
    completed_interview = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "completed",
        )
        .order_by(InterviewSession.completed_at.desc().nullslast(), InterviewSession.started_at.desc())
        .first()
    )

    if (
        not completed_interview
        or not completed_interview.target_audience
        or not completed_interview.target_audience.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your guided interview to set your target audience before exploring opportunities.",
        )

    user_audience = completed_interview.target_audience.strip()

    # Step 3: Fetch recent batch of AudienceOpportunity records created by other users
    candidate_opps = (
        db.query(AudienceOpportunity)
        .filter(AudienceOpportunity.user_id != current_user.id)
        .order_by(AudienceOpportunity.created_at.desc())
        .limit(100)
        .all()
    )

    if not candidate_opps:
        return []

    # Step 4: Pass user's target_audience and batch to Gemini for semantic matching & ranking
    batch_dicts = [
        {
            "id": opp.id,
            "audience_concern": opp.audience_concern,
            "source_text": opp.source_text,
            "suggested_topic": opp.suggested_topic,
            "source_platform": opp.source_platform,
        }
        for opp in candidate_opps
    ]

    matched_id_strs = filter_similar_opportunities(
        user_audience=user_audience,
        opportunities_batch=batch_dicts,
    )

    # Step 5: Map matched IDs back to DB records, preserving order, and paginate
    opp_by_id = {str(opp.id): opp for opp in candidate_opps}
    ordered_matched_opps = [opp_by_id[m_id] for m_id in matched_id_strs if m_id in opp_by_id]

    paginated_opps = ordered_matched_opps[offset : offset + limit]
    return paginated_opps

