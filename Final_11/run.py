"""Launch the Smart Forensic Security System.

Usage:
    python run.py                          # fetches cameras from backend API
    python run.py video1.mp4 video2.mp4    # local testing with video files
    python run.py 0                        # local testing with webcam
"""
from src.main import run

if __name__ == "__main__":
    run()
