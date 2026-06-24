# Smart Forensic Security System

A comprehensive AI-powered surveillance system that detects weapons, assaults, and harassment in real-time, validates threats using OpenAI's GPT-4o, and sends instant alerts to a Node.js dashboard.

---

## 🏗️ Project Structure

The project consists of two main folders:
1. `AI/` - The Python AI surveillance engine (YOLO + GPT-4o)
2. `web/Back/` - The Node.js backend server and dashboard API

---

## 🚀 How to Run

### 1. Start the Backend Server
First, configure the backend environment. In the `web/Back/` folder, create a `.env` file based on `.env.example`:

```env
# Example .env file for web/Back/
# The port the Node.js server will listen on
PORT=3000

# --- Database Configuration ---
# MongoDB Connection URI (Local or Atlas)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/YourDatabaseName?retryWrites=true&w=majority

# --- Security & Authentication ---
# Secret key used to sign JSON Web Tokens (JWT) for dashboard login
JWT_SECRET=your_super_secret_jwt_key_here
# How long the JWT remains valid
JWT_EXPIRES_IN=1d

# --- Super Admin Credentials ---
# The default admin account created when the server starts
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=superadmin123
# Set to 'true' to force reset the superadmin password on startup
FORCE_RESET_SUPER_ADMIN_PASSWORD=false

# --- AI Integration ---
# The secret key the AI system must provide to send alerts to this backend
# (Must match the AI_API_KEY in the AI folder's .env)
AI_API_KEY=supersecretkey123

# --- Camera Monitoring ---
# How long (in ms) before a camera is considered "Offline" if no heartbeat is received
CAMERA_HEARTBEAT_TIMEOUT_MS=30000
# How often (in ms) the backend checks for offline cameras
CAMERA_HEARTBEAT_WATCHER_INTERVAL_MS=10000

# --- Rate Limiting ---
# Maximum number of requests allowed per IP window
RATE_LIMIT_MAX=500

```

Then start the backend:

```bash
cd web/Back
npm install
npm run dev
```
*The backend will run on `http://localhost:3000`.*

### 2. Configure the AI Environment (`.env`)
In the `AI/` folder, create or edit the `.env` file. Here is an example of what it should look like:

```env
# Example .env file for AI/

# 1. OpenAI API Key (Optional but highly recommended)
# Enables GPT-4o to act as a second-opinion filter, significantly reducing false positives.
# If a hug or friendly contact is detected as "harassment", GPT will see the image
# and correctly classify it as "NORMAL", cancelling the false alert.
OPENAI_API_KEY=sk-proj-your_real_api_key_here

# 2. Backend Connection
BACKEND_URL=http://localhost:3000/dashboard/api
AI_API_KEY=supersecretkey123

# 3. Local Testing Camera ID
# Only used when running in --local mode (see below) to tell the backend which camera this is.
CAMERA_AI_ID=C200
```

### 3. Run the AI System
Navigate to the AI folder and activate your virtual environment.

```bash
cd AI
# Activate your venv (e.g., .\venv\Scripts\activate on Windows)
```

The AI can be run in **two modes**:

#### Mode A: Production (Backend Driven)
In this mode, the AI asks the backend for all active cameras and processes them automatically in a grid.

```bash
python run.py
```

#### Mode B: Local Testing
Use this mode to test specific video files or your webcam without needing cameras set up in the backend database. (Alerts are still sent to the backend using the `CAMERA_AI_ID` from your `.env`).

```bash
# Test with your laptop webcam
python run.py --local

# Test with your laptop webcam AND a video file side-by-side
python run.py --local 0 my_test_video.mp4
```

---

## 🧠 Why use the OpenAI API Key?

By default, the YOLO models analyze bounding boxes and poses. Sometimes, two people hugging closely or shaking hands might look like an "Aggressor" to the raw math. 

If you provide an `OPENAI_API_KEY` in the `.env` file:
1. When YOLO suspects a threat, it pauses for a fraction of a second.
2. It sends the best frame to **GPT-4o Vision**.
3. GPT acts as a human security guard. It looks at the context: *"Are they smiling? Is it a friendly hug? Or is it unwanted contact?"*
4. If GPT says it's normal, the alert is silently cancelled.
5. If GPT confirms it's harassment or a weapon, the alert is fired.

**Without the key**, the system still works perfectly fine using just YOLO, but you may see a little more false positives for friendly physical contact.
