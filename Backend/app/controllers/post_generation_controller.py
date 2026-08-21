import os

from dotenv import load_dotenv
from fastapi import HTTPException, status
from google import genai
from sqlalchemy.orm import Session

from app.models.user_profile_model import User

from app.models.content_plan_model import ContentPlan
from app.models.voice_interview_model import VoiceInterview

from app.models.interview_session_model import InterviewSession

from app.models.writing_sample_model import WritingSample
from app.models.writing_analysis_model import WritingAnalysis

from app.models.writing_style_preset_model import StylePreset
from app.models.style_preset_archetype_model import StylePresetArchetype

from app.models.knowledge_vault_item_model import KnowledgeVaultItem

from app.models.privacy_guardrail_model import PrivacyGuardrail

from app.models.post_generation_model import PostGeneration


from app.controllers.privacy_guardrail_controller import (
    check_privacy_guardrails,
)


from app.schemas.post_generation_schema import (
    PostGenerationRequest,
    PostRegenerationRequest,
    SavePostGenerationRequest,
)



# =========================================================
# GEMINI CONFIGURATION
# =========================================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError(
        "GEMINI_API_KEY not found in .env"
    )


client = genai.Client(
    api_key=api_key
)



# =========================================================
# USER RESOLUTION
# =========================================================


def resolve_application_user(
    db,
    authenticated_account,
):
    """
    Resolves application user profile from
    authentication account.
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
            detail="Application user profile not found.",
        )


    return user_profile




# =========================================================
# RESOURCE LISTING FOR FRONTEND
# =========================================================
#
# These functions are not for Gemini.
#
# They help React display selectable resources.
#
# Example:
#
# Knowledge Vault:
#
# [
#   {
#       item_id:"uuid",
#       title:"My startup journey"
#   }
# ]
#
# =========================================================



def get_available_content_plans(
    db,
    authenticated_account,
):
    """
    Returns user's existing content plans
    for frontend selection.
    """


    current_user = resolve_application_user(
        db,
        authenticated_account,
    )


    plans = (
        db.query(ContentPlan)
        .filter(
            ContentPlan.user_id == current_user.id
        )
        .order_by(
            ContentPlan.created_at.desc()
        )
        .all()
    )


    return plans





def get_available_voice_interviews(
    db,
    authenticated_account,
):
    """
    Returns user's saved voice interviews
    for frontend selection.
    """


    current_user = resolve_application_user(
        db,
        authenticated_account,
    )


    interviews = (
        db.query(VoiceInterview)
        .filter(
            VoiceInterview.user_id == current_user.id
        )
        .order_by(
            VoiceInterview.created_at.desc()
        )
        .all()
    )


    return interviews





def get_available_knowledge_items(
    db,
    authenticated_account,
):
    """
    Returns knowledge vault items
    for frontend selection.

    Frontend displays title.
    Backend receives item_id.
    """


    current_user = resolve_application_user(
        db,
        authenticated_account,
    )


    items = (
        db.query(KnowledgeVaultItem)
        .filter(
            KnowledgeVaultItem.user_id == current_user.id
        )
        .order_by(
            KnowledgeVaultItem.created_at.desc()
        )
        .all()
    )


    return items





def get_available_style_presets(
    db,
    authenticated_account,
):
    """
    Returns writing style presets
    for frontend selection.
    """


    current_user = resolve_application_user(
        db,
        authenticated_account,
    )


    presets = (
        db.query(StylePreset)
        .filter(
            StylePreset.user_id == current_user.id
        )
        .order_by(
            StylePreset.created_at.desc()
        )
        .all()
    )


    return presets






# =========================================================
# SOURCE LOADING FOR GEMINI
# =========================================================



def get_content_plan_source(
    db,
    current_user,
    source_id,
):
    """
    Loads selected Content Plan.
    """


    content_plan = (
        db.query(ContentPlan)
        .filter(
            ContentPlan.content_plan_id == source_id,
            ContentPlan.user_id == current_user.id,
        )
        .first()
    )


    if not content_plan:

        raise HTTPException(
            status_code=404,
            detail="Content plan not found.",
        )


    return {

        "title": content_plan.title,

        "content": content_plan.content_text,

        "platform": content_plan.platform,

    }





def get_voice_interview_source(
    db,
    current_user,
    source_id,
):
    """
    Loads selected Voice Interview.
    """


    interview = (
        db.query(VoiceInterview)
        .filter(
            VoiceInterview.interview_id == source_id,
            VoiceInterview.user_id == current_user.id,
        )
        .first()
    )


    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Voice interview not found.",
        )


    return {

        "title": "Voice Interview",

        "content": interview.transcript,

        "platform": "LinkedIn",

    }





def resolve_generation_source(
    db,
    current_user,
    source_type,
    source_id,
):
    """
    Resolves selected generation source.
    """


    if source_type == "content_plan":

        return get_content_plan_source(
            db,
            current_user,
            source_id,
        )


    elif source_type == "voice_interview":

        return get_voice_interview_source(
            db,
            current_user,
            source_id,
        )


    else:

        raise HTTPException(
            status_code=400,
            detail="Invalid source type.",
        )





# =========================================================
# USER IDENTITY CONTEXT
# =========================================================



def get_interview_context(
    db,
    current_user,
):
    """
    Loads personal identity information
    from completed guided interview.
    """


    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == current_user.id,
            InterviewSession.status == "completed",
        )
        .order_by(
            InterviewSession.completed_at.desc()
        )
        .first()
    )


    if not session:

        return "No interview profile available."



    return f"""

