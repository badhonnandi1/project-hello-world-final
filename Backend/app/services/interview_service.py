import json
import os
from typing import Any, Dict, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from google import genai
from google.genai import types

from app.models.interview_session_model import InterviewSession
from app.models.interview_answer_model import InterviewAnswer

ALL_FIELDS = [
    "profession",
    "target_audience",
    "goals",
    "online_identity",
    "writing_style",
    "company_name",
]

DEFAULT_MODEL = "gemini-3.1-flash-lite"


def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def get_previous_session_data(db: Session, user_id: UUID, current_session_id: Optional[UUID] = None) -> Dict[str, Any]:
    query = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id, InterviewSession.status == "completed")
    )
    if current_session_id:
        query = query.filter(InterviewSession.session_id != current_session_id)
    
    previous_session = query.order_by(InterviewSession.completed_at.desc()).first()
    
    prev_data = {}
    if previous_session:
        for field in ALL_FIELDS:
            val = getattr(previous_session, field, None)
            if val:
                prev_data[field] = val
    return prev_data


def get_current_extracted_data(session: InterviewSession) -> Dict[str, Any]:
    extracted = {}
    for field in ALL_FIELDS:
        val = getattr(session, field, None)
        if val:
            extracted[field] = val
    return extracted


def generate_initial_question(db: Session, user_id: UUID, session: InterviewSession) -> str:
    client = get_genai_client()
    prev_data = get_previous_session_data(db, user_id, session.session_id)

    if not client:
        if prev_data.get("profession") or prev_data.get("company_name"):
            profession = prev_data.get("profession", "a professional")
            company = prev_data.get("company_name", "your company")
            return f"Welcome back! Previously, you were a {profession} at {company}. Is that still accurate, and what are your main goals today?"
        return "Welcome to GhostWriter AI! To tailor your experience, what is your current profession and company name?"

    system_instruction = """
You are an intelligent, welcoming AI interviewer for GhostWriter AI.
Your job is to ask the VERY FIRST question of a profile discovery interview.
Keep the question warm, concise, and focused on learning about the user's professional background and goals.

If previous profile context exists:
Mention what you know naturally (e.g., "I know you were previously a [profession] at [company_name], is that still true?") and ask them to confirm or share what they are working on today.

If no previous context exists:
Ask a friendly introductory question about their profession, company, or role.

Return ONLY a strict JSON object with this key:
{
  "initial_question": "Your initial question text..."
}
"""

    prompt_context = {
        "previous_completed_profile": prev_data,
    }

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.7,
        )

        models_to_try = [
            os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
            DEFAULT_MODEL,
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-flash-lite",
        ]

        response = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=json.dumps(prompt_context),
                    config=config,
                )
                if response and response.text:
                    break
            except Exception:
                continue

        if response and response.text:
            parsed = json.loads(response.text)
            question = parsed.get("initial_question")
            if question:
                return question
    except Exception as e:
        print(f"Error generating initial interview question: {e}")

    if prev_data.get("profession"):
        return f"Welcome back! I know you were previously a {prev_data.get('profession')}, is that still true? What is your current role and focus?"
    return "Welcome to GhostWriter AI! What is your current profession and the name of your company or project?"


