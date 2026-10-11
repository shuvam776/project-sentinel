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
   | `BACKEND_URL` | `https://your-render-app.onrender.com` | Live Render backend URL (no public prefix needed) |
4. Click **Deploy**.
5. Vercel will build and launch your application at `https://your-project.vercel.app`.

---

## 3. CORS and Domain Linking
- Sentinel's FastAPI backend has been configured with `allow_origin_regex=r"^https?://.*"`, allowing seamless CORS requests between your Vercel domain, local environments, and custom domains with cookie & credential support.