Profession:
{session.profession}


Target Audience:
{session.target_audience}


Goals:
{session.goals}


Online Identity:
{session.online_identity}


Company Name:
{session.company_name}


"""



# =========================================================
# WRITING ANALYSIS CONTEXT
# =========================================================



def get_writing_analysis_context(
    db,
    current_user,
):
    """
    Loads user's writing fingerprint.

    Source:
    WritingSample
          |
          |
    WritingAnalysis
    """


    sample = (
        db.query(WritingSample)
        .filter(
            WritingSample.user_id == current_user.id
        )
        .order_by(
            WritingSample.uploaded_at.desc()
        )
        .first()
    )


    if not sample:

        return "No writing analysis available."



    analysis = (
        db.query(WritingAnalysis)
        .filter(
            WritingAnalysis.sample_id == sample.sample_id
        )
        .first()
    )


    if not analysis:

        return "No writing analysis available."



    return f"""

Writing Tone:
{analysis.tone}


Hook Style:
{analysis.hook_style}


Vocabulary Level:
{analysis.vocabulary_level}


Average Sentence Length:
{analysis.avg_sentence_length}


Paragraph Structure:
{analysis.paragraph_structure}


Emoji Usage:
{analysis.emoji_usage}


Storytelling Style:
{analysis.storytelling_style}


CTA Pattern:
{analysis.cta_pattern}


"""
# =========================================================
# WRITING STYLE PRESET CONTEXT
# =========================================================


def get_style_context(
    db,
    current_user,
    preset_id,
):
    """
    Loads selected Writing Style Preset
    and its archetypes.
    """


    if not preset_id:

        return "No custom writing style selected."



    preset = (
        db.query(StylePreset)
        .filter(
            StylePreset.preset_id == preset_id,
            StylePreset.user_id == current_user.id,
        )
        .first()
    )


    if not preset:

        raise HTTPException(
            status_code=404,
            detail="Writing style preset not found.",
        )



    archetypes = (
        db.query(StylePresetArchetype)
        .filter(
            StylePresetArchetype.preset_id ==
            preset.preset_id
        )
        .all()
    )



    style_text = f"""

Preset Name:
{preset.preset_name}


"""



    for archetype in archetypes:

        style_text += (
            f"{archetype.archetype}: "
            f"{archetype.percentage}%\n"
        )


    return style_text




# =========================================================
# KNOWLEDGE VAULT CONTEXT
# =========================================================


def get_knowledge_context(
    db,
    current_user,
    item_ids,
):
    """
    Loads selected Knowledge Vault items.

    Frontend sends IDs.
    Gemini receives actual content.
    """


    if not item_ids:

        return "No additional knowledge provided."



    items = (
        db.query(KnowledgeVaultItem)
        .filter(
            KnowledgeVaultItem.item_id.in_(item_ids),
            KnowledgeVaultItem.user_id == current_user.id,
        )
        .all()
    )



    if not items:

        return "No matching knowledge items found."



    knowledge_text = ""



    for item in items:

        knowledge_text += f"""

