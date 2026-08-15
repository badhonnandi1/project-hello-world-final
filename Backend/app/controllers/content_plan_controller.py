from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.content_plan_model import ContentPlan
from app.schemas.content_plan_schema import ContentPlanCreateRequest, ContentPlanResponse
from app.models.user_model import UserAuth

def create_content_plan(db: Session, user_auth, request: ContentPlanCreateRequest):
    if not user_auth.user_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="User profile not found. Please ensure your profile is set up."
        )
    user_profile = user_auth.user_profile
    content_plan = ContentPlan(
        user_id=user_profile.id,
        title=request.title,
        content_text=request.content_text,
        platform=request.platform,
        scheduled_for=request.scheduled_for
        )
    db.add(content_plan)
    db.commit()
    db.refresh(content_plan)
    return content_plan

def get_my_content_plans(db: Session, user_auth, start_date=None, end_date=None):
    if not user_auth.user_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User profile not found. Please ensure your profile is set up."
        )
    user_profile = user_auth.user_profile

    query = db.query(ContentPlan).filter(
        ContentPlan.user_id == user_profile.id
    )
    

    if start_date:
        query = query.filter(ContentPlan.scheduled_for >= start_date)
    if end_date:
        query = query.filter(ContentPlan.scheduled_for <= end_date)
        

    return query.order_by(ContentPlan.scheduled_for).all()

def get_my_content_plan(db:Session, user_auth,content_plan_id):
        if not user_auth.user_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="User profile not found. Please ensure your profile is set up."
            )
        user_profile = user_auth.user_profile
        content_plan = db.query(ContentPlan).filter(
            ContentPlan.content_plan_id == content_plan_id,
            ContentPlan.user_id ==user_profile.id
        ).first()
        if not content_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content plan not found."
            )
        return content_plan
    
def update_content_plan(db: Session, user_auth, content_plan_id, request: ContentPlanCreateRequest):
        if not user_auth.user_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="User profile not found. Please ensure your profile is set up."
            )
        user_profile = user_auth.user_profile
        content_plan = db.query(ContentPlan).filter(
            ContentPlan.content_plan_id == content_plan_id,
            ContentPlan.user_id == user_profile.id
        ).first()
        if not content_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content plan not found."
            )
        content_plan.title = request.title
        content_plan.content_text = request.content_text
        content_plan.platform = request.platform
        content_plan.scheduled_for = request.scheduled_for
        db.commit()
        db.refresh(content_plan)
        return content_plan

def delete_content_plan(db: Session, user_auth, content_plan_id):
        if not user_auth.user_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="User profile not found. Please ensure your profile is set up."
            )
        user_profile = user_auth.user_profile
        content_plan = db.query(ContentPlan).filter(
            ContentPlan.content_plan_id == content_plan_id,
            ContentPlan.user_id == user_profile.id
        ).first()
        if not content_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content plan not found."
            )
        db.delete(content_plan)
        db.commit()
        return {"detail": "Content plan deleted successfully."}