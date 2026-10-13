import { VideoItem, VideoListResponse, SearchResponse, Detection, HealthInfo } from "@/types";

const API_BASE = (
  process.env.SENTINEL_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  (typeof window !== "undefined"
    ? "/api/v1"
    : process.env.NODE_ENV === "production"
      ? "http://backend:8000/api/v1"
      : "http://127.0.0.1:8000/api/v1")
).replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "") + (typeof window !== "undefined" && !process.env.SENTINEL_BACKEND_URL && !process.env.BACKEND_URL && !process.env.API_URL ? "/api/v1" : "/api/v1");
const HEALTH_URL = (
  process.env.HEALTH_URL ||
  (typeof window !== "undefined" ? "/health" : API_BASE.replace(/\/api\/v1\/?$/, "/health"))
).replace(/\/+$/, "");

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const userId = localStorage.getItem("sentinel_user_id");
    if (userId) {
      headers["X-User-ID"] = userId;
    }
    const token = localStorage.getItem("sentinel_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch(HEALTH_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Backend service unreachable");
  return res.json();
}

export async function fetchVideos(): Promise<VideoListResponse> {
  const res = await fetch(`${API_BASE}/videos`, {
    headers: { ...getAuthHeaders() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch videos");
  return res.json();
}

export async function fetchVideo(id: string): Promise<VideoItem> {
  const res = await fetch(`${API_BASE}/videos/${id}`, {
    headers: { ...getAuthHeaders() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch video details");
  return res.json();
}

export async function fetchVideoStatus(id: string): Promise<{
  id: string;
  status: string;
  progress_percent: number;
  current_step: string;
  error_message: string | null;
}> {
  const res = await fetch(`${API_BASE}/videos/${id}/status`, {
    headers: { ...getAuthHeaders() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to poll video status");
  return res.json();
}

export async function uploadVideo(
  file: File,
  sampleRate: number = 1.0,
  onProgress?: (percent: number) => void
): Promise<VideoItem> {
  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/videos/upload?sample_rate=${sampleRate}`);

    const authHeaders = getAuthHeaders();
    Object.entries(authHeaders).forEach(([k, v]) => {
      xhr.setRequestHeader(k, v);
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error("Invalid JSON response from server"));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.detail || "Video upload failed"));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network connection error during upload"));
    xhr.send(formData);
  });
}

export async function searchVideo(params: {
  videoId: string;
  query: string;
  filterClasses?: string[];
  minScore?: number;
  temporalGap?: number;
  clipPadding?: number;
}): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      video_id: params.videoId,
      query: params.query,
      filter_classes: params.filterClasses && params.filterClasses.length > 0 ? params.filterClasses : null,
      min_score: params.minScore ?? 0.18,
      temporal_gap: params.temporalGap ?? 3.0,
      clip_padding: params.clipPadding ?? 1.5,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Search request failed" }));
    throw new Error(err.detail || "Search request failed");
  }
  return res.json();
}

export async function fetchDetections(
  videoId: string,
  className?: string,
  minConfidence: number = 0.20
): Promise<Detection[]> {
  const url = new URL(`${API_BASE}/search/detections/${videoId}`);
  if (className) url.searchParams.set("class_name", className);
  url.searchParams.set("min_confidence", minConfidence.toString());

  const res = await fetch(url.toString(), {
    headers: { ...getAuthHeaders() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load detections");
  return res.json();
}

export async function fetchSupportedClasses(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/search/classes`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load supported object classes");
  return res.json();
}

export async function deleteVideo(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/videos/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete video");
}

export async function updateVideoName(id: string, original_filename: string): Promise<VideoItem> {
  const res = await fetch(`${API_BASE}/videos/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ original_filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update video name" }));
    throw new Error(err.detail || "Failed to update video name");
  }
  return res.json();
}

export async function reprocessVideo(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/videos/${id}/reprocess`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to re-index video");
}

export function getVideoStreamUrl(videoId: string, options?: { classes?: string[]; annotated?: boolean }): string {
  const endpoint = options?.annotated ? "stream_annotated" : "stream";
  const base = `${API_BASE}/videos/${videoId}/${endpoint}`;
  if (options?.classes && options.classes.length > 0) {
    return `${base}?classes=${encodeURIComponent(options.classes.join(","))}`;
  }
  return base;
}

export function getVideoDownloadUrl(videoId: string, options?: { classes?: string[]; annotated?: boolean }): string {
  const endpoint = options?.annotated ? "download_annotated" : "download";
  const base = `${API_BASE}/videos/${videoId}/${endpoint}`;
  if (options?.classes && options.classes.length > 0) {
    return `${base}?classes=${encodeURIComponent(options.classes.join(","))}`;
  }
  return base;
}

export function getClipDownloadUrl(videoId: string, segmentId: string): string {
  return `${API_BASE}/clips/${videoId}/${segmentId}`;
}

export interface DemoStatusResponse {
  has_custom: boolean;
  authenticated: boolean;
  user_id?: string;
  image_url?: string;
  detections?: Array<{
    class_name: string;
    confidence: number;
    box: { x1: number; y1: number; x2: number; y2: number };
  }>;
  filename?: string;
}

export async function fetchDemoStatus(): Promise<DemoStatusResponse> {
  const url = `${API_BASE}/demo/status`;
  try {
    const res = await fetch(url, {
      headers: { ...getAuthHeaders() },
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[Sentinel API] GET ${url} returned ${res.status}`);
      return { has_custom: false, authenticated: false };
    }
    const data = await res.json();
    if (data.image_url && !data.image_url.startsWith("http")) {
      const origin = API_BASE.replace(/\/api\/v1\/?$/, "");
      data.image_url = `${origin}${data.image_url}`;
    }
    return data;
  } catch (err) {
    console.warn(`[Sentinel API] Failed to fetch demo status from ${url}:`, err);
    return { has_custom: false, authenticated: false };
  }
}

export async function uploadDemoImage(file: File): Promise<DemoStatusResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE}/demo/annotate`;
  console.log(`[Sentinel API] POST ${url} - Uploading "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`);

  const res = await fetch(url, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    body: formData,
  });

  if (!res.ok) {
    let errDetail = `Server returned HTTP ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      errDetail = errJson.detail || errJson.message || errDetail;
    } catch {
      const rawText = await res.text().catch(() => "");
      if (rawText) errDetail = rawText.slice(0, 300);
    }
    console.error(`[Sentinel API] POST ${url} failed [${res.status}]:`, errDetail);
    throw new Error(errDetail);
  }

  const data = await res.json();
  console.log(`[Sentinel API] POST ${url} completed:`, data);
  if (data.image_url && !data.image_url.startsWith("http")) {
    const origin = API_BASE.replace(/\/api\/v1\/?$/, "");
    data.image_url = `${origin}${data.image_url}`;
  }
  return data;
}

export async function resetDemoImage(): Promise<void> {
  const url = `${API_BASE}/demo/image`;
  console.log(`[Sentinel API] DELETE ${url} - Resetting demo image to default...`);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    console.error(`[Sentinel API] DELETE ${url} failed [${res.status}]`);
    throw new Error("Failed to reset demo image");
  }
  console.log(`[Sentinel API] DELETE ${url} successful.`);
}

