"""Vercel serverless entrypoint.

Vercel's Python runtime detects the ASGI `app` object and serves it as a
serverless function. All /api/* requests are rewritten here (see vercel.json);
static frontend files are served by Vercel's CDN from the Vite build, so the
dist/ catch-all in backend/main.py never activates (dist/ is absent in the
function bundle).
"""
import os
import sys

# Make the repo root importable so `backend` resolves regardless of cwd
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app  # noqa: E402,F401
