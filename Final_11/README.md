# 🔬 Smart Forensic Security System

> **Real-time AI-powered security surveillance system** for detecting harassment, violence, and weapons using multi-model inference with GPT-4o verification.

---

## 🎯 Overview

This system combines **4 AI models** running in parallel to provide real-time threat detection from video feeds:

| Model | Purpose | Type |
|-------|---------|------|
| **YOLOv8 Person** | Detect people in frame | Custom-trained Object Detection |
| **YOLOv8 Pose** | Extract 17-point body keypoints | Pose Estimation (ByteTrack) |
| **YOLOv8 Weapon** | Detect weapons (guns, knives) | Custom-trained Object Detection |
| **GPT-4o Vision** | Verify suspicious events | Cloud Vision AI (false-positive filter) |

### Key Features

- ✅ **Multi-model parallel inference** — 3 YOLO models run simultaneously via ThreadPool
- ✅ **ByteTrack entity tracking** — stable person IDs across frames
- ✅ **Dynamic contact analysis** — hand-to-body proximity with velocity tracking
- ✅ **Weapon-person association** — identifies who holds vs. who is threatened
- ✅ **Temporal smoothing** — 2-of-3 frame confirmation to eliminate flicker
- ✅ **GPT-4o verification** — cloud AI second opinion on suspicious events
- ✅ **Severity escalation** — 5 levels from Normal to Weapon Alert
- ✅ **Incident recording** — auto-saves screenshots + metadata for events
- ✅ **Video file support** — works with webcam or video files
- ✅ **FPS counter** — real-time performance monitoring

---

## 📁 Project Structure

```
├── run.py                    ← Entry point
├── config.yaml               ← Tunable parameters
├── .env                      ← API keys (NEVER commit!)
├── requirements.txt          ← Python dependencies
│
├── src/                      ← Core package
│   ├── __init__.py           ← Version info (v2.0.0)
│   ├── config.py             ← Centralized configuration
│   ├── main.py               ← Pipeline orchestration + inference loop
│   ├── events.py             ← Event logging + severity escalation
│   │
│   ├── models/               ← AI model wrappers
│   │   ├── person_detector.py
│   │   ├── pose_estimator.py
│   │   └── weapon_detector.py
│   │
│   ├── analysis/             ← Interaction analysis
│   │   ├── contact_resolver.py   ← Physical contact detection
│   │   ├── weapon_resolver.py    ← Weapon-person association
│   │   ├── gpt_verifier.py       ← GPT-4o verification
│   │   └── temporal_smoother.py  ← False-positive suppression
│   │
│   ├── tracker/              ← Entity tracking
│   │   └── associator.py     ← ByteTrack-based tracker
│   │
│   └── visualization/        ← Drawing & UI
│       └── drawer.py         ← Bounding boxes, labels, FPS
│
├── Trained_Models/           ← AI model weights
│   ├── yolov8_run/weights/best.onnx
│   ├── Weapon/best.onnx
│   └── vgg16_best_model.keras
│
├── incidents/                ← Auto-saved event records
│   └── YYYY-MM-DD/
│       └── HHMMSS_SEVERITY_entityN/
│           ├── screenshot.jpg
│           └── metadata.json
│
├── logs/                     ← System logs
└── archive/                  ← Legacy files (not used)
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure API Key
Create a `.env` file in the project root:
```env
OPENAI_API_KEY=sk-proj-your-key-here
```
> ⚠️ The `.env` file is gitignored. Never commit API keys to source control.

### 3. Run the System
```bash
# Webcam (default)
python run.py

# Video file
python run.py path/to/video.mp4

# As a module
python -m src.main
python -m src.main path/to/video.mp4
```

### 4. Controls
- Press **`q`** to quit

---

## ⚙️ Configuration

All tunable parameters are in `config.yaml`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `person_confidence` | 0.55 | Person detection threshold |
| `pose_confidence` | 0.55 | Pose estimation threshold |
| `weapon_confidence` | 0.25 | Weapon detection threshold (low for small weapons) |
| `frame_skip` | 2 | Process every Nth frame |
| `window_size` | 3 | Temporal smoothing window |
| `confirm_threshold` | 2 | Min detections to confirm (2-of-3) |

---

## 🎨 Visual Indicators

| Color | Meaning |
|-------|---------|
| 🟢 Green box | Normal person |
| 🔴 Red box | Aggressor / Armed Aggressor |
| 🟠 Orange box | Victim / Armed Victim |
| 🟡 Yellow circle | Contact point |
| 🟣 Purple box | Weapon |
| Top banner | GPT-4o classification result |
| Bottom-right | FPS counter |

---

## 🚨 Severity Levels

| Level | Name | Triggers | Action |
|-------|------|----------|--------|
| 0 | NORMAL | No interaction | Nothing |
| 1 | NORMAL_CONTACT | Friendly touch | Log only |
| 2 | HARASSMENT | Unwanted touching | Alert + save screenshot |
| 3 | ASSAULT | Forceful pushing | Urgent alert + save |
| 4 | WEAPON | Weapon detected | Maximum alert + save |

Incidents above Level 2 are automatically saved to `incidents/` with screenshots and metadata.

---

## 🏗️ Architecture

```
                    ┌─────────────────┐
                    │   Video Frame   │
                    └────────┬────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Person Det │  │ Pose + Track│  │ Weapon Det │
    │ (YOLO)     │  │ (ByteTrack) │  │ (YOLO)     │
    └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
              ┌───────────────────────┐
              │   Entity Tracker      │
              │  (stable IDs)         │
              └───────────┬───────────┘
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ Contact Resolver │  │ Weapon Resolver  │
    │ (hand → body)    │  │ (hand → weapon)  │
    └────────┬─────────┘  └────────┬─────────┘
             │                     │
             └──────────┬──────────┘
                        ▼
             ┌──────────────────────┐
             │ Temporal Smoother    │
             │ (2-of-3 confirm)     │
             └──────────┬───────────┘
                        ▼
             ┌──────────────────────┐
             │ GPT-4o Verification  │
             │ (false-pos filter)   │
             └──────────┬───────────┘
                        ▼
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│ Event Logger     │       │ Visualization    │
│ (incidents/)     │       │ (draw on frame)  │
└──────────────────┘       └──────────────────┘
```

---

## 📦 Model Files

Model weights are not included in version control due to size. Required files:

| File | Size | Location |
|------|------|----------|
| `best.onnx` (person) | ~6 MB | `Trained_Models/yolov8_run/weights/` |
| `best.onnx` (weapon) | ~6 MB | `Trained_Models/Weapon/` |
| `yolov8n-pose.onnx` | ~13 MB | Project root |

To export from `.pt` to `.onnx`:
```bash
python export_onnx.py
```

---

## 🔒 Security

- API keys are stored in `.env` (gitignored)
- GPT verification uses **safe defaults** — API failures never escalate threats
- Incident data is stored locally only
- No external data transmission except GPT-4o API calls

---

*Version 2.0.0 — Smart Forensic Security System*
