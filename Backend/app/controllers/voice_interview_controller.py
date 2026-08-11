import os
import subprocess
import tempfile

from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile, status
from google import genai
from sqlalchemy.orm import Session

from app.models.voice_interview_model import VoiceInterview
from app.models.user_profile_model import User
from app.schemas.voice_interview_schema import VoiceInterviewCreate


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)


def transcribe_voice(audio_file: UploadFile) -> str:
    """
    Receives the temporary WebM audio from the frontend,
    converts it to WAV using FFmpeg,
    sends the WAV to Gemini,
    and returns the transcript.

    The audio files are temporary and are deleted afterwards.
    """

    webm_path = None
    wav_path = None
    uploaded_gemini_file = None

    try:
        # ---------------------------------------------------------
        # 1. Save the uploaded WebM temporarily
        # ---------------------------------------------------------
        with tempfile.NamedTemporaryFile(
            suffix=".webm",
            delete=False
        ) as temp_webm:

            webm_path = temp_webm.name

            while True:
                chunk = audio_file.file.read(1024 * 1024)

                if not chunk:
                    break

                temp_webm.write(chunk)

        # ---------------------------------------------------------
        # 2. Create a temporary WAV file
        # ---------------------------------------------------------
        with tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False
        ) as temp_wav:

            wav_path = temp_wav.name

        # ---------------------------------------------------------
        # 3. Convert WebM → WAV using FFmpeg
        # ---------------------------------------------------------
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                webm_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                wav_path,
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail="Audio conversion failed."
            )

        # ---------------------------------------------------------
        # 4. Upload WAV to Gemini
        # ---------------------------------------------------------
        uploaded_gemini_file = client.files.upload(
            file=wav_path
        )

        # ---------------------------------------------------------
        # 5. Ask Gemini to transcribe
        # ---------------------------------------------------------
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[
                uploaded_gemini_file,
                (
                    "Transcribe this audio exactly. "
                    "Return only the spoken words as a transcript. "
                    "Do not summarize or describe the audio."
                ),
            ],
        )

        transcript = response.text.strip()

        if not transcript:
            raise HTTPException(
                status_code=500,
                detail="Gemini returned an empty transcript."
            )

        return transcript

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Speech transcription failed: {str(e)}"
        )

    finally:
        # ---------------------------------------------------------
        # 6. Delete our temporary local files
        # ---------------------------------------------------------
        if webm_path and os.path.exists(webm_path):
            os.remove(webm_path)

        if wav_path and os.path.exists(wav_path):
            os.remove(wav_path)

def resolve_application_user(db, authenticated_account):
    """
    Resolves the UUID-based application user profile
    for the logged-in authentication account.
    """

    user_profile = (
        db.query(User)
        .filter(User.user_auth_id == authenticated_account.id)
        .first()
    )

    if not user_profile:
        raise HTTPException(
            status_code=409,
            detail="Your application user profile has not been created yet.",
        )

    return user_profile


def create_voice_interview(db, authenticated_account, interview_data):
    """
    Saves the user's final confirmed transcript
    as a Voice Interview belonging to the logged-in user.
    """

    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    # Make sure the transcript is not empty.
    if not interview_data.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Transcript cannot be empty.",
        )

    new_interview = VoiceInterview(
        user_id=current_user.id,
        transcript=interview_data.transcript.strip(),
    )

    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)

    return new_interview



# This function finds one Voice Interview belonging to the logged-in user.
def get_voice_interview(db, authenticated_account, interview_id):
    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    interview = (
        db.query(VoiceInterview)
        .filter(
            VoiceInterview.interview_id == interview_id,
            VoiceInterview.user_id == current_user.id,
        )
        .first()
    )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice interview not found.",
        )

    return interview


# This function updates the transcript of an existing Voice Interview.
def update_voice_interview(
    db,
    authenticated_account,
    interview_id,
    interview_data,
):
    interview = get_voice_interview(
        db,
        authenticated_account,
        interview_id,
    )

    # Make sure the edited transcript is not empty.
    if not interview_data.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript cannot be empty.",
        )

    # Update the transcript.
    interview.transcript = interview_data.transcript.strip()

    # Save the change.
    db.commit()

    # Load the updated database values.
    db.refresh(interview)

    return interview

# This function returns the latest Voice Interview
# belonging to the logged-in user.
def get_latest_voice_interview(db, authenticated_account):
    current_user = resolve_application_user(
        db,
        authenticated_account,
    )

    latest_interview = (
        db.query(VoiceInterview)
        .filter(
            VoiceInterview.user_id == current_user.id,
        )
        .order_by(
            VoiceInterview.created_at.desc()
        )
        .first()
    )

    # A user may not have recorded any interview yet.
    if not latest_interview:
        return None

    return latest_interview