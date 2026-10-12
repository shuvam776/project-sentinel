import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Search, Trash2, RotateCw, Download, Play, Pencil, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { VideoItem } from "@/types";
import FrameThumb from "@/components/data/FrameThumb";
import StatusIndicator from "@/components/ui/StatusIndicator";
import Button from "@/components/ui/Button";
import { formatTimestamp, formatFileSize, formatDate } from "@/lib/format";
import { updateVideoName, getVideoDownloadUrl } from "@/lib/api";

interface VideoRowProps {
  video: VideoItem;
  isLastRow?: boolean;
  onDelete: (id: string) => Promise<void>;
  onRetry?: (id: string) => Promise<void>;
  onRename?: (id: string, newName: string) => Promise<void>;
}

export const VideoRow: React.FC<VideoRowProps> = ({ video, isLastRow = false, onDelete, onRetry, onRename }) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
    openUpwards: boolean;
  } | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(video.original_filename);
  const [isSavingName, setIsSavingName] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = isLastRow || (spaceBelow < menuHeight && spaceAbove > 150);

    if (openUp) {
      setMenuCoords({
        bottom: window.innerHeight - rect.top + 6,
        right: Math.max(8, window.innerWidth - rect.right),
        openUpwards: true,
      });
    } else {
      setMenuCoords({
        top: rect.bottom + 6,
        right: Math.max(8, window.innerWidth - rect.right),
        openUpwards: false,
      });
    }
  }, [isLastRow]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen) {
      updateMenuPosition();
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const handleScrollOrResize = () => {
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [menuOpen]);

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
  const downloadUrl = video.download_url || getVideoDownloadUrl(video.id);

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
              ref={buttonRef}
              onClick={toggleMenu}
              className={clsx(
                "p-1.5 rounded-sm transition-colors",
                menuOpen
                  ? "bg-stone-100 dark:bg-stone-800 text-txt-primary"
                  : "text-txt-secondary hover:text-txt-primary hover:bg-surface"
              )}
              title="More options"
              aria-label="More options"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {mounted && menuOpen && menuCoords && typeof document !== "undefined" && createPortal(
              <div
                ref={menuRef}
                style={{
                  position: "fixed",
                  top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                  bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                  right: `${menuCoords.right}px`,
                  zIndex: 99999,
                }}
                className="w-48 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-md shadow-xl p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100 text-left select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-stone-100/80 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`/videos/${video.id}`);
                  }}
                >
                  <Play className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>Open in player</span>
                </button>

                {isPlayable && (
                  <button
                    className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-stone-100/80 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center gap-2 cursor-pointer transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(`/search?video=${video.id}`);
                    }}
                  >
                    <Search className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                    <span>Search this video</span>
                  </button>
                )}

                <a
                  href={downloadUrl}
                  download={video.original_filename}
                  className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-stone-100/80 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Download className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>Download video</span>
                </a>

                <button
                  className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-stone-100/80 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    setNameInput(video.original_filename);
                    setIsEditingName(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>Rename...</span>
                </button>

                {video.status === "failed" && onRetry && (
                  <button
                    className="w-full text-left px-2.5 py-1.5 rounded-sm bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-medium border border-amber-200/60 flex items-center gap-2 cursor-pointer transition-colors"
                    onClick={() => {
                      setMenuOpen(false);
                      onRetry(video.id);
                    }}
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Retry indexing</span>
                  </button>
                )}

                <div className="h-[1px] bg-stone-100 dark:bg-stone-800 my-1" />

                <button
                  className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-rose-50 text-rose-700 font-medium flex items-center gap-2 cursor-pointer transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Delete video...</span>
                </button>
              </div>,
              document.body
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

export default VideoRow;
