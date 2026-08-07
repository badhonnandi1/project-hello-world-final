from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.writing_analysis_model import WritingAnalysis
from app.models.writing_sample_model import WritingSample
from app.schemas.writing_sample_schema import WritingSampleAnalyzeRequest
from app.services.text_analyzer import analyze_text, count_words

MIN_WORDS = 150
MAX_WORDS = 1000

def analyze_writing_sample(db: Session, user_auth, request: WritingSampleAnalyzeRequest):
    word_count = count_words(request.content_text)
    if word_count < MIN_WORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Writing sample is too short ({word_count} words). Minimum is {MIN_WORDS} words."
        )
    if word_count > MAX_WORDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Writing sample is too long ({word_count} words). Maximum is {MAX_WORDS} words."
        )

 
    # We grab the actual User profile object (which has the UUID) from the UserAuth object
    user_profile = user_auth.user_profile
    if not user_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="User profile not found. Please ensure your profile is set up."
        )

    result = analyze_text(request.content_text)

    # Now we use user_profile.id (which is the correct UUID)
    sample = WritingSample(
        user_id=user_profile.id,  
        content_text=request.content_text, 
        source="paste"
    )
    db.add(sample)
    db.flush() 

    analysis = WritingAnalysis(
        sample_id=sample.sample_id, 
        hook_style=result["hook_style"], 
        tone=result["tone"],
        vocabulary_level=result["vocabulary_level"], 
        avg_sentence_length=result["avg_sentence_length"],
        paragraph_structure=result["paragraph_structure"], 
        emoji_usage=result["emoji_usage"],
        storytelling_style=result["storytelling_style"], 
        cta_pattern=result["cta_pattern"],
        analysis_profile=result["analysis_profile"]
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis