import json
import os
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from google import genai

from app.models.viral_topic_model import ViralTopic
from app.models.interview_session_model import InterviewSession
from app.models.user_profile_model import User
from app.schemas.viral_topic_schema import ViralTopicGenerateRequest
from app.controllers.subscription_controller import check_and_increment_usage


def resolve_application_user(db: Session, authenticated_account):
    """Find the user profile linked to the authenticated account."""
    user_profile = (
        db.query(User)
        .filter(User.user_auth_id == authenticated_account.id)
        .first()
    )
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Your application user profile has not been created yet.",
        )
    return user_profile


def get_latest_completed_interview(db: Session, user_id):
    """Fetch the most recent completed interview session for a user."""
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == user_id,
            InterviewSession.status == "completed",
        )
        .order_by(InterviewSession.completed_at.desc())
        .first()
    )
    return session


def build_viral_topic_prompt(interview, custom_niche=None):
    """
    Build the AI prompt using the user's interview data.
    """
    profession = custom_niche or interview.profession or "Content Creator"
    company = interview.company_name or "their company"
    audience = interview.target_audience or "a general audience"
    goals = interview.goals or "create engaging content"
    identity = interview.online_identity or "professional"
    style = interview.writing_style or "clear and engaging"

    prompt = f"""You are a viral content strategist for social media with expertise in current trends.

IMPORTANT CONTEXT: The current date is August 2026. Focus on the LATEST trends, tools, and discussions happening RIGHT NOW in 2026. Do NOT reference outdated 2024 or 2025 trends.

Here is the content creator's profile:
- Profession/Role: {profession}
- Company/Brand: {company}
- Target Audience: {audience}
- Content Goals: {goals}
- Online Identity: {identity}
- Writing Style: {style}

Generate exactly 8 viral, trending topic ideas that this person should create content about RIGHT NOW in 2026.

For each topic, provide:
1. "title": A catchy, scroll-stopping title or hook (max 80 characters)
2. "reason": Why this topic would go viral for this specific creator (1-2 sentences)
3. "platform": The best platform to post it on (LinkedIn, Twitter/X, YouTube, Instagram, TikTok)
4. "outline": A content outline with 3-5 bullet points of what to cover
5. "virality_score": A score from 1-10 on how likely this is to go viral

Focus on:
- Current 2026 trends, AI shift  and tools
- Latest industry shifts and debates
- Emerging technologies and workflows
- What's trending on social media RIGHT NOW

IMPORTANT: Respond ONLY with a valid JSON array. No markdown, no code blocks, no explanations outside the JSON.

Example format:
[
  {{
    "title": "Why [Current 2026 Tool] Changed Everything",
    "reason": "Addresses the hottest topic in tech right now",
    "platform": "LinkedIn",
    "outline": ["Point 1", "Point 2", "Point 3"],
    "virality_score": 9
  }}
]
"""
    return prompt


def call_gemini_for_topics(prompt):
    """Send the prompt to Gemini AI and get back topic suggestions."""
    try:
        # Create client with API key from environment
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Call the new Gemini API
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )
        
        # Get the text response
        raw_text = response.text
        
        # Clean up the response - remove markdown code blocks if present
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0]
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0]
        
        # Strip whitespace
        raw_text = raw_text.strip()
        
        # Try to parse as JSON
        topics = json.loads(raw_text)
        return topics
        
    except json.JSONDecodeError:
        # If JSON parsing fails, return the raw text wrapped in a structure
        return [{"title": "AI Response", "reason": raw_text, "platform": "N/A", "outline": [], "virality_score": 5}]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}",
        )


def generate_viral_topics(db: Session, authenticated_account, request: ViralTopicGenerateRequest):
    """
    Main controller function: Generate viral topics for the logged-in user.
    
    Flow:
    1. Get the user's profile
    2. Find their latest completed interview
    3. Build an AI prompt from the interview data
    4. Call Gemini AI
    5. Save the results to the database
    6. Return the topics
    """
    # Step 1: Get the user
    user_profile = resolve_application_user(db, authenticated_account)

    # Step 2: Get their completed interview
    interview = get_latest_completed_interview(db, user_profile.id)
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed interview found. Please complete the Guided Interview first.",
        )
    #Subscription check
    check_and_increment_usage(db, user_profile, "viral_topics")
    # Step 3: Build the AI prompt
    prompt = build_viral_topic_prompt(interview, custom_niche=request.custom_niche)

    # Step 4: Call Gemini AI
    topics = call_gemini_for_topics(prompt)

    # Step 5: Save to database
    # Convert the topics list back to a JSON string for storage
    topics_json = json.dumps(topics)
    
    viral_topic = ViralTopic(
        user_id=user_profile.id,
        topics_data=topics_json,
        profession_snapshot=interview.profession,
        audience_snapshot=interview.target_audience,
    )
    db.add(viral_topic)
    db.commit()
    db.refresh(viral_topic)

    # Step 6: Return the result
    return viral_topic


def get_user_viral_topics(db: Session, authenticated_account):
    """Get all previously generated viral topics for the logged-in user."""
    user_profile = resolve_application_user(db, authenticated_account)
    
    topics = (
        db.query(ViralTopic)
        .filter(ViralTopic.user_id == user_profile.id)
        .order_by(ViralTopic.created_at.desc())
        .all()
    )
    return topics


def get_single_viral_topic(db: Session, authenticated_account, topic_id):
    """Get a specific viral topic generation by ID."""
    user_profile = resolve_application_user(db, authenticated_account)
    
    topic = (
        db.query(ViralTopic)
        .filter(
            ViralTopic.id == topic_id,
            ViralTopic.user_id == user_profile.id,
        )
        .first()
    )
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viral topic not found.",
        )
    return topic


def delete_viral_topic(db: Session, authenticated_account, topic_id):
    """Delete a viral topic generation."""
    user_profile = resolve_application_user(db, authenticated_account)
    
    topic = (
        db.query(ViralTopic)
        .filter(
            ViralTopic.id == topic_id,
            ViralTopic.user_id == user_profile.id,
        )
        .first()
    )
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Viral topic not found.",
        )
    
    db.delete(topic)
    db.commit()
    return {"detail": "Viral topic deleted successfully."}