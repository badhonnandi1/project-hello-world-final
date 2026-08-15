from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user_profile_model import User
from app.models.style_preset_archetype_model import (
    ALLOWED_STYLE_ARCHETYPES,
    StylePresetArchetype,
)
from app.models.writing_style_preset_model import StylePreset
from app.schemas.writing_style_preset_schema import (
    StylePresetCreate,
    StylePresetPreviewRequest,
    StylePresetUpdate,
)


# =========================================================
# RULE-BASED WRITING STYLE DEFINITIONS
# =========================================================

STYLE_RULES = {
    "Analytical Leader": {
        "tone": "professional, analytical, and confident",
        "structure": "Use a clear claim followed by reasoning or evidence.",
        "language": "Use precise and thoughtful language.",
        "focus": "Emphasize insights, reasoning, decisions, and implications.",
    },

    "Educational Expert": {
        "tone": "clear, informative, and helpful",
        "structure": "Explain the main idea and then provide an understandable example.",
        "language": "Prefer simple language and explain complex ideas clearly.",
        "focus": "Teach the reader something useful.",
    },

    "Story-Driven Founder": {
        "tone": "personal, conversational, and engaging",
        "structure": "Use a beginning, situation or problem, insight, and conclusion.",
        "language": "Use natural and relatable language.",
        "focus": "Connect the topic to experience, struggle, discovery, or growth.",
    },

    "Concise Operator": {
        "tone": "direct, concise, and action-oriented",
        "structure": "Get to the main point quickly and avoid unnecessary explanation.",
        "language": "Use short sentences and strong verbs.",
        "focus": "Emphasize practical takeaways and clear actions.",
    },

    "Community Builder": {
        "tone": "warm, inclusive, and collaborative",
        "structure": "Present an idea and connect it to people, shared experiences, or discussion.",
        "language": "Use inclusive language such as we, our, and you when appropriate.",
        "focus": "Encourage connection, participation, and discussion.",
    },
}


# =========================================================
# RESOLVE APPLICATION USER
# =========================================================