Knowledge Title:
{item.title}


Knowledge Content:
{item.content}


Category:
{item.category}


"""



    return knowledge_text




# =========================================================
# PRIVACY PROMPT CONTEXT
# =========================================================


def get_privacy_prompt_context(
    db,
    current_user,
):
    """
    First privacy protection layer.

    Privacy rules are injected into Gemini prompt.
    """


    rules = (
        db.query(PrivacyGuardrail)
        .filter(
            PrivacyGuardrail.user_id == current_user.id,
            PrivacyGuardrail.is_active.is_(True),
        )
        .all()
    )



    if not rules:

        return "No privacy restrictions."



    privacy_text = ""



    for rule in rules:

        privacy_text += f"""

Restriction:
Do not mention "{rule.rule_value}"


Reason:
{rule.rule_name}


"""



    return privacy_text




# =========================================================
# GEMINI PROMPT BUILDER
# =========================================================


def build_generation_prompt(
    source,
    interview_context,
    writing_analysis_context,
    style_context,
    knowledge_context,
    privacy_context,
    request,
    previous_content=None,
    previous_violations=None,
):
    """
    Builds final Gemini instruction.

    Used for:
    1. First generation
    2. Regeneration after user feedback/privacy issues
    """

    prompt = f"""

You are an expert social media content strategist.

Create a high quality personal brand post.


=================================================
CONTENT SOURCE
=================================================

Title:

{source["title"]}


Content:

{source["content"]}



=================================================
USER IDENTITY
=================================================

{interview_context}



=================================================
USER WRITING FINGERPRINT
=================================================

{writing_analysis_context}



=================================================
SELECTED WRITING STYLE
=================================================

{style_context}



=================================================
PERSONAL KNOWLEDGE
=================================================

{knowledge_context}



=================================================
PRIVACY RESTRICTIONS
=================================================

{privacy_context}



=================================================
POST SETTINGS
=================================================

Length:

{request.post_length}


Include Hashtags:

{request.include_hashtags}


Include CTA:

{request.include_cta}



=================================================
IMPORTANT GENERATION RULES
=================================================

- Do not invent facts.
- Do not reveal restricted information.
- Follow the user's natural writing style.
- Maintain authenticity.
- Keep the post suitable for the selected platform.
- Generate only the final post text.
- Do not explain your reasoning.


"""


    # =====================================================
    # REGENERATION CONTEXT
    # =====================================================

    if previous_content:

        prompt += f"""

=================================================
PREVIOUS GENERATED VERSION
=================================================

The user wants an improved version of the previous draft:

{previous_content}


Rewrite this post with better quality while preserving the main idea.

"""


    if previous_violations:

        prompt += """

=================================================
PREVIOUS PRIVACY ISSUES
=================================================

The previous version failed because it contained
restricted information.

The following items MUST NOT appear in the new version:


"""


        for violation in previous_violations:

            prompt += f"""
- {violation}
"""


        prompt += """

Create a new version that avoids these violations
while keeping the post valuable and authentic.

