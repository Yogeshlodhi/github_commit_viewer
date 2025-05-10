from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import os
import httpx
import time
import jwt
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

router = APIRouter()

CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
PRIVATE_KEY = os.getenv("GITHUB_PRIVATE_KEY", "").replace("\\n", "\n")
APP_ID = os.getenv("GITHUB_APP_ID")
FRONTEND_URL = "http://localhost:5173"
APP_NAME = "git-commit-viewer"  # GitHub App name

def generate_jwt():
    payload = {
        "iat": int(time.time()) - 60,
        "exp": int(time.time()) + 600,
        "iss": APP_ID
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm="RS256")

async def get_installation_token(installation_id: int):
    jwt_token = generate_jwt()
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json"
    }
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers)

    if response.status_code == 201:
        return response.json().get("token")
    else:
        raise Exception(f"GitHub error {response.status_code}: {response.text}")

# Temporary in-memory store, use Redis/DB in production
user_tokens = {}

@router.get("/login")
async def github_login():
    # GitHub OAuth authorization URL
    github_oauth_url = "https://github.com/login/oauth/authorize"
    redirect_uri = "http://localhost:8000/auth/callback"  # The redirect URL after GitHub login
    scope = "read:user repo"  # Define the scope (access permissions)
    
    # Construct the full OAuth URL
    params = {
        "client_id": CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "state": "frontend_redirect",  # A state value to prevent CSRF attacks
    }
    oauth_url = f"{github_oauth_url}?{urllib.parse.urlencode(params)}"
    
    # Redirect the user to GitHub OAuth
    return RedirectResponse(oauth_url)

@router.get("/callback")
async def github_callback(code: str = "", state: str = ""):
    try:
        # Exchange the code for an access token using OAuth
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "code": code
                }
            )
        
        # Check if we successfully received an access token
        token_data = token_resp.json()
        print("Token Response:", token_data)  # Add this
        user_token = token_data.get("access_token")
        if not user_token:
            raise Exception("Could not fetch user access token")

        # Save user_token in memory using a generated state key
        user_tokens[state] = user_token  # Save the user token for later use

        # Redirect user to the GitHub App installation URL
        return RedirectResponse(
            f"https://github.com/apps/{APP_NAME}/installations/new"
            f"?state={state}&redirect_url=http://localhost:8000/auth/post_install"
        )

    except Exception as e:
        return {"error": str(e)}


@router.get("/post_install")
async def post_install(state: str = "", installation_id: int = 0, setup_action: str = ""):
    try:
        user_token = user_tokens.get(state)
        if not user_token:
            raise Exception("Missing user token for state")

        installation_token = await get_installation_token(installation_id)

        # Redirect to frontend with both tokens
        return RedirectResponse(
            f"{FRONTEND_URL}?user_token={user_token}&installation_token={installation_token}"
        )

    except Exception as e:
        return {"error": str(e)}
