# GitHub OAuth Integration and Commit Viewer

This project allows users to log in via GitHub, fetch their repositories, and display commit history for each repository. The backend is built with FastAPI, and the frontend is built with React.

## Features:
- GitHub OAuth authentication
- Fetch and display user-owned repositories
- View commit history for each repository


## Branches:
   - Main Branch => Uses the OAuth
   - Github-App => Uses the Github Apps approach
   - combined => Uses the combined approach

## Prerequisites:
- Python 3.8+
- Node.js 14+
- GitHub account
- A GitHub OAuth App (see GitHub OAuth configuration)

## Setup and Installation

### Backend Setup (FastAPI)

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/github-oauth-commit-viewer.git
   cd github-oauth-commit-viewer/backend


2. Create a virtual environment and activate it:

   ```bash
    python3 -m venv venv
    source venv/bin/activate   # For macOS/Linux
    venv\Scripts\activate      # For Windows

3. Install the backend dependencies:

   ```bash
   pip install -r requirements.txt

4. Set up the environment variables for GitHub OAuth. Create a .env file in the backend folder with the following contents:
   
   ```bash
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   GITHUB_REDIRECT_URI=http://localhost:8000/auth/callback

5. Run the FastAPI backend:
   
   ```bash
   uvicorn main:app --reload


The backend will be available at http://localhost:8000.

Frontend Setup (React)

1. Navigate to the frontend directory:

   ```bash
   cd ../frontend

2. Install the frontend dependencies:

   ```bash
   npm install

3. Create a .env file in the frontend folder and add the following:
   ```bash
   REACT_APP_BACKEND_URL=http://localhost:8000

4. Start the React development server:

   ```bash
   npm run dev

The frontend will be available at http://localhost:5173.

GitHub OAuth Configuration Steps

1. Go to GitHub Developer Settings.

2. Click on New OAuth App to create a new OAuth application.

3. Fill in the following fields:

    * Application name: Choose a name for your app.
    * Homepage URL: http://localhost:5173 (for local development).
    * Authorization callback URL: http://localhost:8000/auth/callback.

4. Once the OAuth app is created, note down the Client ID and Client Secret.

5. Add these values to your .env files as mentioned in the setup instructions.

Application Usage Guide
1. Open the frontend URL in your browser: http://localhost:5173.

2. Click on the Login with GitHub button to authenticate using your GitHub account.

3. Once logged in, the app will display your repositories. Click on any repository to view the commit history.

4. The commit history will show the commits made to that repository, including the commit message, author, and timestamp.