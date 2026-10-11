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
  const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];

  return (
    <div
      className={clsx(
        "h-[40px] bg-surface border-t border-border-subtle px-3 flex items-center justify-between text-xs select-none",
        className
      )}
    >
      {/* Left: Play/Pause, -5s, +5s, Time Readout */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={onTogglePlay}
          className="p-1 rounded-sm text-stone-900 hover:bg-stone-100 transition-colors"
          title={isPlaying ? "Pause (K / Space)" : "Play (K / Space)"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {onSeekRelative && (
          <div className="flex items-center gap-0.5 text-stone-600">
            <button
              onClick={() => onSeekRelative(-5)}
              className="p-1 rounded-sm hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Jump back 5s (← / J)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSeekRelative(5)}
              className="p-1 rounded-sm hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Jump forward 5s (→ / L)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Player Time Readout */}
        <div className="font-mono text-xs text-stone-900 tabular-nums">
          {formatTimestamp(currentTime, true)}{" "}
          <span className="text-stone-400">/</span> {formatTimestamp(duration)}
        </div>
      </div>

      {/* Center/Right: Matches Hop, Overlay Toggles, Speed, Volume, Shortcuts, Download, Fullscreen */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Hop Matches / Detections ([ and ]) */}
        <div className="flex items-center border-r border-border-default pr-1.5 mr-0.5 gap-0.5">
          <button
            onClick={onPrevMatch}
            disabled={!onPrevMatch}
            className="p-1 rounded-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:text-stone-300 disabled:hover:bg-transparent"
            title="Previous match / detection ([)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNextMatch}
            disabled={!onNextMatch}
            className="p-1 rounded-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:text-stone-300 disabled:hover:bg-transparent"
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
                ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-2xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-transparent"
            )}
            title="Toggle detection boxes (B)"
          >
            <Square className={clsx("w-3.5 h-3.5", showBoxes ? "text-amber-700 stroke-[2.2]" : "text-stone-400")} />
            <span className="hidden sm:inline">Boxes</span>
          </button>

          <button
            onClick={onToggleLabels}
            aria-pressed={showLabels}
            className={clsx(
              "h-7 px-2 rounded-sm flex items-center gap-1 transition-all text-xs font-medium cursor-pointer",
              showLabels
                ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-2xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-transparent"
            )}
            title="Toggle box labels (L)"
          >
            <Tag className={clsx("w-3.5 h-3.5", showLabels ? "text-amber-700 stroke-[2.2]" : "text-stone-400")} />
            <span className="hidden sm:inline">Labels</span>
          </button>
        </div>

        {/* Speed Selector */}
        <div className="relative">
          <button
            onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
            className="h-7 px-1.5 rounded-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-mono text-[11px]"
            title="Playback speed"
          >
            {playbackSpeed}×
          </button>

          {speedMenuOpen && (
            <div
              className="absolute bottom-full mb-1 right-0 bg-white border border-stone-200 rounded-md shadow-float p-1 text-xs space-y-0.5 z-30"
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
                    playbackSpeed === s ? "bg-amber-100 text-amber-900 font-semibold" : "text-stone-800 hover:bg-stone-100"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Volume & Mute */}
        <div className="flex items-center gap-1 border-r border-border-default pr-1.5 mr-0.5">
          <button
            onClick={onToggleMute}
            className={clsx(
              "p-1 rounded-sm transition-colors",
              isMuted ? "text-amber-700 bg-amber-50" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            )}
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-amber-700" />
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
            className="w-12 sm:w-16 h-1 bg-stone-200 rounded-full accent-amber-600 cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>

        {/* Extra Video Tools (Loop, Snapshot, PiP) */}
        <div className="flex items-center gap-0.5">
          {onToggleLoop && (
            <button
              onClick={onToggleLoop}
              className={clsx(
                "p-1 rounded-sm transition-colors",
                isLooping ? "text-amber-700 bg-amber-100/70" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              )}
              title={isLooping ? "Loop playback is ON" : "Turn on loop playback"}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          )}

          {onCaptureSnapshot && (
            <button
              onClick={onCaptureSnapshot}
              className="p-1 rounded-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Capture Frame Snapshot (Download instant JPEG)"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {onTogglePiP && (
            <button
              onClick={onTogglePiP}
              className="p-1 rounded-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Picture in Picture (PiP)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
          )}

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-1 rounded-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggleFullscreen}
            className="p-1 rounded-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 ml-0.5"
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
