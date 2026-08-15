# ChatGPT Layer Tweak Store

The in-app Tweak Store reads the live reviewed registry from:

`https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/store/index.json`

ChatGPT Layer fetches this URL when the store page is opened or refreshed.
The registry can change without a loader update.

Registry entries must pin installs to `approvedCommitSha`. ChatGPT Layer
downloads from GitHub's commit archive URL for that SHA and validates the
downloaded `manifest.json` before replacing an installed tweak.

Publishing flow:

1. Open Settings -> Tweak Store -> Publish Tweak.
2. Enter a GitHub repo.
3. ChatGPT Layer resolves the default-branch commit SHA and opens a review issue.
4. An admin reviews that exact commit, then adds or updates `store/index.json`
   on `main` with `approvedCommitSha` set to that full SHA.
