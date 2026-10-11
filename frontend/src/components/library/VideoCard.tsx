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
import { updateVideoName } from "@/lib/api";

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
  const downloadUrl = video.download_url || `http://127.0.0.1:8000/api/v1/videos/${video.id}/download`;

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        "group relative bg-surface border border-border-default hover:border-border-strong rounded-md p-3 transition-colors duration-fast cursor-pointer select-none space-y-2 text-xs",
        video.status === "queued" && "cursor-not-allowed opacity-75"
      )}
    >
      {/* Row 1: Title & Duration Chip */}
      <div className="flex items-start justify-between gap-2" onClick={(e) => isEditingName && e.stopPropagation()}>
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
            <div
              className="font-medium text-txt-primary truncate group-hover:text-accent transition-colors"
              title={video.original_filename}
            >
              {video.original_filename}
            </div>
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

        {/* Duration Chip */}
        <div className="px-1.5 py-0.5 rounded-sm bg-surface-raised border border-border-subtle text-txt-secondary font-mono text-[11px] flex items-center gap-1 flex-shrink-0">
          <Film className="w-3 h-3 text-txt-tertiary" />
          <span>{formatTimestamp(video.duration_seconds)}</span>
        </div>

        {/* Overflow Menu Trigger */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-0.5 rounded-sm text-txt-tertiary hover:text-txt-primary hover:bg-hover cursor-pointer"
            title="Actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 bg-float border border-border-default rounded-md shadow-float z-30 p-1 text-xs space-y-0.5"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-hover text-txt-primary flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/videos/${video.id}`);
                }}
              >
                <Play className="w-3.5 h-3.5 text-txt-tertiary" /> Open
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-hover text-txt-primary flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  router.push(`/search?video=${video.id}`);
                }}
              >
                <Search className="w-3.5 h-3.5 text-txt-tertiary" /> Search this video
              </button>
              <button
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-hover text-txt-primary flex items-center gap-2 cursor-pointer"
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
                className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-hover text-txt-primary flex items-center gap-2"
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
      </div>

      {/* Row 2: Thumbnail & Status */}
      <div className="flex items-center gap-3">
        <FrameThumb
          src={video.thumbnail_url}
          alt={video.original_filename}
          size="96x54"
        />
        <div className="min-w-0 flex-1">
          <StatusIndicator
            status={video.status}
            progressPercent={video.progress_percent}
            currentStep={video.current_step}
            showSubline
          />
        </div>
      </div>

      {/* Indexing Progress Line */}
      {isIndexing && (
        <div className="w-full h-1 bg-border-subtle rounded-xs overflow-hidden">
          <div
            className="h-full bg-processing transition-all duration-200"
            style={{ width: `${video.progress_percent || 10}%` }}
          />
        </div>
      )}

      {/* Footer Row: Relative Date & Search Action */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-txt-tertiary">
        <span>{formatDate(video.created_at)}</span>

        {isSearchable && (
          <Link
            href={`/search?video=${video.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-medium text-txt-primary hover:text-accent transition-colors"
          >
            <span>Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {isFailed && onRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry(video.id);
            }}
            className="inline-flex items-center gap-1 font-medium text-danger-text hover:underline"
          >
            <RotateCw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
