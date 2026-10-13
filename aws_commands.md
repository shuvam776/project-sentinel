# Sentinel AWS EC2 Management & Deployment Cheatsheet

This guide contains the exact commands and shortcuts for managing your live Sentinel deployment on AWS EC2.

---

## 1. Quick Access Links

| Service | URL |
| :--- | :--- |
| **Sentinel Web Application** | [http://54.234.28.111:3000](http://54.234.28.111:3000) |
| **FastAPI Interactive Docs (Swagger)** | [http://54.234.28.111:8000/docs](http://54.234.28.111:8000/docs) |
| **Backend Health Check** | [http://54.234.28.111:8000/health](http://54.234.28.111:8000/health) |

---

## 2. Deploying GitHub Updates (1 Command)

Whenever you push new code to GitHub, SSH into your server (or open **EC2 Instance Connect** in AWS Console) and run:

```bash
cd project-sentinel && git pull && docker compose up -d --build
```

### What this does:
1. `git pull`: Downloads the latest code commits from GitHub.
2. `docker compose up -d --build`: Rebuilds only the modified layers and restarts the containers with zero downtime.

---

## 3. Handy Management Commands

Run these inside the `~/project-sentinel` directory on EC2:

### Session Recovery & Status
```bash
# Check all running containers system-wide
docker ps

# Check status of both Sentinel containers (backend and frontend)
docker compose ps
```

### Health & Server Verification
```bash
# Test if the backend API is responding healthy
curl http://localhost:8000/health

# Print your current EC2 public IP address
curl -s ifconfig.me
```

### View Live Logs
```bash
# Stream live logs for both services
docker compose logs -f

# Stream logs for backend only
docker compose logs -f backend

# Stream logs for frontend only
docker compose logs -f frontend

# View the last 100 log lines
docker compose logs --tail=100
```

### Restart, Stop, or Start
```bash
# Restart both containers
docker compose restart

# Stop the app (containers will be paused)
docker compose down

# Start the app in the background
docker compose up -d
```

### Check Server Resources (RAM & CPU)
```bash
# Check current RAM and swap memory usage
free -h

# Interactive CPU and memory process monitor
htop
```

---

## 4. Environment Variables (`.env`) on EC2

To configure or update your Cloudinary / Supabase keys on the EC2 server:

```bash
nano .env
```

Paste your variables:
```env
SENTINEL_DEVICE_OVERRIDE=cpu
SENTINEL_DEFAULT_SAMPLE_RATE=1.0

# Cloudinary Integration
SENTINEL_CLOUDINARY_CLOUD_NAME=your_cloud_name
SENTINEL_CLOUDINARY_API_KEY=your_api_key
SENTINEL_CLOUDINARY_API_SECRET=your_api_secret
SENTINEL_CLOUDINARY_ENABLED=true

# Database (Leave blank to use local SQLite, or paste Supabase URL)
SENTINEL_DATABASE_URL=
SENTINEL_SUPABASE_URL=
SENTINEL_SUPABASE_KEY=
```

Press `Ctrl + O` then `Enter` to save, and `Ctrl + X` to exit. Then reload containers:
```bash
docker compose up -d
```

---

## 5. Automated 1-Click Update Script

You can also run this on EC2 to create a `./update.sh` shortcut:

```bash
cat << 'EOF' > update.sh
#!/usr/bin/env bash
set -e
echo "Pulling latest changes from GitHub..."
git pull
echo "Rebuilding and restarting Sentinel containers..."
docker compose up -d --build
echo "Sentinel successfully updated!"
docker compose ps
EOF
chmod +x update.sh
```

Then, whenever you want to update in the future, simply run:
```bash
./update.sh
```
