from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import os
import httpx
import time
import jwt
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
PRIVATE_KEY = os.getenv("GITHUB_PRIVATE_KEY", "").replace("\\n", "\n")
APP_ID = os.getenv("GITHUB_APP_ID")
FRONTEND_URL = "http://localhost:5173"

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

@router.get("/login")
def github_login():
    app_name = "git-commit-viewer"
    return RedirectResponse(
        f"https://github.com/apps/{app_name}/installations/new?state=frontend_redirect&redirect_url={FRONTEND_URL}/callback"
    )

@router.get("/callback")
async def github_callback(code: str = "", state: str = ""):
    try:
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
        token_data = token_resp.json()
        user_access_token = token_data.get("access_token")
        if not user_access_token:
            raise Exception("Could not fetch user access token")

        headers = {"Authorization": f"token {user_access_token}", "Accept": "application/vnd.github+json"}
        async with httpx.AsyncClient() as client:
            installs_resp = await client.get("https://api.github.com/user/installations", headers=headers)

        installs = installs_resp.json()
        if installs.get("total_count", 0) == 0:
            raise Exception("No installations found for user")

        installation_id = installs["installations"][0]["id"]
        access_token = await get_installation_token(installation_id)
        return RedirectResponse(f"{FRONTEND_URL}?token={access_token}")

    except Exception as e:
        print("Error in /callback:", str(e))
        return {"error": str(e)}

@router.get("/repos")
async def get_repos(token: str, page: int = 1, per_page: int = 6):
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/installation/repositories?per_page=100",
            headers=headers
        )

    if response.status_code != 200:
        raise Exception(f"GitHub API error: {response.status_code} {response.text}")

    all_repos = response.json().get("repositories", [])
    total = len(all_repos)
    public = sum(1 for repo in all_repos if not repo["private"])
    private = total - public
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_repos = all_repos[start_idx:end_idx]

    return {
        "repos": paginated_repos,
        "total": total,
        "public": public,
        "private": private,
        "currentPage": page,
        "totalPages": (total + per_page - 1) // per_page
    }


@router.get("/branches")
async def get_branches(token: str, owner: str, repo: str):
    headers = {"Authorization": f"token {token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/branches",
            headers=headers
        )
        return response.json()

@router.get("/commits")
async def get_commits(token: str, owner: str, repo: str, branch: str = "main"):
    headers = {"Authorization": f"token {token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits?sha={branch}",
            headers=headers
        )
        return response.json()

@router.get("/user")
async def get_user(token: str):
    headers = {"Authorization": f"token {token}"}
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.github.com/user", headers=headers)
        return response.json()