def resolve_application_user(
    db: Session,
    authenticated_account,
):
    """
    Resolves the application-level User profile
    belonging to the authenticated account.
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
            status_code=status.HTTP_409_CONFLICT,
            detail="Your application user profile has not been created yet.",
        )

    return user_profile


# =========================================================
# VALIDATE ARCHETYPES
# =========================================================

def validate_archetypes(archetypes):
    """
    Makes sure every archetype is supported and that
    no archetype is submitted more than once.
    """

    allowed = set(ALLOWED_STYLE_ARCHETYPES)
    seen = set()

    for archetype_data in archetypes:

        archetype_name = archetype_data.archetype.strip()

        if archetype_name not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid archetype: {archetype_name}",
            )

        if archetype_name in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate archetype: {archetype_name}",
            )

        seen.add(archetype_name)


# =========================================================
# RULE-BASED PREVIEW GENERATOR
# =========================================================

def generate_rule_based_preview(
    topic: str,
    archetypes,
):
    """
    Generates a deterministic rule-based preview.

    The percentage of each archetype determines how strongly
    that archetype influences the preview.

    No AI model is used and nothing is saved to the database.
    """

    topic = topic.strip()

    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preview topic cannot be empty.",
        )

    validate_archetypes(archetypes)

    # ---------------------------------------------------------
    # Convert submitted archetypes into weighted style data.
    # ---------------------------------------------------------

    weighted_rules = []

    for item in archetypes:

        rules = STYLE_RULES[item.archetype]

        weighted_rules.append(
            {
                "archetype": item.archetype,
                "percentage": item.percentage,
                "rules": rules,
            }
        )

    # ---------------------------------------------------------
    # Sort strongest style first.
    # ---------------------------------------------------------

    weighted_rules.sort(
        key=lambda item: item["percentage"],
        reverse=True,
    )

    strongest = weighted_rules[0]

    strongest_name = strongest["archetype"]

    # ---------------------------------------------------------
    # Start with a topic-specific introduction.
    # ---------------------------------------------------------

    preview_parts = []

    preview_parts.append(
        f"{topic} is becoming increasingly important because "
        f"it is influencing how people think, work, and make decisions."
    )

    # ---------------------------------------------------------
    # Generate style influence based on percentage.
    #
    # 70%+  -> strong influence
    # 40-69 -> moderate influence
    # 20-39 -> light influence
    # below 20 -> very light influence
    # ---------------------------------------------------------

    for item in weighted_rules:

        name = item["archetype"]
        percentage = item["percentage"]

        # Ignore zero-percentage archetypes.
        if percentage <= 0:
            continue

        # -----------------------------------------------------
        # ANALYTICAL LEADER
        # -----------------------------------------------------

        if name == "Analytical Leader":

            if percentage >= 70:

                preview_parts.append(
                    f"A useful way to evaluate {topic} is to examine "
                    f"the underlying factors, available evidence, "
                    f"and the practical implications before drawing "
                    f"a conclusion."
                )

            elif percentage >= 40:

                preview_parts.append(
                    f"Looking at the evidence and underlying factors "
                    f"helps us understand the practical implications "
                    f"of {topic}."
                )

            else:

                preview_parts.append(
                    f"There are also important factors and implications "
                    f"worth considering when thinking about {topic}."
                )

        # -----------------------------------------------------
        # EDUCATIONAL EXPERT
        # -----------------------------------------------------

        elif name == "Educational Expert":

            if percentage >= 70:

                preview_parts.append(
                    f"In simple terms, {topic} can be understood by "
                    f"breaking the idea into its core concepts and "
                    f"looking at how those concepts work in practice."
                )

            elif percentage >= 40:

                preview_parts.append(
                    f"To understand {topic}, it helps to first look "
                    f"at the basic idea and then connect it to a "
                    f"real-world example."
                )

            else:

                preview_parts.append(
                    f"A clearer understanding of the fundamentals "
                    f"can also make {topic} easier to approach."
                )

        # -----------------------------------------------------
        # STORY-DRIVEN FOUNDER
        # -----------------------------------------------------

        elif name == "Story-Driven Founder":

            if percentage >= 70:

                preview_parts.append(
                    f"Think about the first time someone encounters "
                    f"{topic}. What initially looks like a simple "
                    f"challenge can quickly become a lesson about "
                    f"what works, what fails, and what needs to change."
                )

            elif percentage >= 40:

                preview_parts.append(
                    f"When people encounter {topic} in real life, "
                    f"the experience often reveals lessons that are "
                    f"difficult to see from theory alone."
                )

            else:

                preview_parts.append(
                    f"Real experiences with {topic} can reveal "
                    f"lessons that are easy to overlook."
                )

        # -----------------------------------------------------
        # CONCISE OPERATOR
        # -----------------------------------------------------

        elif name == "Concise Operator":

            if percentage >= 70:

                preview_parts.append(
                    f"The practical approach to {topic} is simple: "
                    f"understand the problem, identify what matters, "
                    f"and take focused action."
                )

            elif percentage >= 40:

                preview_parts.append(
                    f"The key is to focus on what matters most "
                    f"and turn that understanding into action."
                )

            else:

                preview_parts.append(
                    f"The main takeaway is to focus on the practical "
                    f"impact and act deliberately."
                )

        # -----------------------------------------------------
        # COMMUNITY BUILDER
        # -----------------------------------------------------

        elif name == "Community Builder":

            if percentage >= 70:

                preview_parts.append(
                    f"{topic} is not something we have to understand "
                    f"alone. Sharing experiences, perspectives, and "
                    f"lessons can help us build better approaches together."
                )

            elif percentage >= 40:

                preview_parts.append(
                    f"Looking at how people experience {topic} can "
                    f"create opportunities for shared learning and "
                    f"discussion."
                )

            else:

                preview_parts.append(
                    f"Different perspectives can also help us think "
                    f"about {topic} in a more complete way."
                )

    # ---------------------------------------------------------
    # Strongest archetype determines the final tone.
    # ---------------------------------------------------------

    closing_statements = {

        "Analytical Leader":
            "The strongest approach is to examine the evidence carefully "
            "and make decisions based on clear reasoning.",

        "Educational Expert":
            "The goal is to make the idea understandable enough "
            "that people can apply it confidently.",

        "Story-Driven Founder":
            "The real lesson often comes from the experience itself "
            "and what we choose to do next.",

        "Concise Operator":
            "Know the problem. Focus on what matters. Then act.",

        "Community Builder":
            "The best results often come when people learn, contribute, "
            "and move forward together.",
    }

    preview_parts.append(
        closing_statements[strongest_name]
    )

    # ---------------------------------------------------------
    # Join everything into the final preview.
    # ---------------------------------------------------------

    return " ".join(preview_parts)


# =========================================================
# PREVIEW
# =========================================================

def generate_style_preset_preview(
    preview_data: StylePresetPreviewRequest,
):
    """
    Generates a temporary preview.

    Nothing is saved to the database.
    """

    validate_archetypes(
        preview_data.archetypes
    )

    preview_content = generate_rule_based_preview(
        topic=preview_data.topic,
        archetypes=preview_data.archetypes,
    )

    return {
        "topic": preview_data.topic.strip(),
        "preview_content": preview_content,
        "archetypes": preview_data.archetypes,
    }


# =========================================================
# CREATE
# =========================================================

def create_style_preset(
    db: Session,
    authenticated_account,
    preset_data: StylePresetCreate,
):
    """
    Permanently saves a Writing Style Preset.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    validate_archetypes(
        preset_data.archetypes
    )

    if not preset_data.preset_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preset name cannot be empty.",
        )

    new_preset = StylePreset(
        user_id=current_user.id,
        preset_name=preset_data.preset_name.strip(),
        preview_topic=(
            preset_data.preview_topic.strip()
            if preset_data.preview_topic
            else None
        ),
        preview_content=(
            preset_data.preview_content.strip()
            if preset_data.preview_content
            else None
        ),
    )

    db.add(new_preset)

    for archetype_data in preset_data.archetypes:

        new_archetype = StylePresetArchetype(
            archetype=archetype_data.archetype,
            percentage=archetype_data.percentage,
        )

        new_preset.archetypes.append(
            new_archetype
        )

    db.commit()
    db.refresh(new_preset)

    return new_preset


