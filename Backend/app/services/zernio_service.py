import os
import requests
from typing import Any, Dict, List
from fastapi import HTTPException, status

ZERNIO_BASE_URL = os.getenv("ZERNIO_BASE_URL", "https://zernio.com/api/v1")


def get_headers():
    api_key = os.getenv("ZERNIO_API_KEY", "")
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def get_connected_account_details() -> List[Dict[str, Any]]:
    """
    Fetches connected social media account metadata from Zernio REST API.
    Calls GET https://zernio.com/api/v1/accounts (or GET /profiles).
    Returns a clean list of dicts:
    [{"platform": "linkedin", "display_name": "John Doe", "username": "johndoe", "account_id": "..."}, ...]
    """
    api_key = os.getenv("ZERNIO_API_KEY")
    if not api_key:
        return []

    accounts = []
    try:
        # 1. Primary: GET https://zernio.com/api/v1/accounts
        response = requests.get(
            f"{ZERNIO_BASE_URL}/accounts",
            headers=get_headers(),
            timeout=10,
        )
        if not response.ok:
            # 2. Fallback: GET https://zernio.com/api/v1/profiles
            response = requests.get(
                f"{ZERNIO_BASE_URL}/profiles",
                headers=get_headers(),
                timeout=10,
            )

        if not response.ok:
            return []

        data = response.json()
        raw_items = []

        if isinstance(data, list):
            raw_items = data
        elif isinstance(data, dict):
            raw_items = (
                data.get("accounts")
                or data.get("profiles")
                or data.get("data")
                or data.get("connected")
                or []
            )
            if isinstance(raw_items, dict):
                temp = []
                for k, v in raw_items.items():
                    if isinstance(v, dict):
                        v["platform"] = v.get("platform", k)
                        temp.append(v)
                    else:
                        temp.append({"platform": k, "display_name": str(v)})
                raw_items = temp

        for item in raw_items:
            if isinstance(item, dict):
                platform = str(
                    item.get("platform")
                    or item.get("type")
                    or item.get("name")
                    or "social"
                ).lower()
                display_name = (
                    item.get("display_name")
                    or item.get("name")
                    or item.get("title")
                    or item.get("account_name")
                    or f"{platform.capitalize()} Profile"
                )
                username = (
                    item.get("username")
                    or item.get("handle")
                    or item.get("user")
                    or item.get("screen_name")
                    or f"@{display_name.lower().replace(' ', '')}"
                )
                acc_id = (
                    item.get("_id")
                    or item.get("id")
                    or item.get("accountId")
                    or item.get("account_id")
                    or f"zernio_{platform}_id"
                )

                accounts.append({
                    "platform": platform,
                    "display_name": display_name,
                    "username": username,
                    "account_id": str(acc_id),
                })

        return accounts
    except requests.exceptions.RequestException:
        return []


def check_connected_platforms() -> bool:
    """
    Checks whether the user has connected profiles to Zernio.
    """
    details = get_connected_account_details()
    if details:
        return True

    api_key = os.getenv("ZERNIO_API_KEY")
    if not api_key:
        return False

    try:
        response = requests.get(
            f"{ZERNIO_BASE_URL}/user",
            headers=get_headers(),
            timeout=10,
        )
        return response.ok
    except requests.exceptions.RequestException:
        return False


def publish_to_socials(text_content: str, target_platform: str = "linkedin", user_accounts: List[Any] = None):
    """
    Publishes a post exclusively to the target_platform (e.g., "linkedin" or "instagram").
    Dynamically fetches real account IDs from GET https://zernio.com/api/v1/accounts.
    Prints and raises full Zernio JSON error if non-OK status occurs.
    """
    target = (target_platform or "linkedin").lower().strip()
    api_key = os.getenv("ZERNIO_API_KEY")

    matched_account_id = None

    # 1. Try matching with live Zernio account details
    connected_details = get_connected_account_details()
    for acc in connected_details:
        if acc.get("platform", "").lower() == target:
            matched_account_id = acc.get("account_id") or acc.get("_id") or acc.get("id")
            break

    # 2. Try matching with passed user_accounts (from DB or mock)
    if not matched_account_id and user_accounts:
        for acc in user_accounts:
            plat = getattr(acc, "platform", None) or (acc.get("platform") if isinstance(acc, dict) else str(acc))
            if plat and plat.lower().strip() == target:
                matched_account_id = (
                    getattr(acc, "zernio_account_id", None)
                    or (acc.get("zernio_account_id") if isinstance(acc, dict) else f"mock_{target}_id")
                )
                break

    # 3. Handle missing account for specific target platform
    if not matched_account_id:
        print(f"No connected account found for target platform: {target}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No connected account found for {target}"
        )

    # 4. Build platforms array with ONLY the intended account
    platforms = [
        {
            "platform": target,
            "accountId": matched_account_id
        }
    ]

    payload = {
        "content": text_content,
        "platforms": platforms,
        "publishNow": True
    }

    if not api_key:
        print("Warning: ZERNIO_API_KEY environment variable is not set.")

    try:
        response = requests.post(
            f"{ZERNIO_BASE_URL}/posts",
            headers=get_headers(),
            json=payload,
            timeout=15
        )
        if not response.ok:
            print(f"Zernio Full Error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zernio API error: {response.text}"
            )
        return response.json() if response.content else {"status": "success"}
    except requests.exceptions.RequestException as e:
        print(f"Zernio Exception: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Zernio API request failed: {str(e)}"
        )


def publish_post(text_content: str, social_accounts: List[Any] = None):
    """
    Backwards-compatible wrapper. Publishes to the platforms of the passed social_accounts.
    """
    if not social_accounts:
        return publish_to_socials(text_content, "linkedin")

    results = []
    for acc in social_accounts:
        plat = getattr(acc, "platform", None) or (acc.get("platform") if isinstance(acc, dict) else str(acc))
        res = publish_to_socials(text_content, plat, user_accounts=social_accounts)
        results.append(res)
    return results[0] if results else {"status": "success"}
