"use client";

import React from "react";
import { VideoItem } from "@/types";
import { formatTimestamp, formatDate } from "@/lib/format";
import { normalizeMediaUrl } from "@/lib/api";
import { Film, Check, Layers, Play, Video as VideoIcon } from "lucide-react";
import { clsx } from "clsx";

interface VideoScopeSelectorProps {
  videos: VideoItem[];
  selectedVideoId: string;
  onSelectVideo: (videoId: string) => void;
  className?: string;
}

export const VideoScopeSelector: React.FC<VideoScopeSelectorProps> = ({
  videos,
  selectedVideoId,
  onSelectVideo,
  className = "",
}) => {
  const readyVideos = videos.filter(
    (v) => v.status === "completed" || v.status === "processing"
  );

  return (
    <div className={clsx("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-txt-primary">
          <Film className="w-3.5 h-3.5 text-accent" />
          <span>Search Scope</span>
          <span className="text-[11px] text-txt-tertiary">
            ({readyVideos.length} ready {readyVideos.length === 1 ? "video" : "videos"})
          </span>
        </div>

        {selectedVideoId && (
          <button
            type="button"
            onClick={() => onSelectVideo("")}
            className="text-[11px] text-accent hover:underline font-medium cursor-pointer"
          >
            Switch to All Videos
          </button>
        )}
      </div>

      {/* Horizontal Scrollable Video Cards Strip */}
      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar select-none">
        {/* Option: Search All Videos */}
        <div
          onClick={() => onSelectVideo("")}
          className={clsx(
            "flex-shrink-0 w-44 sm:w-48 p-2.5 rounded-md border flex flex-col justify-between cursor-pointer transition-all duration-150",
            selectedVideoId === ""
              ? "bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40 text-stone-900 dark:text-amber-100 shadow-2xs"
              : "bg-surface border-border-default hover:border-border-strong hover:bg-surface-raised text-txt-secondary hover:text-txt-primary"
          )}
        >
          <div className="flex items-start justify-between gap-1 mb-2">
            <div className="w-8 h-8 rounded-sm bg-stone-900 text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            {selectedVideoId === "" && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold">
                <Check className="w-2.5 h-2.5 stroke-[3]" /> Active
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-xs text-txt-primary truncate">
              All Videos
            </div>
            <div className="text-[10px] text-txt-tertiary truncate">
              Entire footage library ({readyVideos.length})
            </div>
          </div>
        </div>

        {/* Video Cards for each indexed video */}
        {readyVideos.map((v) => {
          const isSelected = selectedVideoId === v.id;
          const thumbUrl = normalizeMediaUrl(v.thumbnail_url);

          return (
            <div
              key={v.id}
              onClick={() => onSelectVideo(v.id)}
              className={clsx(
                "flex-shrink-0 w-44 sm:w-48 p-2 rounded-md border flex flex-col justify-between cursor-pointer transition-all duration-150 group",
                isSelected
                  ? "bg-amber-500/10 border-amber-500/70 ring-1 ring-amber-500/40 shadow-2xs"
                  : "bg-surface border-border-default hover:border-border-strong hover:bg-surface-raised"
              )}
            >
              {/* Thumbnail Container */}
              <div className="relative w-full aspect-video rounded-xs overflow-hidden bg-stone-950 mb-2 border border-border-subtle group-hover:border-border-default transition-colors">
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={v.original_filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-600">
                    <VideoIcon className="w-6 h-6 stroke-1" />
                  </div>
                )}

                {/* Duration Badge */}
                {v.duration_seconds && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded-xs bg-black/80 text-white font-mono text-[9px] tabular-nums">
                    {formatTimestamp(v.duration_seconds)}
                  </span>
                )}

                {/* Selected Check Badge */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-sm">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="min-w-0">
                <div
                  className={clsx(
                    "font-medium text-xs truncate transition-colors",
                    isSelected ? "text-amber-900 dark:text-amber-200 font-semibold" : "text-txt-primary group-hover:text-txt-primary"
                  )}
                  title={v.original_filename}
                >
                  {v.original_filename}
                </div>
                <div className="flex items-center justify-between text-[10px] text-txt-tertiary mt-0.5">
                  <span>{formatDate(v.created_at)}</span>
                  <span className="capitalize">{v.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VideoScopeSelector;
