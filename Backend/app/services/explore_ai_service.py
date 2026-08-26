import json
import os
from typing import List
from google import genai
from google.genai import types

MODEL_NAME = "gemini-3.1-flash-lite"


def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def filter_similar_opportunities(user_audience: str, opportunities_batch: list) -> List[str]:
    """
    Compares the current user's target audience with a batch of audience opportunities
    using Gemini 3.1 Flash Lite to return a JSON array of opportunity IDs that
    semantically match the target audience, ordered by relevance.
    """
    if not opportunities_batch:
        return []

    client = get_genai_client()
    if not client:
        # Fallback: if Gemini client is unavailable, return all candidate IDs
        return [str(item.get("id")) for item in opportunities_batch if item.get("id")]

    # Prepare simplified batch payload for AI prompt efficiency
    batch_payload = [
        {
            "id": str(item["id"]),
            "audience_concern": item.get("audience_concern", ""),
            "source_text": item.get("source_text", ""),
            "suggested_topic": item.get("suggested_topic", ""),
            "source_platform": item.get("source_platform", ""),
        }
        for item in opportunities_batch
    ]

    system_instruction = (
        "You are an AI recommendation engine for GhostWriter AI.\n"
        "Your task is to analyze a target user's audience description and evaluate a list of community audience opportunities.\n"
        "Filter and rank the opportunities that semantically match, relate to, or would appeal to the target user's audience.\n"
        "Return ONLY a strict JSON array of opportunity ID strings, ordered from most relevant to least relevant.\n"
        "Example format: [\"uuid-1\", \"uuid-2\", \"uuid-3\"]\n"
        "If no opportunities match the target audience, return an empty JSON array: []"
    )

    user_prompt = {
        "target_audience": user_audience,
        "opportunities": batch_payload,
    }

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.2,
        )

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=json.dumps(user_prompt),
            config=config,
        )

        if not response or not response.text:
            return [str(item["id"]) for item in batch_payload]

        matched_ids = json.loads(response.text)
        if isinstance(matched_ids, list):
            # Ensure matched IDs are returned as strings and only include IDs present in batch
            valid_ids = {item["id"] for item in batch_payload}
            return [str(opp_id) for opp_id in matched_ids if str(opp_id) in valid_ids]

        return [str(item["id"]) for item in batch_payload]
    except Exception:
        # If AI call encounters error, return default batch IDs to ensure user gets feed content
        return [str(item["id"]) for item in batch_payload]