def process_interview_turn(
    db: Session, user_id: UUID, current_session: InterviewSession, user_answer: str
) -> Dict[str, Any]:
    client = get_genai_client()
    prev_data = get_previous_session_data(db, user_id, current_session.session_id)
    current_extracted = get_current_extracted_data(current_session)
    missing_fields = [f for f in ALL_FIELDS if not current_extracted.get(f)]

    # Collect answers history
    answers_history = []
    for ans in current_session.answers:
        if ans.question_text:
            answers_history.append({"role": "assistant", "content": ans.question_text})
        if ans.answer_text:
            answers_history.append({"role": "user", "content": ans.answer_text})

    # Append current user answer if not already in history
    if user_answer:
        answers_history.append({"role": "user", "content": user_answer})

    if not client:
        # Fallback extraction logic when AI client is unavailable
        new_extracted = dict(current_extracted)
        if "profession" not in new_extracted and user_answer:
            new_extracted["profession"] = user_answer[:100]
        
        still_missing = [f for f in ALL_FIELDS if not new_extracted.get(f)]
        is_complete = len(still_missing) == 0

        next_q = None
        if not is_complete:
            field_labels = {
                "profession": "profession or role",
                "target_audience": "target audience",
                "goals": "primary goals",
                "online_identity": "online identity or social presence",
                "writing_style": "preferred writing style or tone",
                "company_name": "company or brand name",
            }
            next_target = still_missing[0]
            next_q = f"Could you tell me more about your {field_labels.get(next_target, next_target)}?"

        return {
            "extracted_data": new_extracted,
            "next_question": next_q,
            "is_complete": is_complete,
        }

    system_instruction = f"""
You are an expert AI interviewer for GhostWriter AI conducting a profile discovery session.
Your task is to gather 6 key fields about the user through a natural conversation:
1. `profession`: The user's job role or title.
2. `target_audience`: Who they write for or speak to.
3. `goals`: Their main objectives or content goals.
4. `online_identity`: How they represent themselves online or their personal brand.
5. `writing_style`: Tone, voice, or style preferences in writing.
6. `company_name`: Name of their company, organization, or brand.

CONTEXT:
- Historical data from user's PREVIOUS completed interview (if any):
  {json.dumps(prev_data)}
  (You can use this historical context naturally, e.g. "I know you were previously a Marketer at XYZ, is that still true?")

- Currently known extracted fields in CURRENT session:
  {json.dumps(current_extracted)}

- Currently MISSING fields in CURRENT session:
  {json.dumps(missing_fields)}

INSTRUCTIONS:
1. Analyze the full conversation history and the latest user response to extract any of the 6 fields identified so far.
2. Keep existing extracted values unless the user updated them.
3. If all 6 fields are now satisfactorily identified (or updated), set `is_complete` to true, and `next_question` to null or a polite closing line.
4. If any of the 6 fields are still missing, set `is_complete` to false, and generate a natural, conversational `next_question` targeting one or more missing fields. Keep the tone friendly and professional. Ask ONE clear question at a time.

Return ONLY a strict JSON object with this exact structure:
{{
  "extracted_data": {{
    "profession": "string or null",
    "target_audience": "string or null",
    "goals": "string or null",
    "online_identity": "string or null",
    "writing_style": "string or null",
    "company_name": "string or null"
  }},
  "next_question": "string or null",
  "is_complete": boolean
}}
"""

    prompt_payload = {
        "conversation_history": answers_history,
        "latest_user_answer": user_answer,
    }

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.7,
        )

        models_to_try = [
            os.getenv("GEMINI_MODEL", DEFAULT_MODEL),
            DEFAULT_MODEL,
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-flash-lite",
        ]

        response = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=json.dumps(prompt_payload),
                    config=config,
                )
                if response and response.text:
                    break
            except Exception:
                continue

        if not response or not response.text:
            raise Exception("No response received from Gemini models.")

        parsed = json.loads(response.text)
        extracted = parsed.get("extracted_data", {})
        next_q = parsed.get("next_question")
        is_comp = bool(parsed.get("is_complete", False))

        merged_extracted = dict(current_extracted)
        if isinstance(extracted, dict):
            for k, v in extracted.items():
                if k in ALL_FIELDS and v:
                    merged_extracted[k] = v

        still_missing = [f for f in ALL_FIELDS if not merged_extracted.get(f)]
        if len(still_missing) == 0:
            is_comp = True
            next_q = None

        return {
            "extracted_data": merged_extracted,
            "next_question": next_q,
            "is_complete": is_comp,
        }

    except Exception as e:
        print(f"Error in process_interview_turn: {e}")
        merged_extracted = dict(current_extracted)
        still_missing = [f for f in ALL_FIELDS if not merged_extracted.get(f)]
        is_comp = len(still_missing) == 0
        next_q = None
        if not is_comp:
            next_target = still_missing[0]
            next_q = f"Thanks for sharing. Could you also tell me about your {next_target.replace('_', ' ')}?"

        return {
            "extracted_data": merged_extracted,
            "next_question": next_q,
            "is_complete": is_comp,
        }
