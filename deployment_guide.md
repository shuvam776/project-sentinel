# Sentinel Production Deployment Guide (Render + Vercel)

This guide provides step-by-step instructions for deploying Sentinel to production with **Render** (Backend API + AI Inference) and **Vercel** (Next.js Frontend).

---

## 1. Deploying the Backend to Render

### Option A: 1-Click Blueprint (Recommended)
1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** ➔ **Blueprint**.
3. Select your Sentinel repository. Render will automatically read [`render.yaml`](file:///c:/New%20folder/Desktop/aiml/dl/sentinel/render.yaml).
4. Render will pre-populate all environment variables:
   - `SENTINEL_DATABASE_URL`: `<your-supabase-postgres-connection-url>`
   - `SENTINEL_CLOUDINARY_CLOUD_NAME`: `<your-cloudinary-cloud-name>`
   - `SENTINEL_CLOUDINARY_API_KEY`: `<your-cloudinary-api-key>`
   - `SENTINEL_CLOUDINARY_API_SECRET`: `<your-cloudinary-api-secret>`
   - `SENTINEL_CLOUDINARY_ENABLED`: `true`
   - `SENTINEL_SUPABASE_URL`: `<your-supabase-url>`
   - `SENTINEL_SUPABASE_KEY`: `<your-supabase-service-key>`
   - `SENTINEL_DEVICE_OVERRIDE`: `cpu`
5. Click **Apply**.
6. When deployment finishes, Render provides your live backend URL (e.g. `https://sentinel-backend.onrender.com`).
7. Test the health endpoint: `https://sentinel-backend.onrender.com/health`.

### Option B: Manual Web Service on Render
If deploying as a standard Web Service:
- **Environment**: Python 3
- **Root Directory**: `backend`
- **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
- **Start Command**: `python run.py`
- **Health Check Path**: `/health`

---

## 2. Deploying the Frontend to Vercel

1. In the [Vercel Dashboard](https://vercel.com/new), import your GitHub repository.
2. Under **Project Settings**:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: Click *Edit* and select **`frontend`**
3. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `SENTINEL_BACKEND_URL` *(or `BACKEND_URL`)* | `https://your-render-app.onrender.com` | Live Render backend URL (no public prefix needed) |
4. Click **Deploy**.
5. Vercel will build and launch your application at `https://your-project.vercel.app`.

---

## 3. Deploying Sentinel to AWS EC2 (Docker Compose - Recommended for AI/ML)

AWS EC2 with Docker is the most reliable way to run Sentinel with PyTorch, CLIP, and Faster R-CNN without hitting memory limits.

### Why EC2 for Sentinel?
- **Sufficient RAM:** A `t3.medium` (4 GiB RAM) instance plus 4 GiB swap provides 8 GiB effective memory—easily handling CLIP vision-language embeddings and object detection.
- **Cost Covered by Free Credits:** A `t3.medium` is ~$30/month (~$0.04/hr). Your $100 AWS credit covers over **3 months of continuous 24/7 uptime** (or 6+ months if stopped when not in use).
- **Persistent Storage:** EBS SSD volume persists your database, models, and cache across restarts.

---

### Step 1: Launch your AWS EC2 Instance
1. Open the [AWS EC2 Console](https://console.aws.amazon.com/ec2/).
2. Click **Launch Instance**.
3. **Name**: `sentinel-ai-server`
4. **Application and OS Images (AMI)**: **Ubuntu Server 24.04 LTS (HVM), SSD Volume Type** (64-bit x86).
5. **Instance Type**: Select **`t3.medium`** (2 vCPUs, 4 GiB RAM).
6. **Key pair (login)**: Click **Create new key pair** (e.g. `sentinel-key.pem`) and download it.
7. **Network settings** (Security Group):
   - Check **Allow SSH traffic from Anywhere** (or My IP).
   - Check **Allow HTTP traffic from the internet** (Port 80).
   - Check **Allow HTTPS traffic from the internet** (Port 443).
   - Click **Edit** and add Custom TCP Rules:
     - **Custom TCP** | Port `8000` | Source: `Anywhere` (`0.0.0.0/0`) — *FastAPI Backend*
     - **Custom TCP** | Port `3000` | Source: `Anywhere` (`0.0.0.0/0`) — *Next.js Frontend (optional if running together)*
8. **Configure Storage**: Set size to **`30 GiB`** (gp3) — (30 GiB is 100% free under AWS Free Tier).
9. Click **Launch Instance**.

---

### Step 2: SSH into your EC2 Instance
In your local terminal or PowerShell:
```bash
# On Linux/macOS:
chmod 400 sentinel-key.pem
ssh -i "sentinel-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>

# On Windows PowerShell:
ssh -i .\sentinel-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

### Step 3: Setup 4GB Swap & Install Docker on EC2
Once connected to the instance, run this one-time command:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Add 4GB Swap file (guarantees PyTorch models never run out of memory)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Install Docker and Docker Compose plugin
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
newgrp docker
```

---

### Step 4: Clone Sentinel & Configure Environment
```bash
# Clone the repository
git clone https://github.com/shuvam776/project-sentinel.git
cd project-sentinel

# Create environment file
cat << 'EOF' > .env
SENTINEL_DEVICE_OVERRIDE=cpu
SENTINEL_DEFAULT_SAMPLE_RATE=1.0

# Optional Cloud Integrations (from your existing accounts):
SENTINEL_CLOUDINARY_CLOUD_NAME=your_cloud_name
SENTINEL_CLOUDINARY_API_KEY=your_api_key
SENTINEL_CLOUDINARY_API_SECRET=your_api_secret
SENTINEL_CLOUDINARY_ENABLED=true

# Optional Supabase PostgreSQL (leave blank to use local SQLite)
SENTINEL_DATABASE_URL=
SENTINEL_SUPABASE_URL=
SENTINEL_SUPABASE_KEY=
EOF
```

---

### Step 5: Start with Docker Compose
```bash
# Build and run containers in background
docker compose up -d --build

# View real-time logs
docker compose logs -f
```

Test the live backend endpoint:
```bash
curl http://localhost:8000/health
```
You can now access:
- **Backend API Docs**: `http://<YOUR_EC2_PUBLIC_IP>:8000/docs`
- **Frontend App**: `http://<YOUR_EC2_PUBLIC_IP>:3000` (or host frontend on Vercel pointed to `http://<YOUR_EC2_PUBLIC_IP>:8000`)

---

### Step 6: Maintain a Static IP (AWS Elastic IP)
By default, EC2 public IPs can change when an instance is stopped and restarted.
1. In the EC2 Console, go to **Network & Security** ➔ **Elastic IPs**.
2. Click **Allocate Elastic IP address** ➔ **Allocate**.
3. Select the new Elastic IP ➔ **Actions** ➔ **Associate Elastic IP address**.
4. Choose your `sentinel-ai-server` instance and click **Associate**.
5. Your instance now has a **permanent, fixed public IP** that never changes!

---

## 4. CORS and Domain Linking
- Sentinel's FastAPI backend is configured with `allow_origin_regex=r"^https?://.*"`, allowing seamless CORS requests between your Vercel frontend, local environments, and EC2 instances with credentials support.