# =========================================================
# GET ALL
# =========================================================

def list_style_presets(
    db: Session,
    authenticated_account,
):
    """
    Returns all saved presets belonging to the logged-in user.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    return (
        db.query(StylePreset)
        .filter(
            StylePreset.user_id == current_user.id
        )
        .order_by(
            StylePreset.created_at.desc()
        )
        .all()
    )


# =========================================================
# GET ONE
# =========================================================

def get_style_preset(
    db: Session,
    authenticated_account,
    preset_id,
):
    """
    Returns one preset belonging to the logged-in user.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Writing Style Preset not found.",
        )

    return preset


# =========================================================
# UPDATE
# =========================================================

def update_style_preset(
    db: Session,
    authenticated_account,
    preset_id,
    preset_data: StylePresetUpdate,
):
    """
    Updates an existing preset.

    If archetypes are supplied, the old archetypes are replaced
    with the new set.
    """

    preset = get_style_preset(
        db,
        authenticated_account,
        preset_id,
    )

    if preset_data.preset_name is not None:

        if not preset_data.preset_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Preset name cannot be empty.",
            )

        preset.preset_name = (
            preset_data.preset_name.strip()
        )

    if preset_data.preview_topic is not None:

        preset.preview_topic = (
            preset_data.preview_topic.strip()
            if preset_data.preview_topic.strip()
            else None
        )

    if preset_data.preview_content is not None:

        preset.preview_content = (
            preset_data.preview_content.strip()
            if preset_data.preview_content.strip()
            else None
        )

    # -----------------------------------------------------
    # Replace archetypes when provided.
    # -----------------------------------------------------

    if preset_data.archetypes is not None:

        validate_archetypes(
            preset_data.archetypes
        )

        # Remove previous archetypes.
        #preset.archetypes.clear()
        for old_archetype in list(preset.archetypes):
              db.delete(old_archetype)
         # Force DELETE to happen before INSERT.
        db.flush()

        # Add new archetypes.
        for archetype_data in preset_data.archetypes:

            new_archetype = StylePresetArchetype(
                preset_id=preset.preset_id,
                archetype=archetype_data.archetype,
                percentage=archetype_data.percentage,
            )

            #preset.archetypes.append(
            #    new_archetype
            #)
            db.add(new_archetype)

    #db.commit()
    #db.refresh(preset)

    #return preset
    try:
        db.commit()
        db.refresh(preset)

    except Exception:
        db.rollback()
        raise

    return preset

# =========================================================
# DELETE
# =========================================================

def delete_style_preset(
    db: Session,
    authenticated_account,
    preset_id,
):
    """
    Deletes a preset belonging to the logged-in user.

    Its archetype rows are automatically deleted because
    the model uses cascade="all, delete-orphan".
    """

    preset = get_style_preset(
        db,
        authenticated_account,
        preset_id,
    )

    db.delete(preset)
    db.commit()

    return {
        "message": "Writing Style Preset deleted successfully."
    }