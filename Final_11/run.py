"""Launch the Smart Forensic Security System.

Two modes:
    python run.py                          # PRODUCTION: fetches cameras from backend API
    python run.py --local                  # LOCAL: webcam (default device 0)
    python run.py --local 0 video.mp4     # LOCAL: webcam + video file
"""
import sys
from src.main import run

if __name__ == "__main__":
    args = sys.argv[1:]

    if "--local" in args:
        args.remove("--local")
        # Local mode: use provided sources or default webcam
        sources = []
        for src in args:
            sources.append(int(src) if src.isdigit() else src)
        if not sources:
            sources = [0]  # default webcam
        run(mode="local", local_sources=sources)
    else:
        # Production mode: fetch cameras from backend
        run(mode="production")
