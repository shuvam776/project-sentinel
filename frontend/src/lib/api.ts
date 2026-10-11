import { VideoItem, VideoListResponse, SearchResponse, Detection, HealthInfo } from "@/types";

const API_BASE = (
  process.env.SENTINEL_BACKEND_URL ||
  process.env.API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "http://127.0.0.1:8000/api/v1")
).replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "") + (typeof window !== "undefined" && !process.env.SENTINEL_BACKEND_URL && !process.env.API_URL ? "/api/v1" : "/api/v1");
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

