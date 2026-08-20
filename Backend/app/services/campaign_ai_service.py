import json
import os
from typing import Any, Dict, List

from google import genai
from google.genai import types


def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


SYSTEM_INSTRUCTION = """
You are an expert social media strategy assistant for GhostWriter AI.
Your task is to help the user plan and design a social media campaign through a friendly, step-by-step conversation.

Required Campaign Fields to identify:
1. `campaign_name`: Name or topic of the campaign
2. `start_date`: Start date (e.g. YYYY-MM-DD or descriptive date string)
3. `end_date`: End date (e.g. YYYY-MM-DD or descriptive date string)
4. `posting_frequency`: Frequency of posts (e.g. "Daily", "3 times a week", "Every Monday")

Instructions:
- Analyze the user's current chat history and current form state.
- Update/extract any form values you can determine from the conversation into `extracted_data`. Keep previously filled values in `extracted_data` unless updated.
- Ask questions ONE BY ONE for missing fields to keep the conversation focused and natural.
- Once all or key details (`campaign_name`, `posting_frequency`, `start_date`, `end_date`) are provided, generate a list of 3-5 social media posts tailored to the campaign in `generated_posts`.
- ALWAYS respond with strict, valid JSON matching this exact structure:
{
  "reply_text": "Your conversational response to the user here...",
  "extracted_data": {
    "campaign_name": "extracted string or null",
    "start_date": "extracted string or null",
    "end_date": "extracted string or null",
    "posting_frequency": "extracted string or null"
  },
  "generated_posts": [
    {
      "content": "Post text content...",
      "platform": "LinkedIn / Twitter / Instagram / etc.",
      "scheduled_time": "Day 1 / Date / time string"
    }
  ]
}
"""


def process_campaign_chat(
    messages: List[Dict[str, str]], current_form: Dict[str, Any] = None
) -> Dict[str, Any]:
    client = get_genai_client()

    # Formulate context for Gemini
    formatted_messages = []
    if current_form:
        formatted_messages.append(
            f"System State: Current campaign form values are: {json.dumps(current_form)}"
        )

    for msg in messages:
        role = "User" if msg.get("role") == "user" else "Assistant"
        formatted_messages.append(f"{role}: {msg.get('content', '')}")

    full_prompt = "\n".join(formatted_messages)

    if not client:
        # Fallback if no API key present
        extracted = current_form.copy() if current_form else {}
        last_user_msg = messages[-1].get("content", "") if messages else ""
        return {
            "reply_text": f"AI key missing or offline. I received: '{last_user_msg}'. Please configure GEMINI_API_KEY in Backend/.env.",
            "extracted_data": extracted,
            "generated_posts": [],
        }

    try:
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            temperature=0.7,
        )

        models_to_try = [
            os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite"),
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-flash-lite",
            "gemini-flash-lite-latest",
        ]

        response = None
        last_exception = None

        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=full_prompt,
                    config=config,
                )
                if response and response.text:
                    break
            except Exception as ex:
                last_exception = ex
                continue

        if not response or not response.text:
            if last_exception:
                raise last_exception
            raise Exception("No response received from Gemini models.")

        result_text = response.text
        parsed = json.loads(result_text)

        # Ensure correct return layout
        reply_text = parsed.get("reply_text", "How can I help with your campaign?")
        extracted_data = parsed.get("extracted_data", {})
        generated_posts = parsed.get("generated_posts", [])

        return {
            "reply_text": reply_text,
            "extracted_data": extracted_data,
            "generated_posts": generated_posts,
        }

    except Exception as e:
        print(f"Error calling Gemini in campaign_ai_service: {e}")
        extracted = current_form.copy() if current_form else {}
        return {
            "reply_text": f"I had trouble parsing that. Could you provide a bit more detail about your campaign?",
            "extracted_data": extracted,
            "generated_posts": [],
        }