"""


    return prompt


# =========================================================
# GENERATE POST
# =========================================================


def generate_post(
    db: Session,
    authenticated_account,
    request: PostGenerationRequest,
):


    current_user = resolve_application_user(
        db,
        authenticated_account,
    )



    source = resolve_generation_source(
        db,
        current_user,
        request.source_type,
        request.source_id,
    )



    interview_context = get_interview_context(
        db,
        current_user,
    )



    writing_analysis_context = get_writing_analysis_context(
        db,
        current_user,
    )



    style_context = get_style_context(
        db,
        current_user,
        request.style_preset_id,
    )



    knowledge_context = get_knowledge_context(
        db,
        current_user,
        request.knowledge_item_ids,
    )



    privacy_context = get_privacy_prompt_context(
        db,
        current_user,
    )



    prompt = build_generation_prompt(
        source,
        interview_context,
        writing_analysis_context,
        style_context,
        knowledge_context,
        privacy_context,
        request,
    )



    try:

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
        )


        generated_post = response.text.strip()



    except Exception as e:


        raise HTTPException(
            status_code=500,
            detail=f"Gemini generation failed: {str(e)}",
        )




    # -----------------------------------------------------
    # SECOND PRIVACY LAYER
    #
    # Actual generated text checking
    # -----------------------------------------------------

    privacy_result = check_privacy_guardrails(
        db,
        authenticated_account,
        generated_post,
    )



    return {

        "generated_post": generated_post,

        "platform": source["platform"],

        "privacy_decision": privacy_result["decision"],

        "violations": privacy_result["violations"],

    }





# =========================================================
# REGENERATE POST
# =========================================================


def regenerate_post(
    db: Session,
    authenticated_account,
    request: PostRegenerationRequest,
):


    current_user = resolve_application_user(
        db,
        authenticated_account,
    )



    source = resolve_generation_source(
        db,
        current_user,
        request.source_type,
        request.source_id,
    )



    interview_context = get_interview_context(
        db,
        current_user,
    )


    writing_analysis_context = get_writing_analysis_context(
        db,
        current_user,
    )



    style_context = get_style_context(
        db,
        current_user,
        request.style_preset_id,
    )



    knowledge_context = get_knowledge_context(
        db,
        current_user,
        request.knowledge_item_ids,
    )



    privacy_context = get_privacy_prompt_context(
        db,
        current_user,
    )



    prompt = build_generation_prompt(
        source,
        interview_context,
        writing_analysis_context,
        style_context,
        knowledge_context,
        privacy_context,
        request,
        request.previous_content,
        request.previous_violations,
    )



    try:

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
        )


        generated_post = response.text.strip()



    except Exception as e:


        raise HTTPException(
            status_code=500,
            detail=f"Gemini regeneration failed: {str(e)}",
        )




    privacy_result = check_privacy_guardrails(
        db,
        authenticated_account,
        generated_post,
    )



    return {

        "generated_post": generated_post,

        "platform": source["platform"],

        "privacy_decision": privacy_result["decision"],

        "violations": privacy_result["violations"],

    }





# =========================================================
# SAVE GENERATED POST
# =========================================================


def save_post_generation(
    db: Session,
    authenticated_account,
    request: SavePostGenerationRequest,
):


    current_user = resolve_application_user(
        db,
        authenticated_account,
    )



    # -----------------------------------------------------
    # FINAL PRIVACY CHECK
    #
    # Never trust frontend content.
    # User may edit generated content.
    # -----------------------------------------------------

    privacy_result = check_privacy_guardrails(
        db,
        authenticated_account,
        request.content,
    )



    if privacy_result["decision"] == "block":


        raise HTTPException(
            status_code=400,
            detail={
                "message": "Post cannot be saved because privacy rules were violated.",
                "violations": privacy_result["violations"],
            },
        )




    new_post = PostGeneration(

        user_id=current_user.id,

        source_type=request.source_type,

        source_id=request.source_id,

        content=request.content.strip(),

        platform=request.platform,

        privacy_status=privacy_result["decision"],

    )



    db.add(new_post)

    db.commit()

    db.refresh(new_post)



    return new_post

# =========================================================
# GET SAVED POST HISTORY
# =========================================================

def get_saved_post_generations(
    db,
    authenticated_account,
):
    """
    Returns all saved generated posts
    belonging to the logged-in user.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )


    posts = (
        db.query(PostGeneration)
        .filter(
            PostGeneration.user_id == current_user.id
        )
        .order_by(
            PostGeneration.created_at.desc()
        )
        .all()
    )


    return posts

def delete_saved_post(
    db,
    authenticated_account,
    post_id
):

    current_user = resolve_application_user(
        db,
        authenticated_account
    )


    post = (
        db.query(PostGeneration)
        .filter(
            PostGeneration.post_id==post_id,
            PostGeneration.user_id==current_user.id
        )
        .first()
    )


    if not post:

        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )


    db.delete(post)
    db.commit()


    return {
        "message":"Post deleted successfully"
    }