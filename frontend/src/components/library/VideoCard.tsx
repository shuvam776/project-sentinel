import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, ArrowRight, MoreVertical, Trash2, RotateCw, Download, Play, Search, Pencil, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { VideoItem } from "@/types";
import FrameThumb from "@/components/data/FrameThumb";
import StatusIndicator from "@/components/ui/StatusIndicator";
import Button from "@/components/ui/Button";
import { formatTimestamp, formatDate } from "@/lib/format";
import { updateVideoName, getVideoDownloadUrl } from "@/lib/api";

interface VideoCardProps {
  video: VideoItem;
  onDelete: (id: string) => Promise<void>;
  onRetry?: (id: string) => Promise<void>;
  onRename?: (id: string, newName: string) => Promise<void>;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onDelete, onRetry, onRename }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(video.original_filename);
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === video.original_filename) {
      setNameInput(video.original_filename);
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    try {
      if (onRename) {
        await onRename(video.id, trimmed);
      } else {
        await updateVideoName(video.id, trimmed);
      }
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to rename video:", err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await onDelete(video.id);
    } catch {
      setIsDeleting(false);
      setIsDeleteConfirm(false);
    }
  };

  const handleCardClick = () => {
    if (video.status === "queued" || isDeleteConfirm) return;
    router.push(`/videos/${video.id}`);
  };

  if (isDeleteConfirm) {
    return (
      <div className="p-3 bg-danger-subtle border border-danger-border rounded-md space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-txt-primary">
          <Trash2 className="w-4 h-4 text-danger flex-shrink-0" />
          <span>Delete “{video.original_filename}”?</span>
        </div>
        <p className="text-[11px] text-txt-secondary leading-normal">
          Removes the video, thumbnails, and search data. This cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="secondary"
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteConfirm(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructiveSolid"
            loading={isDeleting}
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  const isSearchable = video.status === "completed" || video.status === "processing";
  const isFailed = video.status === "failed";
  const isIndexing = video.status === "processing" || video.status === "queued";
  const downloadUrl = video.download_url || getVideoDownloadUrl(video.id);

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        "group relative bg-surface border border-border-default hover:border-border-strong hover:shadow-sm rounded-lg overflow-hidden transition-all duration-150 cursor-pointer select-none flex flex-col text-xs",
        video.status === "queued" && "cursor-not-allowed opacity-75"
      )}
    >
      {/* Thumbnail Container (16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-video bg-stone-900 overflow-hidden flex items-center justify-center group/thumb">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail_url}
            alt={video.original_filename}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <Film className="w-8 h-8 text-stone-600" />
        )}

        {/* Hover Dark Overlay with Play Icon */}
        {isSearchable && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/95 text-stone-900 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
              <Play className="w-5 h-5 fill-current ml-0.5 text-stone-900" />
            </div>
          </div>
        )}

        {/* Status Chip (Top Left) */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span
            className={clsx(
              "px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 shadow-xs backdrop-blur-md",
              video.status === "completed" && "bg-emerald-950/85 text-emerald-200 border border-emerald-500/30",
              video.status === "failed" && "bg-rose-950/85 text-rose-200 border border-rose-500/30",
              (video.status === "processing" || video.status === "queued") && "bg-amber-950/85 text-amber-200 border border-amber-500/30"
            )}
          >
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                video.status === "completed" && "bg-emerald-400",
                video.status === "failed" && "bg-rose-400",
                (video.status === "processing" || video.status === "queued") && "bg-amber-400 animate-pulse"
              )}
            />
            <span className="capitalize">{video.status === "completed" ? "Ready" : video.status}</span>
          </span>
        </div>

        {/* Duration Chip (Bottom Right) */}
        {video.duration_seconds != null && video.duration_seconds > 0 && (
          <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-xs text-white font-mono text-[10px] font-medium tracking-tight shadow-xs pointer-events-none">
            {formatTimestamp(video.duration_seconds)}
          </div>
        )}

        {/* 3-dots Menu Button (Top Right) */}
        <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-xs transition-colors shadow-xs"
            title="Video options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border-default rounded-md shadow-float z-30 p-1 text-xs space-y-0.5"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-surface-raised text-txt-primary flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/videos/${video.id}`);
                }}
              >
                <Play className="w-3.5 h-3.5 text-txt-tertiary" /> Open in player
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-surface-raised text-txt-primary flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/search?video=${video.id}`);
                }}
              >
                <Search className="w-3.5 h-3.5 text-txt-tertiary" /> Search this video
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-surface-raised text-txt-primary flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  setNameInput(video.original_filename);
                  setIsEditingName(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5 text-txt-tertiary" /> Rename...
              </button>
              <a
                href={downloadUrl}
                download={video.original_filename}
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-surface-raised text-txt-primary flex items-center gap-2"
                onClick={() => setMenuOpen(false)}
              >
                <Download className="w-3.5 h-3.5 text-txt-tertiary" /> Download
              </a>
              <div className="h-[1px] bg-border-subtle my-1" />
              <button
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-danger-subtle text-danger-text flex items-center gap-2"
                onClick={() => {
                  setMenuOpen(false);
                  setIsDeleteConfirm(true);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 text-danger" /> Delete...
              </button>
            </div>
          )}
        </div>

        {/* Indexing Progress Bar */}
        {isIndexing && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-10">
            <div
              className="h-full bg-accent transition-all duration-200"
              style={{ width: `${video.progress_percent || 15}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2.5">
        <div className="space-y-1">
          {/* Filename with inline editing */}
          <div className="flex items-center justify-between gap-1" onClick={(e) => isEditingName && e.stopPropagation()}>
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1 py-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setNameInput(video.original_filename);
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  className="px-2 py-0.5 bg-surface-raised border border-accent rounded-sm text-xs text-txt-primary focus:outline-none w-full"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={isSavingName || !nameInput.trim()}
                  className="p-1 rounded-sm text-success hover:bg-surface-raised cursor-pointer disabled:opacity-50"
                  title="Save name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(video.original_filename);
                    setIsEditingName(false);
                  }}
                  className="p-1 rounded-sm text-txt-secondary hover:bg-surface-raised cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 min-w-0 group/name">
                <h3
                  className="font-medium text-txt-primary truncate group-hover:text-accent transition-colors text-xs"
                  title={video.original_filename}
                >
                  {video.original_filename}
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNameInput(video.original_filename);
                    setIsEditingName(true);
                  }}
                  className="opacity-0 group-hover/name:opacity-100 p-0.5 text-txt-tertiary hover:text-txt-primary rounded-sm transition-opacity cursor-pointer shrink-0"
                  title="Rename video"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Metadata Row: Date & Resolution */}
          <div className="flex items-center gap-2 text-[11px] text-txt-tertiary">
            <span>{formatDate(video.created_at)}</span>
            {video.fps && <span>· {Math.round(video.fps)} fps</span>}
            {video.width && video.height && <span>· {video.width}×{video.height}</span>}
          </div>
        </div>

        {/* Failed Error Message (if failed) */}
        {isFailed && video.error_message && (
          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] leading-tight">
            {video.error_message}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-[11px]">
          {isSearchable && (
            <Link
              href={`/search?video=${video.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline transition-colors"
            >
              <Search className="w-3 h-3" />
              <span>Search Video</span>
            </Link>
          )}

          {isFailed && onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(video.id);
              }}
              className="inline-flex items-center gap-1 font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry Indexing</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/videos/${video.id}`);
            }}
            className="ml-auto inline-flex items-center gap-1 text-txt-secondary hover:text-txt-primary font-medium"
          >
            <span>Open</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
