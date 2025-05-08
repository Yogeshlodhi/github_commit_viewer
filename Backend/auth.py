from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
import os
import httpx
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")


@router.get("/login")
def github_login():
    redirect_uri = "http://localhost:8000/auth/callback"
    # redirect_uri = "https://github-commit-viewer.onrender.com/auth/callback"
    github_oauth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={CLIENT_ID}&redirect_uri={redirect_uri}&scope=repo"
    )
    return RedirectResponse(github_oauth_url)

@router.get("/callback")
async def github_callback(code: str):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "code": code,
            },
        )
        token_json = token_res.json()
        access_token = token_json.get("access_token")

    if access_token:
        # Redirect to React frontend with token in query params
        return RedirectResponse(f"http://localhost:5173?token={access_token}")
    return {"error": "Authentication failed"}


@router.get("/repos")
async def get_repos(token: str, page: int = 1, per_page: int = 6):
    headers = {"Authorization": f"token {token}"}
    async with httpx.AsyncClient() as client:
        # Get all repos first to calculate stats
        all_repos_resp = await client.get(
            "https://api.github.com/user/repos?type=owner&per_page=100", 
            headers=headers
        )
        all_repos = all_repos_resp.json()
        
        # Calculate statistics
        total = len(all_repos)
        public = sum(1 for repo in all_repos if not repo["private"])
        private = sum(1 for repo in all_repos if repo["private"])
        
        # Calculate pagination
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

@router.get("/commits")
async def get_commits(token: str, owner: str, repo: str):
    headers = {"Authorization": f"token {token}"}
    async with httpx.AsyncClient() as client:
        commits_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits", headers=headers
        )
        return commits_resp.json()

@router.get("/user")
async def get_user(token: str):
    headers = {"Authorization": f"token {token}"}
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers=headers
        )
        return user_resp.json()