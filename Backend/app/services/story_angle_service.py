import json
import os
import re
from collections import Counter

from google import genai
from google.genai import types

from app.controllers.knowledge_vault_controller import (
    validate_confidentiality_level,
    resolve_application_user,
)
from app.models.knowledge_vault_item_model import KnowledgeVaultItem
from app.schemas.knowledge_vault_schema import (
    GeneratedStoryAngle,
    StoryAngleRequest,
    StoryAngleResponse,
    StoryAngleSource,
)


STOP_WORDS = set(
    """
    a about above after again against all am an and any are as at be because been before
    being below between both but by can did do does doing down during each few for from
    further had has have having he her here hers herself him himself his how i if in into
    is it its itself just me more most my myself no nor not now of off on once only or
    other our ours ourselves out over own same she should so some such than that the
    their theirs them themselves then there these they this those through to too under
    until up very was we were what when where which while who whom why will with would
    you your yours yourself yourselves
    """.split()
)


def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    return genai.Client(api_key=api_key)


def tokenize(text):
    words = re.findall(r"[A-Za-z][A-Za-z0-9'-]*", text.lower())
    return [word for word in words if len(word) > 2 and word not in STOP_WORDS]


def normalize_space(text):
    return re.sub(r"\s+", " ", text or "").strip()


def build_query_text(request: StoryAngleRequest):
    return " ".join(
        value
        for value in [request.topic, request.audience, request.goal]
        if value
    )


def summarize_matches(label, matches):
    if not matches:
        return None

    visible_matches = ", ".join(matches[:4])
    return f"{label} matched: {visible_matches}"


def find_snippet(content, query_terms, length=260):
    clean_content = normalize_space(content)
    if len(clean_content) <= length:
        return clean_content

    lowered_content = clean_content.lower()
    match_positions = [
        lowered_content.find(term)
        for term in query_terms
        if lowered_content.find(term) >= 0
    ]

    if not match_positions:
        return clean_content[:length].rstrip() + "..."

    start = max(0, min(match_positions) - 70)
    end = min(len(clean_content), start + length)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(clean_content) else ""

    return prefix + clean_content[start:end].strip() + suffix


def score_knowledge_item(item, query_terms, topic):
    title_terms = set(tokenize(item.title))
    content_terms = Counter(tokenize(item.content))
    tag_terms = set(tokenize(" ".join(item.tags or [])))
    category_terms = set(tokenize(item.category or ""))
    query_set = set(query_terms)

    title_matches = sorted(query_set & title_terms)
    tag_matches = sorted(query_set & tag_terms)
    category_matches = sorted(query_set & category_terms)
    content_matches = sorted(term for term in query_set if content_terms.get(term, 0) > 0)

    score = 0.0
    score += len(title_matches) * 4.0
    score += len(tag_matches) * 3.0
    score += len(category_matches) * 2.5
    score += sum(min(content_terms[term], 4) for term in content_matches)

    clean_topic = topic.lower().strip()
    if clean_topic and clean_topic in item.title.lower():
        score += 4.0
    if clean_topic and clean_topic in item.content.lower():
        score += 3.0

    reasons = [
        reason
        for reason in [
            summarize_matches("Title", title_matches),
            summarize_matches("Tags", tag_matches),
            summarize_matches("Category", category_matches),
            summarize_matches("Content", content_matches),
        ]
        if reason
    ]

    if not reasons and score > 0:
        reasons.append("Related wording found in this item.")

    return score, reasons


def retrieve_sources(db, current_user, request: StoryAngleRequest):
    validate_confidentiality_level(request.confidentiality_level)
    query = db.query(KnowledgeVaultItem).filter(KnowledgeVaultItem.user_id == current_user.id)

    if request.category:
        query = query.filter(KnowledgeVaultItem.category == request.category)

    if request.confidentiality_level:
        query = query.filter(KnowledgeVaultItem.confidentiality_level == request.confidentiality_level)

    items = query.order_by(KnowledgeVaultItem.updated_at.desc()).all()
    query_terms = tokenize(build_query_text(request))
    ranked_items = []

    for item in items:
        score, reasons = score_knowledge_item(item, query_terms, request.topic)
        if score <= 0:
            continue

        score_base = max(8, len(set(query_terms)) * 3)
        match_score = round(min(100.0, (score / score_base) * 100), 1)
        ranked_items.append(
            (
                score,
                StoryAngleSource(
                    item_id=item.item_id,
                    title=item.title,
                    category=item.category,
                    tags=item.tags,
                    confidentiality_level=item.confidentiality_level,
                    snippet=find_snippet(item.content, query_terms),
                    match_score=match_score,
                    match_reasons=reasons,
                ),
            )
        )

    ranked_items.sort(key=lambda result: result[0], reverse=True)
    return [source for _, source in ranked_items[: request.max_sources]]


