import json
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

import certifi
from fastapi import HTTPException, status
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.schemas.newsletter_schema import GeneratedNewsletterContent


GENERATION_CONFIGURATION_MESSAGE = (
    "Newsletter generation is not configured. Add GEMINI_API_KEY and restart the backend."
)
GENERATION_PROVIDER_MESSAGE = "Newsletter generation is temporarily unavailable. Please try again."
DELIVERY_CONFIGURATION_MESSAGE = "Newsletter email delivery is not configured."
DELIVERY_PROVIDER_MESSAGE = "Newsletter email delivery failed. No delivery completion was recorded."
NEWSLETTER_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "subject": {"type": "string"},
        "body": {"type": "string"},
    },
    "required": ["subject", "body"],
}


# This function asks Gemini for a strictly validated plain-text subject and body.
def generate_newsletter_content(title, source_content):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=GENERATION_CONFIGURATION_MESSAGE,
        )

    model_name = os.getenv("GEMINI_MODEL", "").strip() or "gemini-3.5-flash-lite"

    prompt = json.dumps(
        {
            "newsletter_title": title,
            "source_content": source_content,
        }
    )
    config = types.GenerateContentConfig(
        system_instruction=(
            "You are the newsletter editor for GhostWriter AI. Return exactly one JSON object "
            "with the keys subject and body. Produce a concise email subject and a polished "
            "plain-text newsletter body. Ground every factual claim only in newsletter_title "
            "and source_content. Do not add facts, quotes, statistics, names, events, or claims "
            "that are not present in the source. Do not use HTML."
        ),
        response_mime_type="application/json",
        # Gemini accepts only a subset of JSON Schema. Keep strict Pydantic
        # validation after generation without sending additionalProperties.
        response_schema=NEWSLETTER_RESPONSE_SCHEMA,
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=config,
        )

        if not response or not response.text:
            raise ValueError("The provider returned no newsletter content.")

        return GeneratedNewsletterContent.model_validate_json(response.text)
    except (ValidationError, ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Newsletter generation returned an unexpected format. Please try again.",
        )
    except errors.ClientError as provider_error:
        provider_status = getattr(provider_error, "code", None)
        if provider_status in {401, 403}:
            detail = "The Gemini API key was rejected. Check GEMINI_API_KEY and restart the backend."
        elif provider_status == 404:
            detail = "The configured Gemini model is unavailable. Check GEMINI_MODEL and restart the backend."
        elif provider_status == 429:
            detail = "The Gemini API quota has been reached. Please try again later."
        else:
            detail = GENERATION_PROVIDER_MESSAGE

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=GENERATION_PROVIDER_MESSAGE,
        )


def read_smtp_configuration():
    host = os.getenv("SMTP_HOST", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "GhostWriter AI").strip() or "GhostWriter AI"
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")

    # Google displays App Passwords in four groups. Ignore those display spaces
    # when Gmail is the configured SMTP provider.
    if host.lower() == "smtp.gmail.com":
        password = "".join(password.split())

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        port = 0

    tls_value = os.getenv("SMTP_USE_TLS", "true").strip().lower()
    if tls_value not in {"true", "false", "1", "0", "yes", "no", "on", "off"}:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=DELIVERY_CONFIGURATION_MESSAGE,
        )

    if (
        not host
        or not from_email
        or port < 1
        or port > 65535
        or (username and not password)
        or (password and not username)
        or "\n" in from_email
        or "\r" in from_email
        or "\n" in from_name
        or "\r" in from_name
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=DELIVERY_CONFIGURATION_MESSAGE,
        )

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "from_name": from_name,
        "use_tls": tls_value in {"true", "1", "yes", "on"},
    }


def build_email_message(configuration, recipient, subject, body):
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr(
        (configuration["from_name"], configuration["from_email"])
    )
    message["To"] = recipient
    message.set_content(body, subtype="plain", charset="utf-8")
    return message


# This function sends one plain-text message per unique recipient without logging addresses.
def deliver_newsletter(subject, body, recipient_emails):
    recipients_by_normalized_email = {}
    for email_address in recipient_emails:
        cleaned_email = (email_address or "").strip()
        if cleaned_email:
            recipients_by_normalized_email.setdefault(cleaned_email.lower(), cleaned_email)

    recipients = list(recipients_by_normalized_email.values())
    if not recipients:
        return 0

    configuration = read_smtp_configuration()

    try:
        with smtplib.SMTP(
            configuration["host"],
            configuration["port"],
            timeout=30,
        ) as smtp_connection:
            smtp_connection.ehlo()
            if configuration["use_tls"]:
                tls_context = ssl.create_default_context(cafile=certifi.where())
                smtp_connection.starttls(context=tls_context)
                smtp_connection.ehlo()

            if configuration["username"]:
                smtp_connection.login(
                    configuration["username"],
                    configuration["password"],
                )

            for recipient in recipients:
                smtp_connection.send_message(
                    build_email_message(configuration, recipient, subject, body)
                )
    except (OSError, smtplib.SMTPException, ValueError):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=DELIVERY_PROVIDER_MESSAGE,
        )

    return len(recipients)
