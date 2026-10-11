import React, { useState } from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Square,
  Tag,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Film,
  Keyboard,
} from "lucide-react";
import { clsx } from "clsx";
import { formatTimestamp } from "@/lib/format";

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onPrevMatch?: () => void;
  onNextMatch?: () => void;
  hasMatchesOrDetections?: boolean;
  showBoxes: boolean;
  onToggleBoxes: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  useAnnotatedStream?: boolean;
  onToggleAnnotatedMode?: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  onToggleFullscreen: () => void;
  onOpenShortcuts?: () => void;
  downloadVideoUrl?: string;
  downloadAnnotatedUrl?: string;
  downloadClipUrl?: string;
  className?: string;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onPrevMatch,
  onNextMatch,
  hasMatchesOrDetections = true,
  showBoxes,
  onToggleBoxes,
  showLabels,
  onToggleLabels,
  useAnnotatedStream,
  onToggleAnnotatedMode,
  playbackSpeed,
  onChangeSpeed,
  isMuted,
  onToggleMute,
  volume,
  onChangeVolume,
  onToggleFullscreen,
  onOpenShortcuts,
  downloadVideoUrl,
  downloadAnnotatedUrl,
  downloadClipUrl,
  className = "",
}) => {
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speeds = [0.5, 1.0, 1.5, 2.0];

  return (
    <div
      className={clsx(
        "h-[40px] bg-surface border-t border-border-subtle px-3 flex items-center justify-between text-xs select-none",
        className
      )}
    >
      {/* Left: Play/Pause & Time Readout */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="p-1 rounded-sm text-txt-primary hover:bg-surface-raised transition-colors"
          title={isPlaying ? "Pause (K / Space)" : "Play (K / Space)"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Player Time Readout */}
        <div className="font-mono text-xs text-txt-primary tabular-nums">
          {formatTimestamp(currentTime, true)}{" "}
          <span className="text-txt-tertiary">/</span> {formatTimestamp(duration)}
        </div>
      </div>

      {/* Center/Right: Matches Hop, Overlay Toggles, Speed, Volume, Shortcuts, Download, Fullscreen */}
      <div className="flex items-center gap-2">
        {/* Hop Matches / Detections ([ and ]) */}
        <div className="flex items-center border-r border-border-subtle pr-2 mr-1 gap-0.5">
          <button
            onClick={onPrevMatch}
            disabled={!onPrevMatch}
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised disabled:text-txt-disabled disabled:hover:bg-transparent"
            title="Previous match / detection ([)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNextMatch}
            disabled={!onNextMatch}
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised disabled:text-txt-disabled disabled:hover:bg-transparent"
            title="Next match / detection (])"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Overlay Toggles Group */}
        <div className="flex items-center gap-1 border-r border-border-subtle pr-2 mr-1">
          <button
            onClick={onToggleBoxes}
            aria-pressed={showBoxes}
            className={clsx(
              "h-7 px-2 rounded-sm flex items-center gap-1 transition-colors text-xs font-medium",
              showBoxes
                ? "bg-accent-subtle text-accent-text"
                : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
            )}
            title="Detection boxes (B)"
          >
            <Square className={clsx("w-3.5 h-3.5", showBoxes ? "text-accent" : "text-txt-tertiary")} />
            <span>Boxes</span>
          </button>

          <button
            onClick={onToggleLabels}
            disabled={!showBoxes}
            aria-pressed={showBoxes && showLabels}
            className={clsx(
              "h-7 px-2 rounded-sm flex items-center gap-1 transition-colors text-xs font-medium",
              !showBoxes
                ? "text-txt-disabled opacity-40 cursor-not-allowed select-none"
                : showLabels
                ? "bg-accent-subtle text-accent-text"
                : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
            )}
            title={showBoxes ? "Box labels (L)" : "Enable Boxes first (B) to access labels"}
          >
            <Tag className={clsx("w-3.5 h-3.5", showLabels && showBoxes ? "text-accent" : "text-txt-tertiary")} />
            <span>Labels</span>
          </button>

          {onToggleAnnotatedMode && (
            <button
              onClick={onToggleAnnotatedMode}
              aria-pressed={useAnnotatedStream}
              className={clsx(
                "h-7 px-2 rounded-sm flex items-center gap-1 transition-colors text-xs font-medium ml-1",
                useAnnotatedStream
                  ? "bg-accent text-accent-fg shadow-sm font-semibold"
                  : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
              )}
              title="Toggle burned-in annotated video stream"
            >
              <Film className={clsx("w-3.5 h-3.5", useAnnotatedStream ? "text-accent-fg" : "text-txt-tertiary")} />
              <span>{useAnnotatedStream ? "Burned-in (ON)" : "Burned-in Video"}</span>
            </button>
          )}
        </div>

        {/* Speed Selector */}
        <div className="relative">
          <button
            onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
            className="h-7 px-2 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised font-mono"
            title="Playback speed"
          >
            {playbackSpeed}×
          </button>

          {speedMenuOpen && (
            <div
              className="absolute bottom-full mb-1 right-0 bg-surface-raised border border-border-default rounded-md shadow-float p-1 text-xs space-y-0.5 z-30"
              onMouseLeave={() => setSpeedMenuOpen(false)}
            >
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onChangeSpeed(s);
                    setSpeedMenuOpen(false);
                  }}
                  className={clsx(
                    "w-full text-left px-2 py-1 rounded-sm font-mono",
                    playbackSpeed === s ? "bg-accent-subtle text-accent-text" : "text-txt-primary hover:bg-surface"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMute}
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
            title="Mute/Unmute (M)"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-txt-tertiary" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-border-default rounded-full accent-accent cursor-pointer"
          />
        </div>

        {/* Keyboard Shortcuts Help Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {/* Video & Subclip Downloads */}
        {downloadVideoUrl && (
          <a
            href={downloadVideoUrl}
            download
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
            title="Download original video"
          >
            <Download className="w-4 h-4" />
          </a>
        )}

        {downloadAnnotatedUrl && (
          <a
            href={downloadAnnotatedUrl}
            download
            className="p-1 rounded-sm text-accent hover:bg-accent-subtle"
            title="Download video with bounding boxes & confidence scores"
          >
            <Square className="w-4 h-4 text-accent" />
          </a>
        )}

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised ml-1"
          title="Fullscreen (F)"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;
