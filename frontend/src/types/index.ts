export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  id: string;
  video_id: string;
  frame_id: string;
  timestamp: number;
  class_name: string;
  class_id: number;
  confidence: number;
  box: BoundingBox;
}

export interface VideoItem {
  id: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  duration_seconds: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  sample_rate: number;
  status: "queued" | "processing" | "completed" | "failed";
  progress_percent: number;
  current_step: string;
  error_message: string | null;
  thumbnail_url: string | null;
  stream_url: string;
  annotated_stream_url?: string;
  download_url?: string;
  annotated_download_url?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoListResponse {
  videos: VideoItem[];
  total: number;
}

export interface SearchResultSegment {
  segment_id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  duration: number;
  best_timestamp: number;
  best_score: number;
  score_type: string;
  score_interpretation: string;
  thumbnail_url: string | null;
  clip_url: string | null;
  detected_objects: string[];
  detections: Detection[];
}

export interface SearchResponse {
  query: string;
  video_id: string;
  total_segments: number;
  segments: SearchResultSegment[];
  disclaimer: string;
}

export interface HealthInfo {
  status: string;
  service: string;
  device: string;
  cuda_available: boolean;
  device_name: string;
  clip_model: string;
  detector_model: string;
  training_mode: string;
}

