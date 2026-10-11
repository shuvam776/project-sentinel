import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Search, Trash2, RotateCw, Download, Play, Pencil, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { VideoItem } from "@/types";
import FrameThumb from "@/components/data/FrameThumb";
import StatusIndicator from "@/components/ui/StatusIndicator";
import Button from "@/components/ui/Button";
import { formatTimestamp, formatFileSize, formatDate } from "@/lib/format";
import { updateVideoName } from "@/lib/api";

interface VideoRowProps {
  video: VideoItem;
  onDelete: (id: string) => Promise<void>;
  onRetry?: (id: string) => Promise<void>;
  onRename?: (id: string, newName: string) => Promise<void>;
}

export const VideoRow: React.FC<VideoRowProps> = ({ video, onDelete, onRetry, onRename }) => {
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

  const handleRowClick = () => {
    if (video.status === "queued" || isDeleteConfirm) return;
    router.push(`/videos/${video.id}`);
  };

  // Render Inline Delete Confirmation Row per design.md §8A
  if (isDeleteConfirm) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-danger-subtle border-l-2 border-danger border-b border-border-subtle text-xs transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <Trash2 className="w-4 h-4 text-danger flex-shrink-0" />
          <div>
            <div className="font-semibold text-txt-primary">Delete “{video.original_filename}”?</div>
            <div className="text-[11px] text-txt-secondary">
              Removes the video, its thumbnails, and all indexed search data. This cannot be undone.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
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

  const isPlayable = video.status === "completed" || video.status === "processing" || video.status === "failed";
  const downloadUrl = video.download_url || `http://127.0.0.1:8000/api/v1/videos/${video.id}/download`;

  return (
    <tr
      onClick={handleRowClick}
      className={clsx(
        "group border-b border-border-subtle hover:bg-surface-raised transition-colors duration-fast cursor-pointer select-none text-xs",
        video.status === "queued" && "cursor-not-allowed opacity-75"
      )}
    >
      {/* Thumbnail */}
      <td className="py-2 px-3 w-[108px]">
        <FrameThumb
          src={video.thumbnail_url}
          alt={video.original_filename}
          size="96x54"
          timestampSec={video.duration_seconds || undefined}
        />
      </td>

      {/* Name & Sub-details */}
      <td className="py-2 px-3 min-w-[200px]" onClick={(e) => isEditingName && e.stopPropagation()}>
        {isEditingName ? (
          <div className="flex items-center gap-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
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
              className="px-2 py-0.5 bg-surface border border-accent rounded-sm text-xs text-txt-primary focus:outline-none w-full max-w-[280px]"
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
          <div className="flex items-center gap-1.5 group/name">
            <div
              className="font-medium text-txt-primary truncate max-w-[300px] group-hover:text-accent transition-colors"
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
              className="opacity-0 group-hover/name:opacity-100 p-1 text-txt-tertiary hover:text-txt-primary rounded-sm transition-opacity cursor-pointer"
              title="Rename video"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="text-[11px] font-mono text-txt-tertiary">
          {video.width && video.height ? `${video.width}×${video.height}` : "—"}
          {video.fps ? ` · ${Math.round(video.fps)} fps` : ""}
        </div>
      </td>

      {/* Status */}
      <td className="py-2 px-3 w-[200px]">
        <StatusIndicator
          status={video.status}
          progressPercent={video.progress_percent}
          currentStep={video.current_step}
          showSubline
        />
      </td>

      {/* Duration */}
      <td className="py-2 px-3 w-[88px] text-right font-mono text-txt-primary">
        {formatTimestamp(video.duration_seconds)}
      </td>

      {/* Size */}
      <td className="py-2 px-3 w-[90px] text-right font-mono text-txt-secondary hidden xl:table-cell">
        {formatFileSize(video.file_size_bytes)}
      </td>

      {/* Uploaded Date */}
      <td className="py-2 px-3 w-[120px] text-right text-txt-secondary hidden lg:table-cell">
        {formatDate(video.created_at)}
      </td>

      {/* Actions */}
      <td className="py-2 px-3 w-[90px] text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {isPlayable && (
            <Link
              href={`/search?video=${video.id}`}
              title="Search this video"
              className="p-1.5 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </Link>
          )}

          <a
            href={downloadUrl}
            download={video.original_filename}
            title="Download video"
            className="p-1.5 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          {/* Action Overflow Menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface transition-colors"
              title="Actions menu"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-44 bg-surface-raised border border-border-default rounded-md shadow-float z-30 p-1 text-xs space-y-0.5"
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
                {video.status === "failed" && onRetry && (
                  <button
                    className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-hover text-txt-primary flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setMenuOpen(false);
                      onRetry(video.id);
                    }}
                  >
                    <RotateCw className="w-3.5 h-3.5 text-txt-tertiary" /> Retry indexing
                  </button>
                )}
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
      </td>
    </tr>
  );
};

export default VideoRow;
