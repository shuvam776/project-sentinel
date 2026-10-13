export function formatTimestamp(seconds: number | null | undefined, showTenths: boolean = false): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "—";
  const sec = Math.max(0, seconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const secs = Math.floor(sec % 60);
  const tenths = Math.floor((sec % 1) * 10);

  const pad2 = (n: number) => n.toString().padStart(2, "0");

  let baseStr = "";
  if (hours > 0) {
    baseStr = `${hours}:${pad2(minutes)}:${pad2(secs)}`;
  } else {
    baseStr = `${pad2(minutes)}:${pad2(secs)}`;
  }

  if (showTenths) {
    return `${baseStr}.${tenths}`;
  }
  return baseStr;
}

export function formatTimeRange(startSec: number, endSec: number): string {
  if (Math.abs(startSec - endSec) < 0.1) {
    return formatTimestamp(startSec);
  }
  return `${formatTimestamp(startSec)} – ${formatTimestamp(endSec)}`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function parseServerDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  let normalized = dateStr.trim();
  // If the server string lacks timezone info, ensure UTC Z so client parses accurately
  if (!normalized.includes("Z") && !/[+-]\d{2}(:\d{2})?$/.test(normalized)) {
    normalized = normalized.includes("T") ? `${normalized}Z` : `${normalized.replace(" ", "T")}Z`;
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = parseServerDate(dateStr);
  if (!d) return "—";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60 && diffSecs >= -10) {
    return "Just now";
  }
  if (diffMins < 60 && diffMins >= 1) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24 && diffHours >= 1) {
    return `${diffHours}h ago`;
  }
  if (diffHours >= 24 && diffHours < 48) {
    return "Yesterday";
  }
  if (diffHours >= 48 && diffHours < 168) {
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hours}:${mins}`;
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return "—";
  return score.toFixed(2);
}

export function formatConfidence(conf: number | null | undefined): string {
  if (conf === null || conf === undefined || isNaN(conf)) return "—";
  let val = Math.min(1.0, Math.max(0.0, conf));
  if (val > 0.99 && val < 1.0) val = 0.99;
  return val.toFixed(2);
}
