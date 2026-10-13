# Sentinel Command Reference & Cheatsheet (EC2 & Local)

A complete, commented collection of all commands needed to manage, troubleshoot, and run Sentinel both on **remote AWS EC2 instances** and on your **local machine**.

---

## 1. AWS EC2 Server Management (Linux / Bash)

Use these commands whenever you SSH or connect to your EC2 instance (`ubuntu@ip-...`).

### A. Checking Status & Recovery (What to do when returning to the server)
```bash
# 1. Check all actively running Docker containers across the entire system
docker ps

# 2. Check all containers, including stopped or exited ones
docker ps -a

# 3. Navigate into your project repository
cd ~/project-sentinel

# 4. Check the status of Sentinel's specific containers (backend & frontend)
docker compose ps
```

---

### B. Starting, Restarting, and Stopping Services
```bash
# Navigate to the project root first
cd ~/project-sentinel

# 1. Start containers in the background (detached mode) without rebuilding
# Use this when the containers were stopped or after a server reboot
docker compose up -d

# 2. Pull latest GitHub updates, rebuild containers, and start them
# Use this whenever you push new changes to GitHub
git pull && docker compose up -d --build

# 3. Restart running containers (useful if a service gets stuck or after config changes)
docker compose restart

# 4. Stop and remove running containers (pauses the application)
docker compose down
```

---

### C. Live Logs & Diagnostics
```bash
cd ~/project-sentinel

# 1. Follow real-time logs for all services (Press Ctrl + C to exit)
docker compose logs -f

# 2. Follow real-time logs for the FastAPI backend only
docker compose logs -f backend

# 3. Follow real-time logs for the Next.js frontend only
docker compose logs -f frontend

# 4. View the last 50 lines of logs without streaming
docker compose logs --tail=50
```

---

### D. Health Checks & Server Info
```bash
# 1. Test if the backend API is responding healthy locally
curl http://localhost:8000/health

# 2. Check the HTTP response status of the frontend locally
curl -I http://localhost:3000

# 3. Print your EC2 instance's current public IP address (run this if you forgot your IP)
curl -s ifconfig.me

# 4. Check current RAM and swap memory usage (verify 4GB swap is active)
free -h

# 5. Check remaining disk space on the server
df -h /
```

---

### E. Fixing Docker Permission Issues
```bash
# If you ever get "permission denied while trying to connect to the Docker daemon socket"
sudo systemctl enable --now docker  # Ensure Docker service is running
sudo usermod -aG docker ubuntu      # Add ubuntu user to the docker group
newgrp docker                       # Apply group permissions immediately
```

---

## 2. Local Machine Commands (Windows PowerShell)

Use these commands when developing or running Sentinel directly on your Windows PC.

### A. Running with Docker Compose Locally
```powershell
# Navigate into the project folder on Windows
cd "c:\New folder\Desktop\aiml\dl\sentinel"

# 1. Start both backend and frontend in Docker (background)
docker compose up -d

# 2. Check container status
docker compose ps

# 3. View live logs
docker compose logs -f

# 4. Test backend health check from PowerShell
curl.exe http://localhost:8000/health
# Or using native PowerShell:
# (Invoke-RestMethod http://localhost:8000/health)

# 5. Stop containers
docker compose down
```

---

### B. Running Without Docker (Direct Python & Node.js)

#### 1. Backend (FastAPI / PyTorch)
```powershell
# Navigate to backend folder
cd "c:\New folder\Desktop\aiml\dl\sentinel\backend"

# Activate Python virtual environment (if using .venv)
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Run backend development server (listens on port 8000)
python run.py
```

#### 2. Frontend (Next.js)
```powershell
# Open a second PowerShell terminal and navigate to frontend folder
cd "c:\New folder\Desktop\aiml\dl\sentinel\frontend"

# Install node dependencies
npm install

# Start Next.js development server (listens on port 3000)
npm run dev
```

---

## 3. Quick Reference Card

| Goal | Command |
| :--- | :--- |
| **Check container status** | `docker compose ps` |
| **Start in background** | `docker compose up -d` |
| **Stop application** | `docker compose down` |
| **Rebuild & restart** | `docker compose up -d --build` |
| **Follow live logs** | `docker compose logs -f` |
| **Test backend health** | `curl http://localhost:8000/health` |
| **Get EC2 Public IP** | `curl -s ifconfig.me` |
| **Check memory & swap** | `free -h` |
