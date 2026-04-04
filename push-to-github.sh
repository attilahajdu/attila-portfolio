#!/usr/bin/env bash
# Run this on your Mac after: brew install gh && gh auth login
# Or create an empty repo on github.com first, then set ORIGIN below.

set -e
cd "$(dirname "$0")"

REPO_NAME="attila-hajdu-portfolio"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "Creating repo and pushing with GitHub CLI..."
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
  echo "Done: https://github.com/$(gh api user -q .login)/$REPO_NAME"
  exit 0
fi

echo "GitHub CLI not installed or not logged in."
echo "Option A — GitHub CLI:"
echo "  brew install gh"
echo "  gh auth login"
echo "  ./push-to-github.sh"
echo ""
echo "Option B — manual:"
echo "  1. Create an empty repo named $REPO_NAME on https://github.com/new (no README)"
echo "  2. git remote add origin https://github.com/YOUR_USERNAME/$REPO_NAME.git"
echo "  3. git push -u origin main"
exit 1