def build_no_source_angle(request: StoryAngleRequest):
    return GeneratedStoryAngle(
        title=f"Add source material for {request.topic}",
        hook="The vault does not have a strong matching story yet.",
        angle=(
            "Add one or two Knowledge Vault items about this topic, then run the builder again "
            "to create a grounded post angle."
        ),
        outline=[
            "Add a real story, fact, opinion, or case study to the Knowledge Vault.",
            "Tag it with the topic words your audience would recognize.",
            "Run the Story Angle Builder again to retrieve that source.",
        ],
        cta="Ask readers what detail they want you to explain next.",
        source_usage=[],
        draft_seed=(
            f"I want to write about {request.topic}, but I need one concrete saved story "
            "or fact before turning it into a source-backed LinkedIn post."
        ),
    )


def build_template_angle(request: StoryAngleRequest, sources):
    source_titles = [source.title for source in sources]
    primary_source = sources[0] if sources else None
    audience_text = request.audience or "your LinkedIn audience"
    goal_text = request.goal or "share a useful lesson"

    outline = [
        f"Open with the tension behind {request.topic}.",
        f"Use {primary_source.title if primary_source else 'your strongest vault item'} as the proof point.",
        "Turn the proof point into one practical lesson or opinion.",
        f"Close by inviting {audience_text} to respond with their own experience.",
    ]

    return GeneratedStoryAngle(
        title=f"{request.topic}: a source-backed LinkedIn angle",
        hook=f"Most people talk about {request.topic} in theory. Your saved story makes it practical.",
        angle=(
            f"Use the retrieved vault sources to show a specific lesson about {request.topic}. "
            f"The post should help {audience_text} and aim to {goal_text}."
        ),
        outline=outline,
        cta="What would you do in this situation?",
        source_usage=[
            f"Use '{title}' as supporting context, not as a word-for-word quote."
            for title in source_titles
        ],
        draft_seed=(
            f"Here is the angle: {request.topic} becomes more memorable when it is tied to "
            f"{primary_source.title if primary_source else 'a real saved experience'}. Start with the tension, "
            "show the concrete context, explain the lesson, and end with a simple question."
        ),
    )


def parse_json_response(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise

        return json.loads(match.group(0))


def generate_with_gemini(request: StoryAngleRequest, sources):
    client = get_genai_client()
    if not client or not sources:
        return None

    source_payload = [
        {
            "title": source.title,
            "category": source.category,
            "tags": source.tags,
            "snippet": source.snippet,
        }
        for source in sources
    ]

    prompt = {
        "topic": request.topic,
        "audience": request.audience,
        "goal": request.goal,
        "retrieved_sources": source_payload,
    }

    config = types.GenerateContentConfig(
        system_instruction=(
            "You create LinkedIn content angles for GhostWriter AI. Use only the retrieved "
            "sources as factual grounding. Return strict JSON with these keys: title, hook, "
            "angle, outline, cta, source_usage, draft_seed. The outline and source_usage "
            "values must be arrays of strings. Keep the result practical and beginner-friendly."
        ),
        response_mime_type="application/json",
        temperature=0.55,
    )

    models_to_try = [
        os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ]

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=json.dumps(prompt),
                config=config,
            )

            if response and response.text:
                return GeneratedStoryAngle.model_validate(parse_json_response(response.text))
        except Exception:
            continue

    return None


def build_story_angle(db, authenticated_account, request: StoryAngleRequest):
    current_user = resolve_application_user(db, authenticated_account)
    sources = retrieve_sources(db, current_user, request)

    if not sources:
        return StoryAngleResponse(
            topic=request.topic,
            retrieval_mode="keyword_scoring",
            generation_mode="not_generated_no_sources",
            source_count=0,
            sources=[],
            answer=build_no_source_angle(request),
        )

    ai_angle = generate_with_gemini(request, sources)
    generation_mode = "gemini" if ai_angle else "template_fallback"

    return StoryAngleResponse(
        topic=request.topic,
        retrieval_mode="keyword_scoring",
        generation_mode=generation_mode,
        source_count=len(sources),
        sources=sources,
        answer=ai_angle or build_template_angle(request, sources),
    )
