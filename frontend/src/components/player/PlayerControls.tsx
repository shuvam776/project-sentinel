import React, { useState } from "react";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Square,
  Tag,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Download,
  Keyboard,
  RotateCcw,
  RotateCw,
  Repeat,
  Camera,
  PictureInPicture2,
  Minus,
  Plus,
  Check,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";
import { formatTimestamp } from "@/lib/format";

interface PlayerControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeekRelative?: (deltaSeconds: number) => void;
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
  isLooping?: boolean;
  onToggleLoop?: () => void;
  onCaptureSnapshot?: () => void;
  onTogglePiP?: () => void;
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
  onSeekRelative,
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
  isLooping = false,
  onToggleLoop,
  onCaptureSnapshot,
  onTogglePiP,
  onToggleFullscreen,
  onOpenShortcuts,
  downloadVideoUrl,
  downloadAnnotatedUrl,
  downloadClipUrl,
  className = "",
}) => {
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const handleDecreaseSpeed = () => {
    const curIdx = speeds.findIndex((s) => Math.abs(s - playbackSpeed) < 0.01);
    if (curIdx > 0) {
      onChangeSpeed(speeds[curIdx - 1]);
    } else {
      const next = Math.max(0.25, Math.round((playbackSpeed - 0.25) * 100) / 100);
      onChangeSpeed(next);
    }
  };

  const handleIncreaseSpeed = () => {
    const curIdx = speeds.findIndex((s) => Math.abs(s - playbackSpeed) < 0.01);
    if (curIdx !== -1 && curIdx < speeds.length - 1) {
      onChangeSpeed(speeds[curIdx + 1]);
    } else {
      const next = Math.min(2.0, Math.round((playbackSpeed + 0.25) * 100) / 100);
      onChangeSpeed(next);
    }
  };

  return (
    <div
      className={clsx(
        "h-[40px] bg-surface border-t border-border-subtle px-3 flex items-center justify-between text-xs select-none transition-colors",
        className
      )}
    >
      {/* Left: Play/Pause, -5s, +5s, Time Readout */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={onTogglePlay}
          className="p-1 rounded-sm text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
          title={isPlaying ? "Pause (K / Space)" : "Play (K / Space)"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {onSeekRelative && (
          <div className="flex items-center gap-0.5 text-txt-secondary">
            <button
              onClick={() => onSeekRelative(-5)}
              className="p-1 rounded-sm hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
              title="Jump back 5s (← / J)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSeekRelative(5)}
              className="p-1 rounded-sm hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
              title="Jump forward 5s (→ / L)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Player Time Readout */}
        <div className="font-mono text-xs text-txt-primary tabular-nums">
          {formatTimestamp(currentTime, true)}{" "}
          <span className="text-txt-tertiary">/</span> {formatTimestamp(duration)}
        </div>
      </div>

      {/* Center/Right: Matches Hop, Overlay Toggles, Speed, Volume, Shortcuts, Download, Fullscreen */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Hop Matches / Detections ([ and ]) */}
        <div className="flex items-center border-r border-border-default pr-1.5 mr-0.5 gap-0.5">
          <button
            onClick={onPrevMatch}
            disabled={!onPrevMatch}
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised disabled:text-txt-disabled disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Previous match / detection ([)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNextMatch}
            disabled={!onNextMatch}
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised disabled:text-txt-disabled disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Next match / detection (])"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Overlay Toggles Group */}
        <div className="flex items-center gap-1 border-r border-border-default pr-1.5 mr-0.5">
          <button
            onClick={onToggleBoxes}
            aria-pressed={showBoxes}
            className={clsx(
              "h-7 px-2 rounded-sm flex items-center gap-1 transition-all text-xs font-medium cursor-pointer",
              showBoxes
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-semibold shadow-2xs"
                : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised border border-transparent"
            )}
            title="Toggle detection boxes (B)"
          >
            <Square className={clsx("w-3.5 h-3.5", showBoxes ? "text-amber-600 dark:text-amber-400 stroke-[2.2]" : "text-txt-tertiary")} />
            <span className="hidden sm:inline">Boxes</span>
          </button>

          <button
            onClick={onToggleLabels}
            aria-pressed={showLabels}
            className={clsx(
              "h-7 px-2 rounded-sm flex items-center gap-1 transition-all text-xs font-medium cursor-pointer",
              showLabels
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 font-semibold shadow-2xs"
                : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised border border-transparent"
            )}
            title="Toggle box labels (L)"
          >
            <Tag className={clsx("w-3.5 h-3.5", showLabels ? "text-amber-600 dark:text-amber-400 stroke-[2.2]" : "text-txt-tertiary")} />
            <span className="hidden sm:inline">Labels</span>
          </button>

          {onToggleAnnotatedMode && (
            <button
              onClick={onToggleAnnotatedMode}
              aria-pressed={useAnnotatedStream}
              className={clsx(
                "h-7 px-2 rounded-sm flex items-center gap-1 transition-all text-xs font-medium cursor-pointer",
                useAnnotatedStream
                  ? "bg-amber-500 text-stone-950 font-semibold shadow-xs"
                  : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised border border-transparent"
              )}
              title="Toggle burned-in annotated video stream (exact same video as download)"
            >
              <Sparkles className={clsx("w-3.5 h-3.5", useAnnotatedStream ? "text-stone-950 stroke-[2.2]" : "text-txt-tertiary")} />
              <span className="hidden sm:inline">Burned-in</span>
            </button>
          )}
        </div>

        {/* YouTube-style Playback Speed Controller (Decreaser [-], Value, Increaser [+]) */}
        <div className="flex items-center gap-0.5 border-r border-border-default pr-1.5 mr-0.5">
          <button
            type="button"
            onClick={handleDecreaseSpeed}
            disabled={playbackSpeed <= 0.25}
            className="w-5 h-6 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised flex items-center justify-center font-bold text-xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Decrease playback speed (<)"
          >
            <Minus className="w-3 h-3" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
              className="h-6 px-1.5 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised font-mono text-[11px] font-medium cursor-pointer transition-colors"
              title="Playback speed menu"
            >
              {playbackSpeed === 1.0 ? "1×" : `${playbackSpeed}×`}
            </button>

            {speedMenuOpen && (
              <div
                className="absolute bottom-full mb-1 right-0 bg-surface border border-border-default rounded-md shadow-float p-1 text-xs space-y-0.5 z-30 min-w-[105px]"
                onMouseLeave={() => setSpeedMenuOpen(false)}
              >
                <div className="px-2 py-0.5 text-[10px] font-semibold text-txt-tertiary uppercase tracking-wider border-b border-border-subtle mb-0.5">
                  Speed
                </div>
                {speeds.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onChangeSpeed(s);
                      setSpeedMenuOpen(false);
                    }}
                    className={clsx(
                      "w-full text-left px-2 py-1 rounded-sm font-mono cursor-pointer transition-colors flex items-center justify-between text-[11px]",
                      playbackSpeed === s
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold"
                        : "text-txt-primary hover:bg-surface-raised"
                    )}
                  >
                    <span>{s === 1.0 ? "1.0× Normal" : `${s}×`}</span>
                    {playbackSpeed === s && <Check className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleIncreaseSpeed}
            disabled={playbackSpeed >= 2.0}
            className="w-5 h-6 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised flex items-center justify-center font-bold text-xs disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Increase playback speed (>)"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Volume & Mute */}
        <div className="flex items-center gap-1 border-r border-border-default pr-1.5 mr-0.5">
          <button
            onClick={onToggleMute}
            className={clsx(
              "p-1 rounded-sm transition-colors cursor-pointer",
              isMuted ? "text-amber-600 bg-amber-500/10" : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
            )}
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-amber-600" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
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
            className="w-12 sm:w-16 h-1 bg-border-default rounded-full accent-amber-600 cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>

        {/* Extra Video Tools (Loop, Snapshot, PiP) */}
        <div className="flex items-center gap-0.5">
          {onToggleLoop && (
            <button
              onClick={onToggleLoop}
              className={clsx(
                "p-1 rounded-sm transition-colors cursor-pointer",
                isLooping ? "text-amber-600 bg-amber-500/10" : "text-txt-secondary hover:text-txt-primary hover:bg-surface-raised"
              )}
              title={isLooping ? "Loop playback is ON" : "Turn on loop playback"}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          )}

          {onCaptureSnapshot && (
            <button
              onClick={onCaptureSnapshot}
              className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
              title="Capture Frame Snapshot (Download instant JPEG)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {onTogglePiP && (
            <button
              onClick={onTogglePiP}
              className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
              title="Picture in Picture (PiP)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised transition-colors cursor-pointer"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggleFullscreen}
            className="p-1 rounded-sm text-txt-secondary hover:text-txt-primary hover:bg-surface-raised ml-0.5 transition-colors cursor-pointer"
            title="Fullscreen (F)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
